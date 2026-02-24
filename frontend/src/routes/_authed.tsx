import { createFileRoute, Navigate, Outlet } from "@tanstack/solid-router";
import { Show } from "solid-js";
import { LoadingSpinner } from "~/components/common";
import { AppLayout } from "~/components/layout/AppLayout";
import { useAuth } from "~/contexts/auth";

export const Route = createFileRoute("/_authed")({
  component: AuthedLayout,
});

function AuthedLayout() {
  const auth = useAuth();

  return (
    <Show
      when={!auth.state.isLoading}
      fallback={
        <div class="flex h-screen items-center justify-center">
          <LoadingSpinner size="lg" />
        </div>
      }
    >
      <Show when={auth.state.isAuthenticated} fallback={<Navigate to="/login" />}>
        <AppLayout>
          <Outlet />
        </AppLayout>
      </Show>
    </Show>
  );
}
