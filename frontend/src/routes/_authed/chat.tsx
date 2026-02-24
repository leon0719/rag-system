import { createFileRoute, Outlet } from "@tanstack/solid-router";

export const Route = createFileRoute("/_authed/chat")({
  component: ChatLayout,
});

function ChatLayout() {
  return <Outlet />;
}
