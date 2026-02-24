export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? "http://localhost:8002/api";

export const MAX_QUESTION_LENGTH = 2000;
export const CHAT_RATE_LIMIT_PER_MINUTE = 10;

export const queryKeys = {
  auth: {
    me: () => ["auth", "me"] as const,
  },
  conversations: {
    all: () => ["conversations"] as const,
    lists: () => ["conversations", "list"] as const,
    list: (page: number, pageSize: number) => ["conversations", "list", page, pageSize] as const,
    detail: (id: string) => ["conversations", "detail", id] as const,
  },
  documents: {
    list: (page: number, pageSize: number) => ["documents", "list", page, pageSize] as const,
    detail: (id: string) => ["documents", "detail", id] as const,
  },
};
