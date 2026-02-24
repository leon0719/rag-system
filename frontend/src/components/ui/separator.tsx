import { type ComponentProps, splitProps } from "solid-js";

import { cn } from "~/lib/utils";

interface SeparatorProps extends ComponentProps<"hr"> {
  orientation?: "horizontal" | "vertical";
  class?: string;
}

function Separator(props: SeparatorProps) {
  const [local, others] = splitProps(props, ["orientation", "class"]);

  return (
    <hr
      class={cn(
        "shrink-0 border-none bg-border",
        (local.orientation || "horizontal") === "horizontal" ? "h-px w-full" : "h-full w-px",
        local.class,
      )}
      {...others}
    />
  );
}

export { Separator };
export type { SeparatorProps };
