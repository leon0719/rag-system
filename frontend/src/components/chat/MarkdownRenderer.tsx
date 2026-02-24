import type { Schema } from "hast-util-sanitize";
import { defaultSchema } from "hast-util-sanitize";
import rehypeHighlight from "rehype-highlight";
import rehypeSanitize from "rehype-sanitize";
import { SolidMarkdown } from "solid-markdown";

const sanitizeSchema: Schema = {
  ...defaultSchema,
  attributes: {
    ...defaultSchema.attributes,
    code: [...(defaultSchema.attributes?.code ?? []), "className"],
    span: [...(defaultSchema.attributes?.span ?? []), "className"],
  },
};

interface MarkdownRendererProps {
  content: string;
  streaming?: boolean;
}

export function MarkdownRenderer(props: MarkdownRendererProps) {
  return (
    <div class="prose-chat">
      <SolidMarkdown
        rehypePlugins={[[rehypeSanitize, sanitizeSchema], rehypeHighlight]}
        renderingStrategy={props.streaming ? "reconcile" : "memo"}
      >
        {props.content}
      </SolidMarkdown>
    </div>
  );
}
