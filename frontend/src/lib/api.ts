import { API_BASE_URL } from "./constants";

export class ApiClientError extends Error {
  constructor(
    public status: number,
    public detail: string,
  ) {
    super(detail);
    this.name = "ApiClientError";
  }
}

interface AuthConfig {
  getToken: () => string | null;
  setToken: (token: string | null) => void;
  onFailure: () => void;
}

let authConfig: AuthConfig | null = null;

export function configureAuth(config: AuthConfig) {
  authConfig = config;
}

let isRefreshing = false;
let refreshPromise: Promise<string | null> | null = null;

async function refreshToken(): Promise<string | null> {
  if (isRefreshing && refreshPromise) {
    return refreshPromise;
  }

  isRefreshing = true;
  refreshPromise = (async () => {
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
    } finally {
      isRefreshing = false;
      refreshPromise = null;
    }
  })();

  return refreshPromise;
}

export async function apiFetch<T>(
  path: string,
  options: RequestInit & { skipAuth?: boolean } = {},
): Promise<T> {
  const { skipAuth, ...fetchOptions } = options;

  const headers = new Headers(fetchOptions.headers);

  if (!skipAuth && authConfig) {
    const token = authConfig.getToken();
    if (token) {
      headers.set("Authorization", `Bearer ${token}`);
    }
  }

  if (!(fetchOptions.body instanceof FormData) && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }

  const res = await fetch(`${API_BASE_URL}${path}`, {
    ...fetchOptions,
    headers,
    credentials: "include",
  });

  if (res.status === 401 && !skipAuth && authConfig) {
    const newToken = await refreshToken();
    if (newToken) {
      authConfig.setToken(newToken);
      headers.set("Authorization", `Bearer ${newToken}`);
      const retryRes = await fetch(`${API_BASE_URL}${path}`, {
        ...fetchOptions,
        headers,
        credentials: "include",
      });
      if (!retryRes.ok) {
        const err = await retryRes.json().catch(() => ({ detail: "Request failed" }));
        throw new ApiClientError(retryRes.status, err.detail);
      }
      if (retryRes.status === 204) return undefined as T;
      return retryRes.json();
    }
    authConfig.onFailure();
    throw new ApiClientError(401, "Authentication failed");
  }

  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: "Request failed" }));
    throw new ApiClientError(res.status, err.detail);
  }

  if (res.status === 204) return undefined as T;
  return res.json();
}
