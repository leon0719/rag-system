import { type Component, type ComponentProps, type JSX, Show, splitProps } from "solid-js";
import { Dynamic } from "solid-js/web";

import { cn } from "~/lib/utils";

interface EmptyStateProps extends ComponentProps<"div"> {
  icon?: Component<{ class?: string }>;
  title: string;
  description?: string;
  children?: JSX.Element;
}

export function EmptyState(props: EmptyStateProps) {
  const [local, others] = splitProps(props, ["icon", "title", "description", "children", "class"]);

  return (
    <div
      {...others}
      class={cn("flex flex-col items-center justify-center py-12 text-center", local.class)}
    >
      <Show when={local.icon}>
        {(Icon) => <Dynamic component={Icon()} class="mb-4 size-12 text-muted-foreground" />}
      </Show>
      <h3 class="text-lg font-semibold">{local.title}</h3>
      <Show when={local.description}>
        {(desc) => <p class="mt-1 max-w-sm text-sm text-muted-foreground">{desc()}</p>}
      </Show>
      <Show when={local.children}>
        <div class="mt-4">{local.children}</div>
      </Show>
    </div>
  );
}
