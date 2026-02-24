import { beforeEach, describe, expect, it, vi } from "vitest";
import { fetchSSE } from "../sse";

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

describe("fetchSSE", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("should parse SSE events correctly", async () => {
    const events: unknown[] = [];
    const stream = createMockStream([
      'event: conversation_id\ndata: "conv-123"\n\n',
      'event: sources\ndata: [{"document_id":"d1","filename":"test.txt","chunk_index":0,"content":"hello","score":0.9}]\n\n',
      'event: delta\ndata: "Hello"\n\n',
      'event: delta\ndata: " world"\n\n',
      'event: usage\ndata: {"prompt_tokens":10,"completion_tokens":5,"total_tokens":15}\n\n',
      'event: done\ndata: {"full_text":"Hello world"}\n\n',
    ]);

    vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(
      new Response(stream, {
        status: 200,
        headers: { "Content-Type": "text/event-stream" },
      }),
    );

    const done = new Promise<void>((resolve) => {
      fetchSSE(
        "/chat/query",
        { question: "test" },
        {
          token: "test-token",
          onEvent: (event) => events.push(event),
          onError: () => {},
          onDone: resolve,
        },
      );
    });

    await done;

    expect(events).toHaveLength(6);
    expect(events[0]).toEqual({ event: "conversation_id", data: "conv-123" });
    expect(events[1]).toEqual({
      event: "sources",
      data: [
        { document_id: "d1", filename: "test.txt", chunk_index: 0, content: "hello", score: 0.9 },
      ],
    });
    expect(events[2]).toEqual({ event: "delta", data: "Hello" });
    expect(events[3]).toEqual({ event: "delta", data: " world" });
    expect(events[4]).toEqual({
      event: "usage",
      data: { prompt_tokens: 10, completion_tokens: 5, total_tokens: 15 },
    });
    expect(events[5]).toEqual({ event: "done", data: { full_text: "Hello world" } });
  });

  it("should handle network errors", async () => {
    vi.spyOn(globalThis, "fetch").mockRejectedValueOnce(new Error("Network error"));

    let errorMsg = "";
    await new Promise<void>((resolve) => {
      fetchSSE(
        "/chat/query",
        { question: "test" },
        {
          token: null,
          onEvent: () => {},
          onError: (error) => {
            errorMsg = error;
            resolve();
          },
          onDone: resolve,
        },
      );
    });

    expect(errorMsg).toBe("Network error");
  });

  it("should handle HTTP error responses", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(
      new Response(JSON.stringify({ detail: "Rate limited" }), {
        status: 429,
        headers: { "Content-Type": "application/json" },
      }),
    );

    let errorMsg = "";
    let errorStatus: number | undefined;

    await new Promise<void>((resolve) => {
      fetchSSE(
        "/chat/query",
        { question: "test" },
        {
          token: "test-token",
          onEvent: () => {},
          onError: (error, status) => {
            errorMsg = error;
            errorStatus = status;
            resolve();
          },
          onDone: () => resolve(),
        },
      );
    });

    expect(errorMsg).toBe("Rate limited");
    expect(errorStatus).toBe(429);
  });

  it("should send Authorization header when token is provided", async () => {
    const stream = createMockStream(['event: done\ndata: {"full_text":""}\n\n']);
    const fetchSpy = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValueOnce(
        new Response(stream, { status: 200, headers: { "Content-Type": "text/event-stream" } }),
      );

    await new Promise<void>((resolve) => {
      fetchSSE(
        "/chat/query",
        { question: "test" },
        {
          token: "my-jwt-token",
          onEvent: () => {},
          onError: () => {},
          onDone: resolve,
        },
      );
    });

    const [, options] = fetchSpy.mock.calls[0];
    const headers = options?.headers as Record<string, string>;
    expect(headers.Authorization).toBe("Bearer my-jwt-token");
  });

  it("should refresh token on 401 when auth callbacks are provided", async () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch");

    // First call returns 401
    fetchSpy.mockResolvedValueOnce(
      new Response(JSON.stringify({ detail: "Unauthorized" }), { status: 401 }),
    );

    // Refresh call succeeds
    fetchSpy.mockResolvedValueOnce(
      new Response(JSON.stringify({ access: "new-token" }), { status: 200 }),
    );

    // Retry succeeds with a stream
    const stream = createMockStream(['event: done\ndata: {"full_text":"ok"}\n\n']);
    fetchSpy.mockResolvedValueOnce(
      new Response(stream, { status: 200, headers: { "Content-Type": "text/event-stream" } }),
    );

    const events: unknown[] = [];
    const setToken = vi.fn();

    const done = new Promise<void>((resolve) => {
      fetchSSE(
        "/chat/query",
        { question: "test" },
        {
          token: "expired-token",
          getToken: () => "expired-token",
          setToken,
          onAuthFailure: () => {},
          onEvent: (event) => events.push(event),
          onError: () => {},
          onDone: resolve,
        },
      );
    });

    await done;

    expect(setToken).toHaveBeenCalledWith("new-token");
    expect(events).toHaveLength(1);
    expect(events[0]).toEqual({ event: "done", data: { full_text: "ok" } });
  });

  it("should call onAuthFailure when refresh fails", async () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch");

    // First call returns 401
    fetchSpy.mockResolvedValueOnce(
      new Response(JSON.stringify({ detail: "Unauthorized" }), { status: 401 }),
    );

    // Refresh fails
    fetchSpy.mockResolvedValueOnce(new Response(null, { status: 401 }));

    const onAuthFailure = vi.fn();
    let errorMsg = "";

    await new Promise<void>((resolve) => {
      fetchSSE(
        "/chat/query",
        { question: "test" },
        {
          token: "expired-token",
          getToken: () => "expired-token",
          setToken: () => {},
          onAuthFailure,
          onEvent: () => {},
          onError: (error) => {
            errorMsg = error;
            resolve();
          },
          onDone: () => resolve(),
        },
      );
    });

    expect(onAuthFailure).toHaveBeenCalled();
    expect(errorMsg).toBe("Authentication failed");
  });

  it("should respect abort signal", async () => {
    const controller = new AbortController();
    controller.abort();

    vi.spyOn(globalThis, "fetch").mockRejectedValueOnce(new DOMException("Aborted", "AbortError"));

    let errorCalled = false;
    await new Promise<void>((resolve) => {
      fetchSSE(
        "/chat/query",
        { question: "test" },
        {
          token: null,
          signal: controller.signal,
          onEvent: () => {},
          onError: () => {
            errorCalled = true;
          },
          onDone: resolve,
        },
      );
      // Give it a tick to process
      setTimeout(resolve, 50);
    });

    expect(errorCalled).toBe(false);
  });
});
