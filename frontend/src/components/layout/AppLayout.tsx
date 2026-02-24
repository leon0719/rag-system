import { Menu } from "lucide-solid";
import { createSignal, type ParentProps, Show } from "solid-js";
import { cn } from "~/lib/utils";
import { Sidebar } from "./Sidebar";

export function AppLayout(props: ParentProps) {
  const [sidebarOpen, setSidebarOpen] = createSignal(false);

  return (
    <div class="flex h-screen overflow-hidden bg-background">
      {/* Desktop sidebar */}
      <div class="hidden md:flex">
        <Sidebar />
      </div>

      {/* Mobile sidebar overlay */}
      <Show when={sidebarOpen()}>
        <div class="fixed inset-0 z-40 md:hidden">
          <div
            class="fixed inset-0 bg-black/50"
            onClick={() => setSidebarOpen(false)}
            onKeyDown={(e) => e.key === "Escape" && setSidebarOpen(false)}
          />
          <div class="fixed inset-y-0 left-0 z-50 w-64">
            <Sidebar onClose={() => setSidebarOpen(false)} />
          </div>
        </div>
      </Show>

      {/* Main content */}
      <div class="flex flex-1 flex-col overflow-hidden">
        {/* Mobile header */}
        <header class="flex h-14 items-center gap-3 border-b px-4 md:hidden">
          <button
            type="button"
            onClick={() => setSidebarOpen(true)}
            class="rounded-md p-1.5 hover:bg-accent"
          >
            <Menu class="size-5" />
          </button>
          <span class="text-lg font-semibold">RAG System</span>
        </header>

        <main class={cn("flex-1 overflow-y-auto")}>{props.children}</main>
      </div>
    </div>
  );
}
