import { createMutation, createQuery, useQueryClient } from "@tanstack/solid-query";
import { Link, useNavigate, useParams } from "@tanstack/solid-router";
import { MessageSquare, Trash2 } from "lucide-solid";
import { createMemo, For, Show } from "solid-js";
import { apiFetch } from "~/lib/api";
import { queryKeys } from "~/lib/constants";
import { cn } from "~/lib/utils";
import type { PaginatedConversationList } from "~/types/conversation";

function formatRelativeTime(dateStr: string): string {
  const now = Date.now();
  const date = new Date(dateStr).getTime();
  const diffMs = now - date;
  const diffMin = Math.floor(diffMs / 60000);

  if (diffMin < 1) return "just now";
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffH = Math.floor(diffMin / 60);
  if (diffH < 24) return `${diffH}h ago`;
  const diffD = Math.floor(diffH / 24);
  if (diffD < 30) return `${diffD}d ago`;
  return new Date(dateStr).toLocaleDateString();
}

interface ConversationListProps {
  onSelect?: () => void;
}

export function ConversationList(props: ConversationListProps) {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const params = useParams({ strict: false });

  const conversationsQuery = createQuery(() => ({
    queryKey: queryKeys.conversations.list(1, 50),
    queryFn: () => apiFetch<PaginatedConversationList>("/conversations/?page=1&page_size=50"),
  }));

  const activeChatId = createMemo(() => {
    const p = params() as Record<string, string | undefined>;
    return p.chatId;
  });

  const deleteMutation = createMutation(() => ({
    mutationFn: (id: string) => apiFetch<void>(`/conversations/${id}`, { method: "DELETE" }),
    onSuccess: (_data, deletedId) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.conversations.all() });
      if (deletedId === activeChatId()) {
        navigate({ to: "/chat" });
      }
    },
  }));

  return (
    <div class="space-y-0.5">
      <Show
        when={conversationsQuery.data?.items && conversationsQuery.data.items.length > 0}
        fallback={<p class="px-3 py-2 text-xs text-muted-foreground">No conversations yet</p>}
      >
        <For each={conversationsQuery.data?.items}>
          {(conversation) => {
            const isActive = () => activeChatId() === conversation.id;

            return (
              <div
                class={cn(
                  "group flex items-center gap-1 rounded-md transition-colors",
                  isActive()
                    ? "bg-sidebar-accent text-sidebar-accent-foreground"
                    : "hover:bg-sidebar-accent/50",
                )}
              >
                <Link
                  to="/chat/$chatId"
                  params={{ chatId: conversation.id }}
                  onClick={() => props.onSelect?.()}
                  class="flex min-w-0 flex-1 items-center gap-2 px-3 py-2 text-sm"
                >
                  <MessageSquare class="size-3.5 shrink-0 text-muted-foreground" />
                  <div class="min-w-0 flex-1">
                    <p class="truncate font-medium">{conversation.title || "Untitled"}</p>
                    <p class="text-xs text-muted-foreground">
                      {formatRelativeTime(conversation.updated_at)}
                    </p>
                  </div>
                </Link>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    deleteMutation.mutate(conversation.id);
                  }}
                  class="mr-2 rounded p-1 opacity-0 transition-opacity hover:bg-destructive/10 hover:text-destructive group-hover:opacity-100"
                  title="Delete conversation"
                >
                  <Trash2 class="size-3.5" />
                </button>
              </div>
            );
          }}
        </For>
      </Show>
    </div>
  );
}
