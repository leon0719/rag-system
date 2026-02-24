import { Send, Square } from "lucide-solid";
import { createSignal } from "solid-js";
import { Button } from "~/components/ui/button";

interface ChatInputProps {
  onSend: (question: string) => void;
  onCancel: () => void;
  isStreaming: boolean;
}

export function ChatInput(props: ChatInputProps) {
  const [input, setInput] = createSignal("");

  const handleSubmit = () => {
    const question = input().trim();
    if (!question || props.isStreaming) return;
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
      <div class="mx-auto flex max-w-3xl items-end gap-2">
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
          style={{ "max-height": "120px" }}
        />
        {props.isStreaming ? (
          <Button variant="destructive" size="icon" onClick={() => props.onCancel()}>
            <Square class="size-4" />
          </Button>
        ) : (
          <Button size="icon" onClick={handleSubmit} disabled={!input().trim()}>
            <Send class="size-4" />
          </Button>
        )}
      </div>
    </div>
  );
}
