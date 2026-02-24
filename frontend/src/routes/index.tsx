import { createFileRoute, Link } from "@tanstack/solid-router";
import { BookOpen, MessageSquare, Upload } from "lucide-solid";
import { For, Show } from "solid-js";
import { Button } from "~/components/ui/button";
import { useAuth } from "~/contexts/auth";

export const Route = createFileRoute("/")({ component: LandingPage });

function LandingPage() {
  const auth = useAuth();

  const features = [
    {
      icon: Upload,
      title: "Upload Documents",
      description:
        "Upload your text, markdown, or PDF files. Documents are automatically chunked and indexed for retrieval.",
    },
    {
      icon: MessageSquare,
      title: "AI-Powered Q&A",
      description:
        "Ask questions in natural language. The AI searches your documents and generates accurate answers with streaming responses.",
    },
    {
      icon: BookOpen,
      title: "Source Citations",
      description:
        "Every answer includes source citations with relevance scores, so you can verify the information directly.",
    },
  ];

  return (
    <div class="flex min-h-[calc(100vh-3.5rem)] flex-col">
      <section class="flex flex-1 flex-col items-center justify-center px-6 py-20 text-center">
        <h1 class="mb-4 text-5xl font-bold tracking-tight md:text-6xl">
          RAG <span class="text-primary">System</span>
        </h1>
        <p class="mx-auto mb-8 max-w-2xl text-lg text-muted-foreground">
          Upload your documents and ask questions powered by Retrieval-Augmented Generation. Get
          accurate, sourced answers from your own knowledge base.
        </p>
        <div class="flex gap-3">
          <Show
            when={auth.state.isAuthenticated}
            fallback={
              <>
                <Link to="/login">
                  <Button size="lg">Get Started</Button>
                </Link>
                <Link to="/register">
                  <Button variant="outline" size="lg">
                    Create Account
                  </Button>
                </Link>
              </>
            }
          >
            <Link to="/chat">
              <Button size="lg">
                <MessageSquare class="mr-2 size-5" />
                Go to Chat
              </Button>
            </Link>
          </Show>
        </div>
      </section>

      <section class="border-t bg-muted/30 px-6 py-16">
        <div class="mx-auto max-w-5xl">
          <h2 class="mb-10 text-center text-2xl font-bold">How it works</h2>
          <div class="grid gap-8 md:grid-cols-3">
            <For each={features}>
              {(feature) => (
                <div class="flex flex-col items-center text-center">
                  <div class="mb-4 flex size-14 items-center justify-center rounded-lg bg-primary/10">
                    <feature.icon class="size-7 text-primary" />
                  </div>
                  <h3 class="mb-2 text-lg font-semibold">{feature.title}</h3>
                  <p class="text-sm text-muted-foreground">{feature.description}</p>
                </div>
              )}
            </For>
          </div>
        </div>
      </section>
    </div>
  );
}
