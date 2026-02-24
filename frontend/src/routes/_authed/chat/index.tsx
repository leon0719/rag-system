import { useQueryClient } from "@tanstack/solid-query";
import { createFileRoute, useNavigate } from "@tanstack/solid-router";
import { createEffect, onCleanup } from "solid-js";
import { ChatView } from "~/components/chat/ChatView";
import { useAuth } from "~/contexts/auth";
import { queryKeys } from "~/lib/constants";
import { createChatStore } from "~/stores/chat";
import type { ConversationDetail } from "~/types/conversation";

export const Route = createFileRoute("/_authed/chat/")({
  component: ChatPage,
});

function ChatPage() {
  const auth = useAuth();
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const chat = createChatStore({
    getToken: () => auth.state.accessToken,
    setToken: (token) => auth.setAccessToken(token),
    onAuthFailure: () => auth.logout(),
  });

  onCleanup(() => {
    chat.cancelStream();
  });

  // After first stream completes, navigate to conversation page
  createEffect(() => {
    const conversationId = chat.state.conversationId;
    if (conversationId && !chat.state.isStreaming && !chat.state.error) {
      // Pre-populate detail cache so ChatDetailPage renders instantly (no flash)
      const now = new Date().toISOString();
      queryClient.setQueryData<ConversationDetail>(queryKeys.conversations.detail(conversationId), {
        id: conversationId,
        title: chat.state.messages[0]?.content.slice(0, 50) ?? "",
        messages: chat.state.messages.map((m) => ({
          id: m.id,
          role: m.role,
          content: m.content,
          sources: m.sources ?? null,
          prompt_tokens: m.usage?.prompt_tokens ?? null,
          completion_tokens: m.usage?.completion_tokens ?? null,
          created_at: new Date(m.timestamp).toISOString(),
        })),
        created_at: now,
        updated_at: now,
      });
      queryClient.invalidateQueries({ queryKey: queryKeys.conversations.lists() });
      navigate({ to: "/chat/$chatId", params: { chatId: conversationId }, replace: true });
    }
  });

  const handleSend = (question: string) => {
    chat.sendQuery({ question });
  };

  return <ChatView chat={chat} onSend={handleSend} />;
}
