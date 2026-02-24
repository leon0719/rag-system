export interface ConversationListItem {
  id: string;
  title: string;
  created_at: string;
  updated_at: string;
}

export interface PaginatedConversationList {
  items: ConversationListItem[];
  page: number;
  page_size: number;
  has_more: boolean;
}

import type { Source } from "./chat";

export interface MessageResponse {
  id: string;
  role: "user" | "assistant";
  content: string;
  sources: Source[] | null;
  prompt_tokens: number | null;
  completion_tokens: number | null;
  created_at: string;
}

export interface ConversationDetail {
  id: string;
  title: string;
  messages: MessageResponse[];
  created_at: string;
  updated_at: string;
}
