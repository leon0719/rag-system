import type { ComponentProps, JSX } from "solid-js";
import { splitProps } from "solid-js";

import { cn } from "~/lib/utils";

interface CardProps extends ComponentProps<"div"> {
  class?: string;
  children?: JSX.Element;
}

function Card(props: CardProps) {
  const [local, others] = splitProps(props, ["class", "children"]);

  return (
    <div
      class={cn("rounded-xl border bg-card text-card-foreground shadow-sm", local.class)}
      {...others}
    >
      {local.children}
    </div>
  );
}

interface CardHeaderProps extends ComponentProps<"div"> {
  class?: string;
  children?: JSX.Element;
}

function CardHeader(props: CardHeaderProps) {
  const [local, others] = splitProps(props, ["class", "children"]);

  return (
    <div class={cn("flex flex-col gap-y-1.5 p-6", local.class)} {...others}>
      {local.children}
    </div>
  );
}

interface CardTitleProps extends ComponentProps<"h3"> {
  class?: string;
  children?: JSX.Element;
}

function CardTitle(props: CardTitleProps) {
  const [local, others] = splitProps(props, ["class", "children"]);

  return (
    <h3 class={cn("font-semibold text-lg leading-none tracking-tight", local.class)} {...others}>
      {local.children}
    </h3>
  );
}

interface CardDescriptionProps extends ComponentProps<"p"> {
  class?: string;
  children?: JSX.Element;
}

function CardDescription(props: CardDescriptionProps) {
  const [local, others] = splitProps(props, ["class", "children"]);

  return (
    <p class={cn("text-sm text-muted-foreground", local.class)} {...others}>
      {local.children}
    </p>
  );
}

interface CardContentProps extends ComponentProps<"div"> {
  class?: string;
  children?: JSX.Element;
}

function CardContent(props: CardContentProps) {
  const [local, others] = splitProps(props, ["class", "children"]);

  return (
    <div class={cn("p-6 pt-0", local.class)} {...others}>
      {local.children}
    </div>
  );
}

interface CardFooterProps extends ComponentProps<"div"> {
  class?: string;
  children?: JSX.Element;
}

function CardFooter(props: CardFooterProps) {
  const [local, others] = splitProps(props, ["class", "children"]);

  return (
    <div class={cn("flex items-center p-6 pt-0", local.class)} {...others}>
      {local.children}
    </div>
  );
}

export { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter };
export type {
  CardProps,
  CardHeaderProps,
  CardTitleProps,
  CardDescriptionProps,
  CardContentProps,
  CardFooterProps,
};
