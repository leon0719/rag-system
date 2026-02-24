import { createFileRoute } from "@tanstack/solid-router";
import { MessageSquare } from "lucide-solid";
import { createEffect, For, Show } from "solid-js";
import { ChatInput } from "~/components/chat/ChatInput";
import { ChatMessage } from "~/components/chat/ChatMessage";
import { StreamingMessage } from "~/components/chat/StreamingMessage";
import { EmptyState } from "~/components/common/EmptyState";
import { ErrorDisplay } from "~/components/common/ErrorDisplay";
import { useAuth } from "~/contexts/auth";
import { createChatStore } from "~/stores/chat";

export const Route = createFileRoute("/_authed/chat/")({
  component: ChatPage,
});

function ChatPage() {
  const auth = useAuth();
  const chat = createChatStore(() => auth.state.accessToken);
  let messagesEndRef: HTMLDivElement | undefined;

  createEffect(() => {
    // Re-read reactive values to track them
    chat.state.messages.length;
    chat.state.streamingContent;
    messagesEndRef?.scrollIntoView({ behavior: "smooth" });
  });

  return (
    <div class="flex h-full flex-col">
      <div class="flex-1 overflow-y-auto p-4">
        <div class="mx-auto max-w-3xl space-y-4">
          <Show
            when={chat.state.messages.length > 0 || chat.state.isStreaming}
            fallback={
              <EmptyState
                icon={MessageSquare}
                title="Start a conversation"
                description="Ask questions about your uploaded documents. The AI will find relevant content and provide answers with source citations."
                class="mt-20"
              />
            }
          >
            <For each={chat.state.messages}>{(message) => <ChatMessage message={message} />}</For>

            <Show when={chat.state.isStreaming}>
              <StreamingMessage content={chat.state.streamingContent} />
            </Show>
          </Show>

          <Show when={chat.state.error}>
            <ErrorDisplay
              error={chat.state.error ?? ""}
              onRetry={() => {
                const lastUserMsg = [...chat.state.messages]
                  .reverse()
                  .find((m) => m.role === "user");
                if (lastUserMsg) {
                  chat.sendQuery(lastUserMsg.content);
                }
              }}
            />
          </Show>

          <div ref={messagesEndRef} />
        </div>
      </div>

      <ChatInput
        onSend={(question) => chat.sendQuery(question)}
        onCancel={() => chat.cancelStream()}
        isStreaming={chat.state.isStreaming}
      />
    </div>
  );
}
