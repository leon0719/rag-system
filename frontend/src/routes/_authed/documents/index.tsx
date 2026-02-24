import { createQuery } from "@tanstack/solid-query";
import { createFileRoute, Link } from "@tanstack/solid-router";
import { FileText, Plus } from "lucide-solid";
import { createSignal, For, Match, Show, Switch } from "solid-js";
import { EmptyState } from "~/components/common/EmptyState";
import { ErrorDisplay } from "~/components/common/ErrorDisplay";
import { LoadingSpinner } from "~/components/common/LoadingSpinner";
import { DocumentCard } from "~/components/documents/DocumentCard";
import { Button } from "~/components/ui/button";
import { apiFetch } from "~/lib/api";
import { queryKeys } from "~/lib/constants";
import type { PaginatedDocuments } from "~/types/document";

export const Route = createFileRoute("/_authed/documents/")({
  component: DocumentsListPage,
});

function DocumentsListPage() {
  const [page, setPage] = createSignal(1);
  const pageSize = 10;

  const documentsQuery = createQuery(() => ({
    queryKey: queryKeys.documents.list(page(), pageSize),
    queryFn: () => apiFetch<PaginatedDocuments>(`/documents/?page=${page()}&page_size=${pageSize}`),
  }));

  return (
    <div class="mx-auto max-w-4xl p-6">
      <div class="mb-6 flex items-center justify-between">
        <h1 class="text-2xl font-bold">Documents</h1>
        <Link to="/documents/upload">
          <Button>
            <Plus class="mr-2 size-4" />
            Upload
          </Button>
        </Link>
      </div>

      <Switch>
        <Match when={documentsQuery.isLoading}>
          <LoadingSpinner size="lg" class="py-12" />
        </Match>
        <Match when={documentsQuery.error}>
          <ErrorDisplay
            error={(documentsQuery.error as Error).message}
            onRetry={() => documentsQuery.refetch()}
          />
        </Match>
        <Match when={documentsQuery.data && documentsQuery.data.items.length === 0}>
          <EmptyState
            icon={FileText}
            title="No documents yet"
            description="Upload your first document to get started with RAG queries."
          >
            <Link to="/documents/upload">
              <Button>
                <Plus class="mr-2 size-4" />
                Upload Document
              </Button>
            </Link>
          </EmptyState>
        </Match>
        <Match when={documentsQuery.data}>
          {(data) => (
            <>
              <div class="space-y-3">
                <For each={data().items}>{(doc) => <DocumentCard document={doc} />}</For>
              </div>

              <Show when={page() > 1 || data().has_more}>
                <div class="mt-6 flex items-center justify-center gap-3">
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={page() === 1}
                    onClick={() => setPage((p) => p - 1)}
                  >
                    Previous
                  </Button>
                  <span class="text-sm text-muted-foreground">Page {page()}</span>
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={!data().has_more}
                    onClick={() => setPage((p) => p + 1)}
                  >
                    Next
                  </Button>
                </div>
              </Show>
            </>
          )}
        </Match>
      </Switch>
    </div>
  );
}
