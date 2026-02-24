import { createQuery, useQueryClient } from "@tanstack/solid-query";
import { createFileRoute } from "@tanstack/solid-router";
import { createEffect, onCleanup, Show, untrack } from "solid-js";
import { ChatView } from "~/components/chat/ChatView";
import { ErrorDisplay } from "~/components/common/ErrorDisplay";
import { LoadingSpinner } from "~/components/common/LoadingSpinner";
import { useAuth } from "~/contexts/auth";
import { apiFetch } from "~/lib/api";
import { queryKeys } from "~/lib/constants";
import { createChatStore } from "~/stores/chat";
import type { ChatMessage } from "~/types/chat";
import type { ConversationDetail } from "~/types/conversation";

export const Route = createFileRoute("/_authed/chat/$chatId")({
  component: ChatDetailPage,
});

function ChatDetailPage() {
  const params = Route.useParams();
  const auth = useAuth();
  const queryClient = useQueryClient();
  const chat = createChatStore({
    getToken: () => auth.state.accessToken,
    setToken: (token) => auth.setAccessToken(token),
    onAuthFailure: () => auth.logout(),
  });

  const conversationQuery = createQuery(() => ({
    queryKey: queryKeys.conversations.detail(params().chatId),
    queryFn: () => apiFetch<ConversationDetail>(`/conversations/${params().chatId}`),
  }));

  createEffect(() => {
    const data = conversationQuery.data;
    if (data && !untrack(() => chat.state.isStreaming)) {
      const messages: ChatMessage[] = data.messages.map((m) => ({
        id: m.id,
        role: m.role,
        content: m.content,
        sources: m.sources ?? undefined,
        timestamp: new Date(m.created_at).getTime(),
      }));
      chat.loadMessages(messages);
      chat.setConversationId(data.id);
    }
  });

  onCleanup(() => {
    chat.cancelStream();
  });

  const handleSend = (question: string) => {
    chat.sendQuery({
      question,
      onConversationCreated: () => {
        queryClient.invalidateQueries({ queryKey: queryKeys.conversations.lists() });
      },
    });
  };

  return (
    <Show
      when={!conversationQuery.isLoading}
      fallback={
        <div class="flex h-full items-center justify-center">
          <LoadingSpinner size="lg" />
        </div>
      }
    >
      <Show
        when={!conversationQuery.error}
        fallback={
          <div class="flex h-full items-center justify-center p-8">
            <ErrorDisplay
              error={
                conversationQuery.error instanceof Error
                  ? conversationQuery.error.message
                  : "Failed to load conversation"
              }
              onRetry={() => conversationQuery.refetch()}
            />
          </div>
        }
      >
        <ChatView chat={chat} onSend={handleSend} />
      </Show>
    </Show>
  );
}
