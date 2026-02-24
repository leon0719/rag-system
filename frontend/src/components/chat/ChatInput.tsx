import { Send, Square } from "lucide-solid";
import { createMemo, createSignal } from "solid-js";
import { Button } from "~/components/ui/button";
import { MAX_QUESTION_LENGTH } from "~/lib/constants";

interface ChatInputProps {
  onSend: (question: string) => void;
  onCancel: () => void;
  isStreaming: boolean;
}

export function ChatInput(props: ChatInputProps) {
  const [input, setInput] = createSignal("");

  const charCount = createMemo(() => input().length);
  const isOverLimit = createMemo(() => charCount() > MAX_QUESTION_LENGTH);
  const canSend = createMemo(() => input().trim().length > 0 && !isOverLimit());

  const handleSubmit = () => {
    if (!canSend() || props.isStreaming) return;
    const question = input().trim();
    setInput("");
    props.onSend(question);
  };

  const handleKeyDown = (e: KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey && !e.isComposing) {
      e.preventDefault();
      handleSubmit();
    }
  };

  return (
    <div class="border-t bg-background p-4">
      <div class="mx-auto max-w-3xl">
        <div class="flex items-end gap-2">
          <textarea
            value={input()}
            onInput={(e) => {
              setInput(e.currentTarget.value);
              e.currentTarget.style.height = "auto";
              e.currentTarget.style.height = `${Math.min(e.currentTarget.scrollHeight, 120)}px`;
            }}
            onKeyDown={handleKeyDown}
            placeholder="Ask a question about your documents..."
            disabled={props.isStreaming}
            rows={1}
            class="flex-1 resize-none rounded-md border bg-transparent px-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:opacity-50"
            classList={{ "border-destructive focus-visible:ring-destructive": isOverLimit() }}
            style={{ "max-height": "120px" }}
          />
          {props.isStreaming ? (
            <Button variant="destructive" size="icon" onClick={() => props.onCancel()}>
              <Square class="size-4" />
            </Button>
          ) : (
            <Button size="icon" onClick={handleSubmit} disabled={!canSend()}>
              <Send class="size-4" />
            </Button>
          )}
        </div>
        <div class="mt-1 flex justify-end px-1">
          <span
            class="text-xs"
            classList={{
              "text-muted-foreground": charCount() <= MAX_QUESTION_LENGTH * 0.9,
              "text-yellow-500": charCount() > MAX_QUESTION_LENGTH * 0.9 && !isOverLimit(),
              "text-destructive": isOverLimit(),
            }}
          >
            {charCount()}/{MAX_QUESTION_LENGTH}
          </span>
        </div>
      </div>
    </div>
  );
}
