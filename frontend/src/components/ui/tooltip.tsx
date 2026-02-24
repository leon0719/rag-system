import type { ComponentProps, JSX } from "solid-js";
import { splitProps } from "solid-js";

import { cn } from "~/lib/utils";

interface TooltipRootProps extends ComponentProps<"div"> {
  class?: string;
  children?: JSX.Element;
}

function TooltipRoot(props: TooltipRootProps) {
  const [local, others] = splitProps(props, ["class", "children"]);

  return (
    <div class={cn("relative inline-flex group", local.class)} {...others}>
      {local.children}
    </div>
  );
}

interface TooltipContentProps extends ComponentProps<"div"> {
  class?: string;
  children?: JSX.Element;
}

function TooltipContent(props: TooltipContentProps) {
  const [local, others] = splitProps(props, ["class", "children"]);

  return (
    <div
      role="tooltip"
      class={cn(
        "absolute bottom-full left-1/2 z-50 mb-2 -translate-x-1/2 hidden group-hover:block whitespace-nowrap rounded-md bg-primary px-3 py-1.5 text-xs text-primary-foreground shadow-md animate-in fade-in-0 zoom-in-95",
        local.class,
      )}
      {...others}
    >
      {local.children}
    </div>
  );
}

export { TooltipRoot, TooltipContent };
export type { TooltipRootProps, TooltipContentProps };
