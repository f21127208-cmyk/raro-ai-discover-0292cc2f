import { createFileRoute } from "@tanstack/react-router";
import { ChatWindow } from "@/components/chat/chat-window";

export const Route = createFileRoute("/_authenticated/chat/")({
  ssr: false,
  component: () => <ChatWindow threadId={null} initialMessages={[]} />,
});
