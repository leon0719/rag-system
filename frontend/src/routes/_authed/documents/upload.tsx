import { createMutation, useQueryClient } from "@tanstack/solid-query";
import { createFileRoute, useNavigate } from "@tanstack/solid-router";
import { FileUp, Upload, X } from "lucide-solid";
import { createSignal, For, Show } from "solid-js";
import { Button } from "~/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card";
import { apiFetch } from "~/lib/api";
import type { DocumentUploadResult } from "~/types/document";

export const Route = createFileRoute("/_authed/documents/upload")({
  component: UploadPage,
});

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function UploadPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [files, setFiles] = createSignal<File[]>([]);
  const [dragOver, setDragOver] = createSignal(false);

  const uploadMutation = createMutation(() => ({
    mutationFn: async (selectedFiles: File[]) => {
      const formData = new FormData();
      for (const file of selectedFiles) {
        formData.append("files", file);
      }
      return apiFetch<DocumentUploadResult[]>("/documents/upload", {
        method: "POST",
        body: formData,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["documents"] });
      navigate({ to: "/documents" });
    },
  }));

  const addFiles = (newFiles: FileList | null) => {
    if (!newFiles) return;
    const accepted = Array.from(newFiles).filter((f) =>
      [".txt", ".md", ".pdf"].some((ext) => f.name.toLowerCase().endsWith(ext)),
    );
    setFiles((prev) => [...prev, ...accepted]);
  };

  const removeFile = (index: number) => {
    setFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const handleDrop = (e: DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    addFiles(e.dataTransfer?.files ?? null);
  };

  return (
    <div class="mx-auto max-w-2xl p-6">
      <h1 class="mb-6 text-2xl font-bold">Upload Documents</h1>

      <Card>
        <CardHeader>
          <CardTitle>Select Files</CardTitle>
        </CardHeader>
        <CardContent class="space-y-4">
          {/* Drop zone */}
          <div
            class={`flex min-h-40 cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed p-6 transition-colors ${
              dragOver()
                ? "border-primary bg-primary/5"
                : "border-muted-foreground/25 hover:border-primary/50"
            }`}
            onDragOver={(e) => {
              e.preventDefault();
              setDragOver(true);
            }}
            onDragLeave={() => setDragOver(false)}
            onDrop={handleDrop}
            onClick={() => {
              const input = document.createElement("input");
              input.type = "file";
              input.multiple = true;
              input.accept = ".txt,.md,.pdf";
              input.onchange = () => addFiles(input.files);
              input.click();
            }}
          >
            <Upload class="mb-3 size-8 text-muted-foreground" />
            <p class="text-sm font-medium">Click to browse or drag files here</p>
            <p class="mt-1 text-xs text-muted-foreground">Supports .txt, .md, .pdf</p>
          </div>

          {/* File list */}
          <Show when={files().length > 0}>
            <div class="space-y-2">
              <For each={files()}>
                {(file, index) => (
                  <div class="flex items-center justify-between rounded-md border px-3 py-2">
                    <div class="flex items-center gap-2 overflow-hidden">
                      <FileUp class="size-4 shrink-0 text-muted-foreground" />
                      <span class="truncate text-sm">{file.name}</span>
                      <span class="shrink-0 text-xs text-muted-foreground">
                        {formatFileSize(file.size)}
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => removeFile(index())}
                      class="ml-2 shrink-0 rounded p-1 hover:bg-accent"
                    >
                      <X class="size-4" />
                    </button>
                  </div>
                )}
              </For>
            </div>
          </Show>

          <Show when={uploadMutation.error}>
            <div class="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
              {(uploadMutation.error as Error).message}
            </div>
          </Show>

          <div class="flex gap-3">
            <Button
              onClick={() => uploadMutation.mutate(files())}
              disabled={files().length === 0 || uploadMutation.isPending}
              class="flex-1"
            >
              {uploadMutation.isPending ? "Uploading..." : `Upload ${files().length} file(s)`}
            </Button>
            <Button variant="outline" onClick={() => navigate({ to: "/documents" })}>
              Cancel
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
