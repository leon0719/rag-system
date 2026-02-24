import { batch } from "solid-js";
import { createStore } from "solid-js/store";
import { fetchSSE } from "~/lib/sse";
import type { ChatMessage, ChatState, Source, SSEEvent, Usage } from "~/types/chat";

export function createChatStore(getToken: () => string | null) {
  const [state, setState] = createStore<ChatState>({
    messages: [],
    isStreaming: false,
    streamingContent: "",
    streamingSources: [],
    error: null,
  });

  let abortController: AbortController | null = null;

  function sendQuery(question: string, topK?: number) {
    if (state.isStreaming) return;

    const userMessage: ChatMessage = {
      id: crypto.randomUUID(),
      role: "user",
      content: question,
      timestamp: Date.now(),
    };

    batch(() => {
      setState("messages", (prev) => [...prev, userMessage]);
      setState("isStreaming", true);
      setState("streamingContent", "");
      setState("streamingSources", []);
      setState("error", null);
    });

    abortController = new AbortController();

    let accumulatedContent = "";
    let sources: Source[] = [];
    let usage: Usage | undefined;

    fetchSSE(
      "/chat/query",
      { question, top_k: topK },
      {
        token: getToken(),
        signal: abortController.signal,
        onEvent: (event: SSEEvent) => {
          switch (event.event) {
            case "sources":
              sources = event.data;
              setState("streamingSources", event.data);
              break;
            case "delta":
              accumulatedContent += event.data;
              setState("streamingContent", accumulatedContent);
              break;
            case "usage":
              usage = event.data;
              break;
            case "done": {
              const assistantMessage: ChatMessage = {
                id: crypto.randomUUID(),
                role: "assistant",
                content: event.data.full_text,
                sources,
                usage,
                timestamp: Date.now(),
              };
              batch(() => {
                setState("messages", (prev) => [...prev, assistantMessage]);
                setState("isStreaming", false);
                setState("streamingContent", "");
                setState("streamingSources", []);
              });
              break;
            }
            case "error":
              batch(() => {
                setState("error", event.data.detail);
                setState("isStreaming", false);
              });
              break;
          }
        },
        onError: (error: string) => {
          batch(() => {
            setState("error", error);
            setState("isStreaming", false);
          });
        },
        onDone: () => {
          abortController = null;
        },
      },
    );
  }

  function cancelStream() {
    abortController?.abort();
    batch(() => {
      setState("isStreaming", false);
      if (state.streamingContent) {
        const partialMessage: ChatMessage = {
          id: crypto.randomUUID(),
          role: "assistant",
          content: state.streamingContent,
          sources: state.streamingSources.length > 0 ? [...state.streamingSources] : undefined,
          timestamp: Date.now(),
        };
        setState("messages", (prev) => [...prev, partialMessage]);
      }
      setState("streamingContent", "");
      setState("streamingSources", []);
    });
  }

  function clearMessages() {
    batch(() => {
      setState("messages", []);
      setState("error", null);
    });
  }

  return {
    state,
    sendQuery,
    cancelStream,
    clearMessages,
  };
}
