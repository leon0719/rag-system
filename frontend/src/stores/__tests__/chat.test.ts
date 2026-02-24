import { createRoot } from "solid-js";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { createChatStore } from "../chat";

function createMockStream(chunks: string[]): ReadableStream<Uint8Array> {
  const encoder = new TextEncoder();
  let index = 0;
  return new ReadableStream({
    pull(controller) {
      if (index < chunks.length) {
        controller.enqueue(encoder.encode(chunks[index]));
        index++;
      } else {
        controller.close();
      }
    },
  });
}

describe("createChatStore", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("should initialize with empty state", () => {
    createRoot((dispose) => {
      const chat = createChatStore(() => null);
      expect(chat.state.messages).toEqual([]);
      expect(chat.state.isStreaming).toBe(false);
      expect(chat.state.streamingContent).toBe("");
      expect(chat.state.error).toBeNull();
      expect(chat.state.conversationId).toBeNull();
      dispose();
    });
  });

  it("should add user message on sendQuery", async () => {
    const stream = createMockStream([
      'event: conversation_id\ndata: "conv-1"\n\n',
      "event: sources\ndata: []\n\n",
      'event: delta\ndata: "response"\n\n',
      'event: done\ndata: {"full_text":"response"}\n\n',
    ]);

    vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(
      new Response(stream, { status: 200, headers: { "Content-Type": "text/event-stream" } }),
    );

    await createRoot(async (dispose) => {
      const chat = createChatStore(() => "token");

      chat.sendQuery("What is RAG?");

      // User message should be added immediately
      expect(chat.state.messages).toHaveLength(1);
      expect(chat.state.messages[0].role).toBe("user");
      expect(chat.state.messages[0].content).toBe("What is RAG?");
      expect(chat.state.isStreaming).toBe(true);

      // Wait for streaming to complete
      await vi.waitFor(() => expect(chat.state.isStreaming).toBe(false), { timeout: 2000 });

      expect(chat.state.messages).toHaveLength(2);
      expect(chat.state.messages[1].role).toBe("assistant");
      expect(chat.state.messages[1].content).toBe("response");
      expect(chat.state.conversationId).toBe("conv-1");

      dispose();
    });
  });

  it("should not send query while streaming", () => {
    createRoot((dispose) => {
      const chat = createChatStore(() => null);

      const stream = createMockStream([]);
      vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(new Response(stream, { status: 200 }));

      chat.sendQuery("first");
      expect(chat.state.isStreaming).toBe(true);

      chat.sendQuery("second");
      // Only one user message should exist
      expect(chat.state.messages).toHaveLength(1);

      dispose();
    });
  });

  it("should handle errors", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(
      new Response(JSON.stringify({ detail: "Server error" }), { status: 500 }),
    );

    await createRoot(async (dispose) => {
      const chat = createChatStore(() => "token");

      chat.sendQuery("test");

      await vi.waitFor(() => expect(chat.state.error).toBe("Server error"));
      expect(chat.state.isStreaming).toBe(false);

      dispose();
    });
  });

  it("should handle rate limiting", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(
      new Response(JSON.stringify({ detail: "Too many requests" }), { status: 429 }),
    );

    await createRoot(async (dispose) => {
      const chat = createChatStore(() => "token");

      chat.sendQuery("test");

      await vi.waitFor(() => expect(chat.state.isRateLimited).toBe(true));
      expect(chat.state.error).toBe("Too many requests");

      dispose();
    });
  });

  it("should clear messages", () => {
    createRoot((dispose) => {
      const chat = createChatStore(() => null);

      chat.loadMessages([{ id: "1", role: "user", content: "test", timestamp: Date.now() }]);
      chat.setConversationId("conv-1");
      expect(chat.state.messages).toHaveLength(1);

      chat.clearMessages();
      expect(chat.state.messages).toEqual([]);
      expect(chat.state.conversationId).toBeNull();

      dispose();
    });
  });

  it("should load messages", () => {
    createRoot((dispose) => {
      const chat = createChatStore(() => null);

      const messages = [
        { id: "1", role: "user" as const, content: "hello", timestamp: Date.now() },
        { id: "2", role: "assistant" as const, content: "hi", timestamp: Date.now() },
      ];
      chat.loadMessages(messages);

      expect(chat.state.messages).toHaveLength(2);
      expect(chat.state.messages[0].content).toBe("hello");
      expect(chat.state.messages[1].content).toBe("hi");

      dispose();
    });
  });

  it("should include conversation_id in request body when set", () => {
    createRoot((dispose) => {
      const chat = createChatStore(() => "token");
      chat.setConversationId("existing-conv");

      const stream = createMockStream([]);
      const fetchSpy = vi
        .spyOn(globalThis, "fetch")
        .mockResolvedValueOnce(new Response(stream, { status: 200 }));

      chat.sendQuery("follow-up question");

      const body = JSON.parse(fetchSpy.mock.calls[0][1]?.body as string);
      expect(body.conversation_id).toBe("existing-conv");

      dispose();
    });
  });

  it("should call onConversationCreated callback", async () => {
    const stream = createMockStream([
      'event: conversation_id\ndata: "new-conv-123"\n\n',
      "event: sources\ndata: []\n\n",
      'event: done\ndata: {"full_text":""}\n\n',
    ]);

    vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(
      new Response(stream, { status: 200, headers: { "Content-Type": "text/event-stream" } }),
    );

    await createRoot(async (dispose) => {
      const chat = createChatStore(() => "token");
      const onCreated = vi.fn();

      chat.sendQuery({ question: "test", onConversationCreated: onCreated });

      await vi.waitFor(() => expect(onCreated).toHaveBeenCalledWith("new-conv-123"));

      dispose();
    });
  });

  it("should accept auth object with getToken/setToken/onAuthFailure", () => {
    createRoot((dispose) => {
      const chat = createChatStore({
        getToken: () => "token",
        setToken: () => {},
        onAuthFailure: () => {},
      });

      expect(chat.state.messages).toEqual([]);
      dispose();
    });
  });
});
