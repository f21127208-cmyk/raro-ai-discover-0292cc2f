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
import logo from "@/assets/raro-logo.png";
import { toast } from "sonner";

const SUGGESTIONS = [
  "Encontre histórias raras para vídeos de IA",
  "Quais arquivos públicos pouco conhecidos posso explorar?",
  "Liste projetos open source de IA generativa obscuros",
  "Sites e fóruns raros sobre mistérios não resolvidos",
];

function messageText(m: UIMessage) {
  return m.parts.map((p) => (p.type === "text" ? p.text : "")).join("");
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
  const [currentThreadId, setCurrentThreadId] = useState<string | null>(threadId);
  const pendingTitleRef = useRef<string | null>(null);

  useEffect(() => {
    setCurrentThreadId(threadId);
  }, [threadId]);

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

  // Once streaming finishes after first message, rename thread to first user prompt
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
    if (!text || isLoading) return;

    let tid = currentThreadId;
    if (!tid) {
      try {
        const t = await createFn({ data: { title: text.slice(0, 80) } });
        tid = t.id;
        setCurrentThreadId(t.id);
        qc.invalidateQueries({ queryKey: ["threads"] });
        navigate({ to: "/chat/$threadId", params: { threadId: t.id }, replace: true });
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Falha ao criar conversa");
        return;
      }
    } else if (messages.length === 0) {
      pendingTitleRef.current = text;
    }

    setInput("");
    sendMessage({ text }, { body: { threadId: tid } });
  };

  const isEmpty = messages.length === 0;

  return (
    <div className="flex flex-col h-full">
      <Conversation className="flex-1 min-h-0">
        <ConversationContent className="max-w-3xl mx-auto w-full px-4">
          {isEmpty ? (
            <EmptyState
              onPick={(s) => {
                setInput(s);
              }}
            />
          ) : (
            messages.map((m) => {
              const text = messageText(m);
              if (m.role === "user") {
                return (
                  <Message key={m.id} from="user">
                    <MessageContent>
                      <div className="whitespace-pre-wrap">{text}</div>
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
          <PromptInput onSubmit={handleSubmit}>
            <PromptInputTextarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Peça à Raro AI algo difícil de encontrar..."
              disabled={isLoading}
            />
            <PromptInputFooter className="justify-end">
              <PromptInputSubmit
                status={status}
                disabled={!input.trim() || isLoading}
              />
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
