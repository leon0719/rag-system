import { Link } from "@tanstack/solid-router";
import { FileText } from "lucide-solid";
import { Badge } from "~/components/ui/badge";
import type { Source } from "~/types/chat";

interface SourceCardProps {
  source: Source;
}

export function SourceCard(props: SourceCardProps) {
  const scorePercent = () => Math.round(props.source.score * 100);

  return (
    <Link
      to="/documents/$id"
      params={{ id: props.source.document_id }}
      class="block rounded-md border p-3 transition-colors hover:bg-accent/50"
    >
      <div class="mb-1.5 flex items-center gap-2">
        <FileText class="size-3.5 text-muted-foreground" />
        <span class="truncate text-sm font-medium">{props.source.filename}</span>
        <Badge variant="secondary" class="ml-auto shrink-0 text-[10px]">
          {scorePercent()}%
        </Badge>
      </div>
      <p class="line-clamp-2 text-xs text-muted-foreground">{props.source.content}</p>
    </Link>
  );
}
