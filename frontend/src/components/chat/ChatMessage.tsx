import { Show } from "solid-js";
import { cn } from "~/lib/utils";
import type { ChatMessage as ChatMessageType } from "~/types/chat";
import { MarkdownRenderer } from "./MarkdownRenderer";

interface ChatMessageProps {
  message: ChatMessageType;
}

export function ChatMessage(props: ChatMessageProps) {
  const isUser = () => props.message.role === "user";

  return (
    <div class={cn("flex gap-3", isUser() && "flex-row-reverse")}>
      <div
        class={cn(
          "max-w-[80%] rounded-lg px-4 py-2.5",
          isUser() ? "bg-primary text-primary-foreground" : "bg-muted",
        )}
      >
        <Show
          when={!isUser()}
          fallback={<p class="whitespace-pre-wrap text-sm">{props.message.content}</p>}
        >
          <MarkdownRenderer content={props.message.content} />
        </Show>
      </div>
    </div>
  );
}
