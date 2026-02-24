export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? "http://localhost:8002/api";

export const queryKeys = {
  auth: {
    me: () => ["auth", "me"] as const,
  },
  documents: {
    list: (page: number, pageSize: number) => ["documents", "list", page, pageSize] as const,
    detail: (id: string) => ["documents", "detail", id] as const,
  },
};
