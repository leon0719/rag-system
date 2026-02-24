import { Link } from "@tanstack/solid-router";
import { Show } from "solid-js";
import { Button } from "~/components/ui/button";
import { useAuth } from "~/contexts/auth";

export default function Header() {
  const auth = useAuth();

  return (
    <Show when={!auth.state.isAuthenticated}>
      <header class="flex h-14 items-center justify-between border-b px-6">
        <Link to="/" class="text-lg font-bold">
          RAG System
        </Link>
        <div class="flex items-center gap-2">
          <Link to="/login">
            <Button variant="ghost" size="sm">
              Sign In
            </Button>
          </Link>
          <Link to="/register">
            <Button size="sm">Sign Up</Button>
          </Link>
        </div>
      </header>
    </Show>
  );
}
