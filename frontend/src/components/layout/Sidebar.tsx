import { Link } from "@tanstack/solid-router";
import { FileText, LogOut, MessageSquare } from "lucide-solid";
import { type ComponentProps, splitProps } from "solid-js";
import { useAuth } from "~/contexts/auth";
import { cn } from "~/lib/utils";

interface SidebarProps extends ComponentProps<"aside"> {
  onClose?: () => void;
}

export function Sidebar(props: SidebarProps) {
  const [local, others] = splitProps(props, ["class", "onClose"]);
  const auth = useAuth();

  const handleLogout = async () => {
    await auth.logout();
  };

  return (
    <aside
      {...others}
      class={cn(
        "flex h-full w-64 flex-col border-r bg-sidebar text-sidebar-foreground",
        local.class,
      )}
    >
      <div class="flex h-14 items-center border-b px-4">
        <Link to="/chat" class="text-lg font-semibold" onClick={() => local.onClose?.()}>
          RAG System
        </Link>
      </div>

      <nav class="flex-1 space-y-1 p-3">
        <Link
          href="/chat"
          onClick={() => local.onClose?.()}
          activeProps={{ class: "bg-sidebar-accent text-sidebar-accent-foreground" }}
          inactiveProps={{ class: "hover:bg-sidebar-accent/50" }}
          class="flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors"
        >
          <MessageSquare class="size-4" />
          Chat
        </Link>
        <Link
          href="/documents"
          onClick={() => local.onClose?.()}
          activeProps={{ class: "bg-sidebar-accent text-sidebar-accent-foreground" }}
          inactiveProps={{ class: "hover:bg-sidebar-accent/50" }}
          class="flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors"
        >
          <FileText class="size-4" />
          Documents
        </Link>
      </nav>

      <div class="border-t p-3">
        <div class="flex items-center justify-between px-3 py-2">
          <span class="truncate text-sm font-medium">{auth.state.user?.username}</span>
          <button
            type="button"
            onClick={handleLogout}
            class="rounded-md p-1.5 text-muted-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground transition-colors"
            title="Logout"
          >
            <LogOut class="size-4" />
          </button>
        </div>
      </div>
    </aside>
  );
}
