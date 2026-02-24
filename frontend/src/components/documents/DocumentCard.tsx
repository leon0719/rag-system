import { createMutation, useQueryClient } from "@tanstack/solid-query";
import { Link } from "@tanstack/solid-router";
import { FileText, Trash2 } from "lucide-solid";
import { Badge } from "~/components/ui/badge";
import { Button } from "~/components/ui/button";
import { Card } from "~/components/ui/card";
import { apiFetch } from "~/lib/api";
import type { DocumentSummary } from "~/types/document";

interface DocumentCardProps {
  document: DocumentSummary;
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export function DocumentCard(props: DocumentCardProps) {
  const queryClient = useQueryClient();

  const deleteMutation = createMutation(() => ({
    mutationFn: () => apiFetch(`/documents/${props.document.id}`, { method: "DELETE" }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["documents"] });
    },
  }));

  const handleDelete = (e: Event) => {
    e.preventDefault();
    e.stopPropagation();
    if (window.confirm(`Delete "${props.document.filename}"?`)) {
      deleteMutation.mutate();
    }
  };

  return (
    <Link to="/documents/$id" params={{ id: props.document.id }}>
      <Card class="flex items-center gap-4 p-4 transition-colors hover:bg-accent/50">
        <div class="flex size-10 items-center justify-center rounded-md bg-primary/10">
          <FileText class="size-5 text-primary" />
        </div>
        <div class="min-w-0 flex-1">
          <p class="truncate font-medium">{props.document.filename}</p>
          <div class="mt-1 flex items-center gap-2 text-xs text-muted-foreground">
            <Badge variant="outline" class="text-[10px]">
              {props.document.file_type}
            </Badge>
            <span>{formatFileSize(props.document.file_size)}</span>
            <span>{props.document.chunk_count} chunks</span>
            <span>{formatDate(props.document.created_at)}</span>
          </div>
        </div>
        <Button
          variant="ghost"
          size="icon"
          onClick={handleDelete}
          disabled={deleteMutation.isPending}
          class="shrink-0 text-muted-foreground hover:text-destructive"
        >
          <Trash2 class="size-4" />
        </Button>
      </Card>
    </Link>
  );
}
