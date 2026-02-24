import { Show } from "solid-js";
import { MarkdownRenderer } from "./MarkdownRenderer";

interface StreamingMessageProps {
  content: string;
}

export function StreamingMessage(props: StreamingMessageProps) {
  return (
    <div class="flex gap-3">
      <div class="max-w-[80%] rounded-lg bg-muted px-4 py-2.5">
        <Show
          when={props.content}
          fallback={
            <span class="inline-block h-4 w-1.5 animate-pulse bg-foreground align-middle" />
          }
        >
          <MarkdownRenderer content={props.content} streaming />
          <span class="ml-0.5 inline-block h-4 w-1.5 animate-pulse bg-foreground align-middle" />
        </Show>
      </div>
    </div>
  );
}
