import type { SSEEvent } from "~/types/chat";
import { API_BASE_URL } from "./constants";

interface FetchSSEOptions {
  token: string | null;
  getToken?: () => string | null;
  setToken?: (token: string | null) => void;
  onAuthFailure?: () => void;
  signal?: AbortSignal;
  onEvent: (event: SSEEvent) => void;
  onError: (error: string, status?: number) => void;
  onDone: () => void;
}

async function refreshAccessToken(): Promise<string | null> {
  try {
    const res = await fetch(`${API_BASE_URL}/auth/refresh`, {
      method: "POST",
      credentials: "include",
    });
    if (!res.ok) return null;
    const data = await res.json();
    return data.access as string;
  } catch {
    return null;
  }
}

async function doFetch(
  url: string,
  body: string,
  token: string | null,
  signal?: AbortSignal,
): Promise<Response> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    Accept: "text/event-stream",
  };
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }
  return fetch(url, {
    method: "POST",
    headers,
    body,
    credentials: "include",
    signal,
  });
}

export async function fetchSSE(
  path: string,
  body: Record<string, unknown>,
  options: FetchSSEOptions,
) {
  const { signal, onEvent, onError, onDone } = options;
  const url = `${API_BASE_URL}${path}`;
  const bodyStr = JSON.stringify(body);

  let res: Response;
  try {
    res = await doFetch(url, bodyStr, options.token, signal);
  } catch {
    if (signal?.aborted) return;
    onError("Network error");
    return;
  }

  // Auto-refresh token on 401, then retry once
  if (res.status === 401 && options.getToken) {
    const newToken = await refreshAccessToken();
    if (newToken) {
      options.setToken?.(newToken);
      try {
        res = await doFetch(url, bodyStr, newToken, signal);
      } catch {
        if (signal?.aborted) return;
        onError("Network error");
        return;
      }
    } else {
      options.onAuthFailure?.();
      onError("Authentication failed", 401);
      return;
    }
  }

  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: "Request failed" }));
    onError(err.detail, res.status);
    return;
  }

  const reader = res.body?.getReader();
  if (!reader) {
    onError("No response body");
    return;
  }

  const decoder = new TextDecoder();
  let buffer = "";

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split("\n");
      buffer = lines.pop() ?? "";

      let currentEvent = "";
      for (const line of lines) {
        if (line.startsWith("event: ")) {
          currentEvent = line.slice(7).trim();
        } else if (line.startsWith("data: ") && currentEvent) {
          const rawData = line.slice(6);
          try {
            const parsed = parseSSEData(currentEvent, rawData);
            if (parsed) onEvent(parsed);
          } catch {
            onError("Failed to parse SSE data");
          }
          currentEvent = "";
        } else if (line.trim() === "") {
          currentEvent = "";
        }
      }
    }
  } catch {
    if (signal?.aborted) return;
    onError("Stream error");
  } finally {
    reader.releaseLock();
    onDone();
  }
}

function parseSSEData(event: string, rawData: string): SSEEvent | null {
  switch (event) {
    case "conversation_id": {
      let id: string;
      try {
        id = JSON.parse(rawData);
      } catch {
        id = rawData.trim();
      }
      return { event: "conversation_id", data: id };
    }
    case "sources":
      return { event: "sources", data: JSON.parse(rawData) };
    case "delta": {
      let text: string;
      try {
        text = JSON.parse(rawData);
      } catch {
        text = rawData;
      }
      return { event: "delta", data: text };
    }
    case "usage":
      return { event: "usage", data: JSON.parse(rawData) };
    case "done":
      return { event: "done", data: JSON.parse(rawData) };
    case "error":
      return { event: "error", data: JSON.parse(rawData) };
    default:
      return null;
  }
}
