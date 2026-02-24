import { batch } from "solid-js";
import { createStore } from "solid-js/store";
import { fetchSSE } from "~/lib/sse";
import type { ChatMessage, ChatState, Source, SSEEvent, Usage } from "~/types/chat";

interface SendQueryOptions {
  question: string;
  topK?: number;
  onConversationCreated?: (id: string) => void;
}

export function createChatStore(getToken: () => string | null) {
  const [state, setState] = createStore<ChatState & { conversationId: string | null }>({
    messages: [],
    isStreaming: false,
    streamingContent: "",
    streamingSources: [],
    error: null,
    isRateLimited: false,
    conversationId: null,
  });

  let abortController: AbortController | null = null;

  function sendQuery(questionOrOptions: string | SendQueryOptions, topK?: number) {
    if (state.isStreaming) return;

    let question: string;
    let resolvedTopK: number | undefined;
    let onConversationCreated: ((id: string) => void) | undefined;

    if (typeof questionOrOptions === "string") {
      question = questionOrOptions;
      resolvedTopK = topK;
    } else {
      question = questionOrOptions.question;
      resolvedTopK = questionOrOptions.topK;
      onConversationCreated = questionOrOptions.onConversationCreated;
    }

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
      setState("isRateLimited", false);
    });

    abortController = new AbortController();

    let accumulatedContent = "";
    let sources: Source[] = [];
    let usage: Usage | undefined;

    const body: Record<string, unknown> = {
      question,
      top_k: resolvedTopK,
    };
    if (state.conversationId) {
      body.conversation_id = state.conversationId;
    }

    fetchSSE("/chat/query", body, {
      token: getToken(),
      signal: abortController.signal,
      onEvent: (event: SSEEvent) => {
        switch (event.event) {
          case "conversation_id": {
            setState("conversationId", event.data);
            onConversationCreated?.(event.data);
            break;
          }
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
      onError: (error: string, status?: number) => {
        batch(() => {
          setState("error", error);
          setState("isRateLimited", status === 429);
          setState("isStreaming", false);
        });
      },
      onDone: () => {
        abortController = null;
      },
    });
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
      setState("conversationId", null);
      setState("error", null);
      setState("isRateLimited", false);
    });
  }

  function loadMessages(messages: ChatMessage[]) {
    setState("messages", messages);
  }

  function setConversationId(id: string | null) {
    setState("conversationId", id);
  }

  return {
    state,
    sendQuery,
    cancelStream,
    clearMessages,
    loadMessages,
    setConversationId,
  };
}
