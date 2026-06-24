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
import { Mic, Paperclip, Download, X, Square, ShieldAlert, Info } from "lucide-react";
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
                      <div className="prose prose-invert prose-sm max-w-none prose-a:text-primary prose-headings:text-foreground prose-strong:text-foreground">
                        <ReactMarkdown remarkPlugins={[remarkGfm]}>{text}</ReactMarkdown>
                      </div>
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
