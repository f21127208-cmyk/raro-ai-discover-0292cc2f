import { useEffect, useRef, useState } from "react";
import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport, type UIMessage } from "ai";
import { useNavigate } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { createThread, renameThread } from "@/lib/threads.functions";
import { supabase } from "@/integrations/supabase/client";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import {
  Conversation,
  ConversationContent,
  ConversationScrollButton,
} from "@/components/ai-elements/conversation";
import { Message, MessageContent } from "@/components/ai-elements/message";
import {
  PromptInput,
  PromptInputTextarea,
  PromptInputFooter,
  PromptInputSubmit,
} from "@/components/ai-elements/prompt-input";
import { Shimmer } from "@/components/ai-elements/shimmer";
import { Button } from "@/components/ui/button";
import logo from "@/assets/raro-logo.png";
import { toast } from "sonner";
import { Mic, Paperclip, Download, X, Square, ShieldAlert, Info, Volume2, Loader2, Music2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

const SUGGESTIONS = [
  "Encontre histórias raras para vídeos de IA",
  "Quais arquivos públicos pouco conhecidos posso explorar?",
  "Liste projetos open source de IA generativa obscuros",
  "Sites e fóruns raros sobre mistérios não resolvidos",
];

type AnyPart = {
  type: string;
  text?: string;
  url?: string;
  mediaType?: string;
  filename?: string;
};

function messageText(m: UIMessage) {
  return m.parts
    .map((p) => ((p as AnyPart).type === "text" ? (p as AnyPart).text ?? "" : ""))
    .join("");
}

function messageImages(m: UIMessage): { url: string; name?: string }[] {
  return m.parts
    .filter((p) => {
      const ap = p as AnyPart;
      return ap.type === "file" && ap.url && (ap.mediaType ?? "").startsWith("image/");
    })
    .map((p) => ({ url: (p as AnyPart).url!, name: (p as AnyPart).filename }));
}

export function ChatWindow({
  threadId,
  initialMessages,
}: {
  threadId: string | null;
  initialMessages: UIMessage[];
}) {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const createFn = useServerFn(createThread);
  const renameFn = useServerFn(renameThread);

  const [input, setInput] = useState("");
  const [pendingFiles, setPendingFiles] = useState<File[]>([]);
  const [previews, setPreviews] = useState<string[]>([]);
  const [recording, setRecording] = useState(false);
  const [transcribing, setTranscribing] = useState(false);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [noticeOpen, setNoticeOpen] = useState(false);
  const [noticeDismissed, setNoticeDismissed] = useState(true);
  const [speakingId, setSpeakingId] = useState<string | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const audioUrlRef = useRef<string | null>(null);
  const ttsAbortRef = useRef<AbortController | null>(null);
  const ttsReqIdRef = useRef(0);
  const [generatingMusic, setGeneratingMusic] = useState(false);
  const [musicUrl, setMusicUrl] = useState<string | null>(null);
  const [musicPrompt, setMusicPrompt] = useState<string>("");

  const generateMusic = async () => {
    const prompt = input.trim();
    if (!prompt) {
      toast.error("Descreva a música no campo de texto (ex: 'música sombria de piano').");
      return;
    }
    if (generatingMusic) return;
    setGeneratingMusic(true);
    try {
      const res = await fetch("/api/music", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt, durationSeconds: 30 }),
      });
      if (!res.ok) throw new Error((await res.text()) || "Falha ao gerar música");
      const blob = await res.blob();
      if (musicUrl) URL.revokeObjectURL(musicUrl);
      setMusicUrl(URL.createObjectURL(blob));
      setMusicPrompt(prompt);
      toast.success("Música pronta! Toque abaixo.");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erro ao gerar música");
    } finally {
      setGeneratingMusic(false);
    }
  };

  useEffect(() => () => {
    if (musicUrl) URL.revokeObjectURL(musicUrl);
  }, [musicUrl]);

  const stopCurrentAudio = () => {
    ttsAbortRef.current?.abort();
    ttsAbortRef.current = null;
    if (audioRef.current) {
      audioRef.current.onended = null;
      audioRef.current.onerror = null;
      audioRef.current.pause();
      audioRef.current.src = "";
      audioRef.current = null;
    }
    if (audioUrlRef.current) {
      URL.revokeObjectURL(audioUrlRef.current);
      audioUrlRef.current = null;
    }
  };

  const speak = async (id: string, text: string) => {
    const clean = text.trim();
    if (!clean) return;
    // Toggle off if already speaking this message
    if (speakingId === id) {
      stopCurrentAudio();
      setSpeakingId(null);
      return;
    }
    // Cancel any in-flight or playing audio
    stopCurrentAudio();
    const reqId = ++ttsReqIdRef.current;
    const ctrl = new AbortController();
    ttsAbortRef.current = ctrl;
    setSpeakingId(id);
    try {
      const res = await fetch("/api/tts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: clean }),
        signal: ctrl.signal,
      });
      if (reqId !== ttsReqIdRef.current) return;
      if (!res.ok) throw new Error(await res.text().catch(() => "Falha ao gerar voz"));
      const blob = await res.blob();
      if (reqId !== ttsReqIdRef.current) return;
      const url = URL.createObjectURL(blob);
      const audio = new Audio(url);
      audioRef.current = audio;
      audioUrlRef.current = url;
      audio.onended = () => {
        if (audioRef.current === audio) {
          URL.revokeObjectURL(url);
          audioRef.current = null;
          audioUrlRef.current = null;
          setSpeakingId((cur) => (cur === id ? null : cur));
        }
      };
      audio.onerror = () => {
        if (audioRef.current === audio) {
          URL.revokeObjectURL(url);
          audioRef.current = null;
          audioUrlRef.current = null;
          setSpeakingId((cur) => (cur === id ? null : cur));
          toast.error("Erro ao reproduzir áudio");
        }
      };
      await audio.play();
    } catch (e) {
      if ((e as { name?: string })?.name === "AbortError") return;
      if (reqId !== ttsReqIdRef.current) return;
      toast.error(e instanceof Error ? e.message : "Erro ao gerar voz");
      setSpeakingId((cur) => (cur === id ? null : cur));
    }
  };

  useEffect(() => () => stopCurrentAudio(), []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    setNoticeDismissed(localStorage.getItem("raro-notice-dismissed") === "1");
  }, []);

  const dismissNotice = () => {
    localStorage.setItem("raro-notice-dismissed", "1");
    setNoticeDismissed(true);
  };

  const [currentThreadId, setCurrentThreadId] = useState<string | null>(threadId);
  const pendingTitleRef = useRef<string | null>(null);

  useEffect(() => {
    setCurrentThreadId(threadId);
  }, [threadId]);

  // Build previews when files change
  useEffect(() => {
    const urls = pendingFiles.map((f) => URL.createObjectURL(f));
    setPreviews(urls);
    return () => urls.forEach((u) => URL.revokeObjectURL(u));
  }, [pendingFiles]);

  const { messages, sendMessage, status, error } = useChat({
    id: currentThreadId ?? "new",
    messages: initialMessages,
    transport: new DefaultChatTransport({
      api: "/api/chat",
      prepareSendMessagesRequest: async ({ messages, body }) => {
        const { data: { session } } = await supabase.auth.getSession();
        return {
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${session?.access_token ?? ""}`,
          },
          body: {
            messages,
            threadId: (body as { threadId?: string } | undefined)?.threadId ?? currentThreadId,
          },
        };
      },
    }),
    onError: (e) => toast.error(e.message),
  });

  const isLoading = status === "submitted" || status === "streaming";

  useEffect(() => {
    if (status !== "ready") return;
    if (!currentThreadId) return;
    if (!pendingTitleRef.current) return;
    const title = pendingTitleRef.current.slice(0, 80);
    pendingTitleRef.current = null;
    renameFn({ data: { id: currentThreadId, title } })
      .then(() => qc.invalidateQueries({ queryKey: ["threads"] }))
      .catch(() => {});
  }, [status, currentThreadId, renameFn, qc]);

  const handleSubmit = async () => {
    const text = input.trim();
    if ((!text && pendingFiles.length === 0) || isLoading) return;

    let tid = currentThreadId;
    if (!tid) {
      try {
        const t = await createFn({ data: { title: (text || "Nova conversa").slice(0, 80) } });
        tid = t.id;
        setCurrentThreadId(t.id);
        qc.invalidateQueries({ queryKey: ["threads"] });
        navigate({ to: "/chat/$threadId", params: { threadId: t.id }, replace: true });
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Falha ao criar conversa");
        return;
      }
    } else if (messages.length === 0) {
      pendingTitleRef.current = text || "Imagem enviada";
    }

    // Build FileList from pending files for sendMessage
    let filesPayload: FileList | undefined;
    if (pendingFiles.length > 0) {
      const dt = new DataTransfer();
      pendingFiles.forEach((f) => dt.items.add(f));
      filesPayload = dt.files;
    }

    setInput("");
    setPendingFiles([]);
    sendMessage({ text: text || "Analise a imagem.", files: filesPayload }, { body: { threadId: tid } });
  };

  // ---- Microphone ----
  const startRecording = async () => {
    if (recording || transcribing) return;
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mimeType = ["audio/webm", "audio/mp4"].find((t) =>
        MediaRecorder.isTypeSupported(t),
      );
      if (!mimeType) {
        stream.getTracks().forEach((t) => t.stop());
        toast.error("Seu navegador não suporta gravação de áudio.");
        return;
      }
      const rec = new MediaRecorder(stream, { mimeType });
      chunksRef.current = [];
      rec.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };
      rec.onstop = async () => {
        stream.getTracks().forEach((t) => t.stop());
        const blob = new Blob(chunksRef.current, { type: rec.mimeType });
        if (blob.size < 1024) {
          toast.error("Gravação muito curta. Tente novamente.");
          return;
        }
        await transcribe(blob);
      };
      recorderRef.current = rec;
      rec.start();
      setRecording(true);
    } catch {
      toast.error("Não foi possível acessar o microfone.");
    }
  };

  const stopRecording = () => {
    if (!recording) return;
    recorderRef.current?.stop();
    setRecording(false);
  };

  const transcribe = async (blob: Blob) => {
    setTranscribing(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const form = new FormData();
      const ext = blob.type.includes("mp4") ? "mp4" : "webm";
      form.append("file", blob, `recording.${ext}`);
      const res = await fetch("/api/transcribe", {
        method: "POST",
        headers: { Authorization: `Bearer ${session?.access_token ?? ""}` },
        body: form,
      });
      if (!res.ok) {
        const t = await res.text();
        throw new Error(t || "Falha ao transcrever");
      }
      const { text } = (await res.json()) as { text: string };
      if (!text.trim()) {
        toast.error("Não entendi o áudio. Fale mais alto.");
        return;
      }
      setInput((prev) => (prev ? `${prev} ${text}` : text));
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erro na transcrição");
    } finally {
      setTranscribing(false);
    }
  };

  // ---- Files ----
  const onPickFiles = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []);
    const images = files.filter((f) => f.type.startsWith("image/"));
    if (images.length !== files.length) {
      toast.error("Apenas imagens são aceitas por enquanto.");
    }
    setPendingFiles((prev) => [...prev, ...images]);
    e.target.value = "";
  };

  const removePending = (idx: number) => {
    setPendingFiles((prev) => prev.filter((_, i) => i !== idx));
  };

  // ---- Save conversation ----
  const saveConversation = () => {
    if (messages.length === 0) {
      toast.error("Nada para salvar ainda.");
      return;
    }
    const lines: string[] = ["# Conversa Raro AI", ""];
    for (const m of messages) {
      const who = m.role === "user" ? "Você" : "Raro AI";
      const text = messageText(m).trim();
      const imgs = messageImages(m);
      lines.push(`## ${who}`, "");
      if (imgs.length) lines.push(...imgs.map((i) => `![imagem](${i.url})`), "");
      if (text) lines.push(text, "");
    }
    const blob = new Blob([lines.join("\n")], { type: "text/markdown" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `raro-ai-${new Date().toISOString().slice(0, 19).replace(/[:T]/g, "-")}.md`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
    toast.success("Conversa salva!");
  };

  const isEmpty = messages.length === 0;

  return (
    <div className="flex flex-col h-full">
      {/* Top bar */}
      <div className="flex items-center justify-end gap-2 px-4 py-2 border-b border-border/50 bg-background/60 backdrop-blur">
        <Dialog open={noticeOpen} onOpenChange={setNoticeOpen}>
          <DialogTrigger asChild>
            <Button variant="ghost" size="sm" className="gap-2 text-muted-foreground hover:text-foreground">
              <Info className="size-4" />
              Aviso legal
            </Button>
          </DialogTrigger>
          <LegalNoticeDialog />
        </Dialog>
        <Button
          variant="outline"
          size="sm"
          onClick={saveConversation}
          disabled={isEmpty}
          className="gap-2"
        >
          <Download className="size-4" />
          Salvar conversa
        </Button>
      </div>

      {!noticeDismissed && (
        <div className="border-b border-amber-500/30 bg-amber-500/10 px-4 py-2.5">
          <div className="max-w-3xl mx-auto w-full flex items-start gap-3 text-xs">
            <ShieldAlert className="size-4 text-amber-400 shrink-0 mt-0.5" />
            <p className="text-amber-100/90 leading-relaxed flex-1">
              A <strong>Raro AI</strong> é uma ferramenta de pesquisa de conteúdos públicos raros.
              Não promovemos pirataria, downloads ilegais ou acesso não autorizado.
              Respeite as leis locais, os direitos autorais e os termos das fontes consultadas.{" "}
              <button
                type="button"
                onClick={() => setNoticeOpen(true)}
                className="underline underline-offset-2 hover:text-amber-200"
              >
                Ler aviso completo
              </button>
            </p>
            <button
              type="button"
              onClick={dismissNotice}
              className="text-amber-200/70 hover:text-amber-100 shrink-0"
              aria-label="Fechar aviso"
            >
              <X className="size-4" />
            </button>
          </div>
        </div>
      )}

      <Conversation className="flex-1 min-h-0">
        <ConversationContent className="max-w-3xl mx-auto w-full px-4">
          {isEmpty ? (
            <EmptyState onPick={(s) => setInput(s)} />
          ) : (
            messages.map((m) => {
              const text = messageText(m);
              const imgs = messageImages(m);
              if (m.role === "user") {
                return (
                  <Message key={m.id} from="user">
                    <MessageContent>
                      {imgs.length > 0 && (
                        <div className="flex flex-wrap gap-2 mb-2">
                          {imgs.map((img, i) => (
                            <img
                              key={i}
                              src={img.url}
                              alt={img.name ?? "anexo"}
                              className="max-h-48 rounded-lg border border-border"
                            />
                          ))}
                        </div>
                      )}
                      {text && <div className="whitespace-pre-wrap">{text}</div>}
                    </MessageContent>
                  </Message>
                );
              }
              return (
                <Message key={m.id} from="assistant">
                  <MessageContent className="!bg-transparent !p-0">
                    {text ? (
                      <>
                        <div className="prose prose-invert prose-sm max-w-none prose-a:text-primary prose-headings:text-foreground prose-strong:text-foreground">
                          <ReactMarkdown remarkPlugins={[remarkGfm]}>{text}</ReactMarkdown>
                        </div>
                        <div className="mt-2">
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => speak(m.id, text)}
                            className="h-7 px-2 gap-1.5 text-xs text-muted-foreground hover:text-foreground"
                          >
                            {speakingId === m.id ? (
                              <>
                                <Loader2 className="size-3.5 animate-spin" />
                                Reproduzindo... clique para parar
                              </>
                            ) : (
                              <>
                                <Volume2 className="size-3.5" />
                                Ouvir
                              </>
                            )}
                          </Button>
                        </div>
                      </>
                    ) : (
                      <Shimmer>Garimpando conteúdos raros...</Shimmer>
                    )}
                  </MessageContent>
                </Message>
              );
            })
          )}
          {isLoading && messages[messages.length - 1]?.role === "user" && (
            <Message from="assistant">
              <MessageContent className="!bg-transparent !p-0">
                <Shimmer>Garimpando conteúdos raros...</Shimmer>
              </MessageContent>
            </Message>
          )}
          {error && (
            <div className="text-sm text-destructive px-2">{error.message}</div>
          )}
        </ConversationContent>
        <ConversationScrollButton />
      </Conversation>

      <div className="border-t border-border bg-background/80 backdrop-blur">
        <div className="max-w-3xl mx-auto w-full px-4 py-4">
          {/* Image previews */}
          {previews.length > 0 && (
            <div className="flex flex-wrap gap-2 mb-3">
              {previews.map((url, i) => (
                <div key={i} className="relative">
                  <img
                    src={url}
                    alt="prévia"
                    className="h-20 w-20 object-cover rounded-lg border border-border"
                  />
                  <button
                    type="button"
                    onClick={() => removePending(i)}
                    className="absolute -top-2 -right-2 bg-background border border-border rounded-full p-0.5 hover:bg-destructive hover:text-destructive-foreground"
                    aria-label="Remover"
                  >
                    <X className="size-3" />
                  </button>
                </div>
              ))}
            </div>
          )}

          <PromptInput onSubmit={handleSubmit}>
            <PromptInputTextarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder={
                recording
                  ? "Gravando... clique no quadrado para parar"
                  : transcribing
                  ? "Transcrevendo seu áudio..."
                  : "Peça à Raro AI algo difícil de encontrar..."
              }
              disabled={isLoading || transcribing}
            />
            <PromptInputFooter>
              <div className="flex items-center gap-1">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  multiple
                  className="hidden"
                  onChange={onPickFiles}
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-sm"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isLoading}
                  aria-label="Anexar imagem"
                >
                  <Paperclip className="size-4" />
                </Button>
                <Button
                  type="button"
                  variant={recording ? "destructive" : "ghost"}
                  size="icon-sm"
                  onClick={recording ? stopRecording : startRecording}
                  disabled={isLoading || transcribing}
                  aria-label={recording ? "Parar gravação" : "Gravar áudio"}
                >
                  {recording ? <Square className="size-4" /> : <Mic className="size-4" />}
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-sm"
                  onClick={generateMusic}
                  disabled={isLoading || transcribing || generatingMusic || !input.trim()}
                  aria-label="Gerar música"
                  title="Gerar música a partir do texto"
                >
                  {generatingMusic ? <Loader2 className="size-4 animate-spin" /> : <Music2 className="size-4" />}
                </Button>
              </div>
              <div className="ml-auto">
                <PromptInputSubmit
                  status={status}
                  disabled={(!input.trim() && pendingFiles.length === 0) || isLoading || transcribing}
                />
              </div>
            </PromptInputFooter>
          </PromptInput>
          <p className="text-[11px] text-muted-foreground text-center mt-2">
            Raro AI pode imaginar links. Sempre confirme as fontes antes de usar.
          </p>
        </div>
      </div>
    </div>
  );
}

function EmptyState({ onPick }: { onPick: (s: string) => void }) {
  return (
    <div className="flex flex-col items-center justify-center text-center py-16 px-4">
      <img
        src={logo}
        alt="Raro AI"
        width={88}
        height={88}
        className="drop-shadow-[0_0_60px_oklch(0.70_0.24_320/0.6)]"
      />
      <h1 className="mt-6 text-3xl md:text-4xl font-semibold tracking-tight">
        O que vamos <span className="text-gradient-rare">descobrir</span> hoje?
      </h1>
      <p className="mt-3 text-muted-foreground max-w-md">
        Histórias esquecidas, arquivos obscuros, projetos secretos de IA — peça o que ninguém mais encontra.
      </p>
      <div className="mt-8 grid sm:grid-cols-2 gap-3 w-full max-w-2xl">
        {SUGGESTIONS.map((s) => (
          <button
            key={s}
            onClick={() => onPick(s)}
            className="text-left rounded-xl border border-border bg-card/40 hover:bg-card/80 hover:border-primary/50 transition p-4 text-sm"
          >
            {s}
          </button>
        ))}
      </div>
    </div>
  );
}

function LegalNoticeDialog() {
  return (
    <DialogContent className="max-w-lg">
      <DialogHeader>
        <DialogTitle className="flex items-center gap-2">
          <ShieldAlert className="size-5 text-amber-400" />
          Aviso legal — Raro AI
        </DialogTitle>
        <DialogDescription>Leia antes de usar a plataforma.</DialogDescription>
      </DialogHeader>
      <div className="space-y-3 text-sm text-foreground/90 leading-relaxed">
        <p>
          A <strong>Raro AI</strong> é uma ferramenta de pesquisa e descoberta de informações raras,
          histórias esquecidas, arquivos históricos, projetos antigos e conteúdos públicos difíceis de encontrar.
        </p>
        <p>
          A plataforma <strong>não promove, incentiva ou fornece</strong> pirataria, downloads ilegais,
          invasão de sistemas, quebra de direitos autorais ou acesso não autorizado a conteúdos protegidos.
        </p>
        <p>
          Todas as pesquisas devem respeitar as <strong>leis locais</strong>, os <strong>direitos autorais</strong>
          {" "}e os <strong>termos de uso</strong> das fontes consultadas.
        </p>
        <p>
          O foco da Raro AI é <strong>preservar conhecimento</strong>, encontrar informações históricas e ajudar
          usuários a descobrir conteúdos legítimos que normalmente são difíceis de localizar.
        </p>
      </div>
    </DialogContent>
  );
}
