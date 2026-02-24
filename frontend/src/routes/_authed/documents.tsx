import { createFileRoute, Outlet } from "@tanstack/solid-router";

export const Route = createFileRoute("/_authed/documents")({
  component: DocumentsLayout,
});

function DocumentsLayout() {
  return <Outlet />;
}
