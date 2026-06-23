import { createFileRoute, notFound } from "@tanstack/react-router";
import { ChatWindow } from "@/components/chat/chat-window";
import { getThreadMessages } from "@/lib/threads.functions";
import type { UIMessage } from "ai";

type DbMsg = { id: string; role: string; parts: unknown; created_at: string };

export const Route = createFileRoute("/_authenticated/chat/$threadId")({
  ssr: false,
  loader: async ({ params }) => {
    try {
      const rows = (await getThreadMessages({ data: { threadId: params.threadId } })) as DbMsg[];
      const messages: UIMessage[] = rows.map((r) => ({
        id: r.id,
        role: r.role as UIMessage["role"],
        parts: Array.isArray(r.parts) ? (r.parts as UIMessage["parts"]) : [],
      }));
      return { messages };
    } catch {
      throw notFound();
    }
  },
  component: ThreadPage,
  notFoundComponent: () => (
    <div className="flex h-full items-center justify-center text-muted-foreground">
      Conversa não encontrada.
    </div>
  ),
  errorComponent: ({ error }) => (
    <div className="flex h-full items-center justify-center text-destructive">
      {error.message}
    </div>
  ),
});

function ThreadPage() {
  const { threadId } = Route.useParams();
  const { messages } = Route.useLoaderData();
  return <ChatWindow key={threadId} threadId={threadId} initialMessages={messages} />;
}
