export interface Source {
  document_id: string;
  filename: string;
  chunk_index: number;
  content: string;
  score: number;
}

export interface Usage {
  prompt_tokens: number;
  completion_tokens: number;
  total_tokens: number;
}

export type SSEEvent =
  | { event: "sources"; data: Source[] }
  | { event: "delta"; data: string }
  | { event: "usage"; data: Usage }
  | { event: "done"; data: { full_text: string } }
  | { event: "error"; data: { detail: string } };

export interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  sources?: Source[];
  usage?: Usage;
  timestamp: number;
}

export interface ChatState {
  messages: ChatMessage[];
  isStreaming: boolean;
  streamingContent: string;
  streamingSources: Source[];
  error: string | null;
}

export interface ChatQueryRequest {
  question: string;
  top_k?: number;
}
