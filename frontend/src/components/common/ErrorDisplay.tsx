import { CircleAlert } from "lucide-solid";
import { type ComponentProps, Show, splitProps } from "solid-js";
import { Alert, AlertDescription, AlertTitle } from "~/components/ui/alert";
import { Button } from "~/components/ui/button";
import { cn } from "~/lib/utils";

interface ErrorDisplayProps extends ComponentProps<"div"> {
  error: string;
  onRetry?: () => void;
}

export function ErrorDisplay(props: ErrorDisplayProps) {
  const [local, others] = splitProps(props, ["error", "onRetry", "class"]);

  return (
    <div {...others} class={cn(local.class)}>
      <Alert variant="destructive">
        <CircleAlert />
        <AlertTitle>Error</AlertTitle>
        <AlertDescription>
          <p>{local.error}</p>
          <Show when={local.onRetry}>
            {(retry) => (
              <Button variant="outline" size="sm" onClick={() => retry()()} class="mt-3">
                Try again
              </Button>
            )}
          </Show>
        </AlertDescription>
      </Alert>
    </div>
  );
}
