import { createRootRouteWithContext, HeadContent, Link, Scripts } from "@tanstack/solid-router";
import { QueryClient, QueryClientProvider } from "@tanstack/solid-query";

import "@fontsource/inter";

import { ErrorBoundary, Suspense } from "solid-js";
import type { JSX } from "solid-js";
import { HydrationScript } from "solid-js/web";

import { AuthProvider } from "~/contexts/auth";
import { queryClient } from "~/integrations/tanstack-query/provider";

import styleCss from "../styles.css?url";

export const Route = createRootRouteWithContext<{
  queryClient: QueryClient;
}>()({
  head: () => ({
    links: [{ rel: "stylesheet", href: styleCss }],
    meta: [
      { title: "RAG System" },
      { name: "description", content: "RAG-powered document Q&A system" },
    ],
  }),
  errorComponent: RootErrorComponent,
  notFoundComponent: NotFound,
  shellComponent: RootDocument,
});

function RootErrorComponent(props: { error: Error; reset: () => void }) {
  return (
    <div class="flex min-h-[calc(100vh-3.5rem)] flex-col items-center justify-center gap-4 text-center">
      <h1 class="text-2xl font-bold text-destructive">Something went wrong</h1>
      <p class="max-w-md text-muted-foreground">{props.error.message}</p>
      <div class="flex gap-3">
        <button
          type="button"
          onClick={props.reset}
          class="rounded-md bg-primary px-4 py-2 text-sm text-primary-foreground hover:bg-primary/90"
        >
          Try again
        </button>
        <Link to="/" class="rounded-md border px-4 py-2 text-sm hover:bg-accent">
          Back to home
        </Link>
      </div>
    </div>
  );
}

function NotFound() {
  return (
    <div class="flex min-h-[calc(100vh-3.5rem)] flex-col items-center justify-center gap-4 text-center">
      <h1 class="text-4xl font-bold">404</h1>
      <p class="text-muted-foreground">Page not found</p>
      <Link to="/" class="text-primary hover:underline">
        Back to home
      </Link>
    </div>
  );
}

function RootDocument(props: { children: JSX.Element }) {
  return (
    <html lang="en">
      <head>
        <HydrationScript />
      </head>
      <body>
        <HeadContent />
        <Suspense>
          <QueryClientProvider client={queryClient}>
            <AuthProvider>{props.children}</AuthProvider>
          </QueryClientProvider>
        </Suspense>
        <Scripts />
      </body>
    </html>
  );
}
