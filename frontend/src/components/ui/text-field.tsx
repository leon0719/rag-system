import type { ComponentProps, JSX } from "solid-js";
import { splitProps } from "solid-js";

import { cn } from "~/lib/utils";

interface TextFieldRootProps extends ComponentProps<"div"> {
  class?: string;
  children?: JSX.Element;
}

function TextFieldRoot(props: TextFieldRootProps) {
  const [local, others] = splitProps(props, ["class", "children"]);

  return (
    <div class={cn("flex flex-col gap-1.5", local.class)} {...others}>
      {local.children}
    </div>
  );
}

interface TextFieldInputProps extends ComponentProps<"input"> {
  class?: string;
}

function TextFieldInput(props: TextFieldInputProps) {
  const [local, others] = splitProps(props, ["class"]);

  return (
    <input
      class={cn(
        "flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50",
        local.class,
      )}
      {...others}
    />
  );
}

interface TextFieldTextAreaProps extends ComponentProps<"textarea"> {
  class?: string;
}

function TextFieldTextArea(props: TextFieldTextAreaProps) {
  const [local, others] = splitProps(props, ["class"]);

  return (
    <textarea
      class={cn(
        "flex min-h-20 w-full resize-none rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50",
        local.class,
      )}
      {...others}
    />
  );
}

interface TextFieldLabelProps extends ComponentProps<"label"> {
  class?: string;
  children?: JSX.Element;
}

function TextFieldLabel(props: TextFieldLabelProps) {
  const [local, others] = splitProps(props, ["class", "children"]);

  return (
    // biome-ignore lint/a11y/noLabelWithoutControl: composed with TextFieldInput via TextFieldRoot
    <label
      class={cn(
        "text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70",
        local.class,
      )}
      {...others}
    >
      {local.children}
    </label>
  );
}

interface TextFieldErrorMessageProps extends ComponentProps<"p"> {
  class?: string;
  children?: JSX.Element;
}

function TextFieldErrorMessage(props: TextFieldErrorMessageProps) {
  const [local, others] = splitProps(props, ["class", "children"]);

  return (
    <p class={cn("text-sm text-destructive", local.class)} {...others}>
      {local.children}
    </p>
  );
}

export { TextFieldRoot, TextFieldInput, TextFieldTextArea, TextFieldLabel, TextFieldErrorMessage };
export type {
  TextFieldRootProps,
  TextFieldInputProps,
  TextFieldTextAreaProps,
  TextFieldLabelProps,
  TextFieldErrorMessageProps,
};
