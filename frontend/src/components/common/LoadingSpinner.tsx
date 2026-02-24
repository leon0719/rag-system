import { type ComponentProps, splitProps } from "solid-js";

import { cn } from "~/lib/utils";

interface LoadingSpinnerProps extends ComponentProps<"div"> {
  size?: "sm" | "md" | "lg";
}

export function LoadingSpinner(props: LoadingSpinnerProps) {
  const [local, others] = splitProps(props, ["size", "class"]);

  const sizeClass = () => {
    switch (local.size ?? "md") {
      case "sm":
        return "size-4 border-2";
      case "lg":
        return "size-8 border-[3px]";
      default:
        return "size-6 border-2";
    }
  };

  return (
    <div {...others} class={cn("flex items-center justify-center", local.class)}>
      <div
        class={cn("animate-spin rounded-full border-primary border-t-transparent", sizeClass())}
      />
    </div>
  );
}
