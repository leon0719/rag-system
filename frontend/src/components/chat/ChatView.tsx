import { Clock, MessageSquare } from "lucide-solid";
import { createEffect, For, Show } from "solid-js";
import { EmptyState } from "~/components/common/EmptyState";
import { ErrorDisplay } from "~/components/common/ErrorDisplay";
import { Alert, AlertDescription, AlertTitle } from "~/components/ui/alert";
import { CHAT_RATE_LIMIT_PER_MINUTE } from "~/lib/constants";
import type { createChatStore } from "~/stores/chat";
import { ChatInput } from "./ChatInput";
import { ChatMessage } from "./ChatMessage";
import { StreamingMessage } from "./StreamingMessage";

interface ChatViewProps {
  chat: ReturnType<typeof createChatStore>;
  onSend: (question: string) => void;
}

export function ChatView(props: ChatViewProps) {
  let messagesEndRef: HTMLDivElement | undefined;

  createEffect(() => {
    props.chat.state.messages.length;
    props.chat.state.streamingContent;
    messagesEndRef?.scrollIntoView({ behavior: "smooth" });
  });

  return (
    <div class="flex h-full flex-col">
      <div class="flex-1 overflow-y-auto p-4">
        <div class="mx-auto max-w-3xl space-y-4">
          <Show
            when={props.chat.state.messages.length > 0 || props.chat.state.isStreaming}
            fallback={
              <EmptyState
                icon={MessageSquare}
                title="Start a conversation"
                description="Ask questions about your uploaded documents. The AI will find relevant content and provide answers with source citations."
                class="mt-20"
              />
            }
          >
            <For each={props.chat.state.messages}>
              {(message) => <ChatMessage message={message} />}
            </For>

            <Show when={props.chat.state.isStreaming}>
              <StreamingMessage content={props.chat.state.streamingContent} />
            </Show>
          </Show>

          <Show when={props.chat.state.error}>
            <Show
              when={props.chat.state.isRateLimited}
              fallback={
                <ErrorDisplay
                  error={props.chat.state.error ?? ""}
                  onRetry={() => {
                    const lastUserMsg = [...props.chat.state.messages]
                      .reverse()
                      .find((m) => m.role === "user");
                    if (lastUserMsg) {
                      props.onSend(lastUserMsg.content);
                    }
                  }}
                />
              }
            >
              <Alert>
                <Clock class="size-4" />
                <AlertTitle>Request limit reached</AlertTitle>
                <AlertDescription>
                  You can send up to {CHAT_RATE_LIMIT_PER_MINUTE} messages per minute. Please wait a
                  moment before trying again.
                </AlertDescription>
              </Alert>
            </Show>
          </Show>

          <div ref={messagesEndRef} />
        </div>
      </div>

      <ChatInput
        onSend={(question) => props.onSend(question)}
        onCancel={() => props.chat.cancelStream()}
        isStreaming={props.chat.state.isStreaming}
      />
    </div>
  );
}
