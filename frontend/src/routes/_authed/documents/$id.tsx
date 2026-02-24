import { createMutation, createQuery, useQueryClient } from "@tanstack/solid-query";
import { createFileRoute, useNavigate } from "@tanstack/solid-router";
import { ArrowLeft, Trash2 } from "lucide-solid";
import { Match, Switch } from "solid-js";
import { ErrorDisplay } from "~/components/common/ErrorDisplay";
import { LoadingSpinner } from "~/components/common/LoadingSpinner";
import { Badge } from "~/components/ui/badge";
import { Button } from "~/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card";
import { Separator } from "~/components/ui/separator";
import { apiFetch } from "~/lib/api";
import { queryKeys } from "~/lib/constants";
import type { DocumentDetail } from "~/types/document";

export const Route = createFileRoute("/_authed/documents/$id")({
  component: DocumentDetailPage,
});

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function DocumentDetailPage() {
  const params = Route.useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const documentQuery = createQuery(() => ({
    queryKey: queryKeys.documents.detail(params().id),
    queryFn: () => apiFetch<DocumentDetail>(`/documents/${params().id}`),
  }));

  const deleteMutation = createMutation(() => ({
    mutationFn: () => apiFetch(`/documents/${params().id}`, { method: "DELETE" }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["documents"] });
      navigate({ to: "/documents" });
    },
  }));

  const handleDelete = () => {
    if (window.confirm("Are you sure you want to delete this document?")) {
      deleteMutation.mutate();
    }
  };

  return (
    <div class="mx-auto max-w-4xl p-6">
      <Button variant="ghost" size="sm" onClick={() => navigate({ to: "/documents" })} class="mb-4">
        <ArrowLeft class="mr-2 size-4" />
        Back to Documents
      </Button>

      <Switch>
        <Match when={documentQuery.isLoading}>
          <LoadingSpinner size="lg" class="py-12" />
        </Match>
        <Match when={documentQuery.error}>
          <ErrorDisplay
            error={(documentQuery.error as Error).message}
            onRetry={() => documentQuery.refetch()}
          />
        </Match>
        <Match when={documentQuery.data}>
          {(doc) => (
            <Card>
              <CardHeader>
                <div class="flex items-start justify-between">
                  <div class="space-y-1">
                    <CardTitle class="text-xl">{doc().filename}</CardTitle>
                    <div class="flex items-center gap-2 text-sm text-muted-foreground">
                      <Badge variant="secondary">{doc().file_type}</Badge>
                      <span>{formatFileSize(doc().file_size)}</span>
                      <span>{doc().chunk_count} chunks</span>
                    </div>
                  </div>
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={handleDelete}
                    disabled={deleteMutation.isPending}
                  >
                    <Trash2 class="mr-2 size-4" />
                    {deleteMutation.isPending ? "Deleting..." : "Delete"}
                  </Button>
                </div>
              </CardHeader>
              <CardContent class="space-y-4">
                <div class="flex gap-6 text-sm text-muted-foreground">
                  <span>Created: {formatDate(doc().created_at)}</span>
                  <span>Updated: {formatDate(doc().updated_at)}</span>
                </div>
                <Separator />
                <div>
                  <h3 class="mb-2 font-medium">Content</h3>
                  <pre class="max-h-96 overflow-auto whitespace-pre-wrap rounded-md bg-muted p-4 text-sm">
                    {doc().content}
                  </pre>
                </div>
              </CardContent>
            </Card>
          )}
        </Match>
      </Switch>
    </div>
  );
}
