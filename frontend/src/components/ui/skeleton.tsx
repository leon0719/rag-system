import type { ComponentProps } from "solid-js";
import { splitProps } from "solid-js";

import { cn } from "~/lib/utils";

interface SkeletonProps extends ComponentProps<"div"> {
  class?: string;
}

function Skeleton(props: SkeletonProps) {
  const [local, others] = splitProps(props, ["class"]);

  return <div class={cn("animate-pulse rounded-md bg-primary/10", local.class)} {...others} />;
}

export { Skeleton };
export type { SkeletonProps };
