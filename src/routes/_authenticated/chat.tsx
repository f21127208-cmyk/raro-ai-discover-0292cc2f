import { createFileRoute, Outlet } from "@tanstack/react-router";
import { ChatShell } from "@/components/chat/chat-shell";

export const Route = createFileRoute("/_authenticated/chat")({
  ssr: false,
  component: ChatLayout,
});

function ChatLayout() {
  return (
    <ChatShell>
      <Outlet />
    </ChatShell>
  );
}
