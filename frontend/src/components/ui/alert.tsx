import type { VariantProps } from "class-variance-authority";
import { cva } from "class-variance-authority";
import type { ComponentProps, JSX } from "solid-js";
import { splitProps } from "solid-js";

import { cn } from "~/lib/utils";

const alertVariants = cva(
  "relative w-full rounded-lg border px-4 py-3 text-sm [&>svg+div]:translate-y-[-3px] [&>svg]:absolute [&>svg]:left-4 [&>svg]:top-4 [&>svg]:text-foreground [&>svg~*]:pl-7",
  {
    variants: {
      variant: {
        default: "bg-background text-foreground",
        destructive:
          "border-destructive/50 text-destructive dark:border-destructive [&>svg]:text-destructive",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  },
);

interface AlertProps extends ComponentProps<"div">, VariantProps<typeof alertVariants> {
  class?: string;
  children?: JSX.Element;
}

function Alert(props: AlertProps) {
  const [local, others] = splitProps(props, ["variant", "class", "children"]);

  return (
    <div
      role="alert"
      class={cn(alertVariants({ variant: local.variant }), local.class)}
      {...others}
    >
      {local.children}
    </div>
  );
}

interface AlertTitleProps extends ComponentProps<"h5"> {
  class?: string;
  children?: JSX.Element;
}

function AlertTitle(props: AlertTitleProps) {
  const [local, others] = splitProps(props, ["class", "children"]);

  return (
    <h5 class={cn("mb-1 font-medium leading-none tracking-tight", local.class)} {...others}>
      {local.children}
    </h5>
  );
}

interface AlertDescriptionProps extends ComponentProps<"div"> {
  class?: string;
  children?: JSX.Element;
}

function AlertDescription(props: AlertDescriptionProps) {
  const [local, others] = splitProps(props, ["class", "children"]);

  return (
    <div class={cn("text-sm [&_p]:leading-relaxed", local.class)} {...others}>
      {local.children}
    </div>
  );
}

export { Alert, AlertTitle, AlertDescription, alertVariants };
export type { AlertProps, AlertTitleProps, AlertDescriptionProps };
