import { batch, createContext, type JSX, onMount, useContext } from "solid-js";
import { createStore } from "solid-js/store";
import { apiFetch, configureAuth } from "~/lib/api";
import type { AuthState, LoginRequest, RegisterRequest, TokenResponse, User } from "~/types/auth";

interface AuthContextValue {
  state: AuthState;
  login: (data: LoginRequest) => Promise<void>;
  register: (data: RegisterRequest) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue>();

interface AuthProviderProps {
  children: JSX.Element;
}

export function AuthProvider(props: AuthProviderProps) {
  const [state, setState] = createStore<AuthState>({
    user: null,
    accessToken: null,
    isAuthenticated: false,
    isLoading: true,
  });

  async function fetchUser(token: string): Promise<void> {
    const user = await apiFetch<User>("/auth/me", {
      skipAuth: true,
      headers: { Authorization: `Bearer ${token}` },
    });
    batch(() => {
      setState("user", user);
      setState("isAuthenticated", true);
    });
  }

  async function login(data: LoginRequest): Promise<void> {
    const res = await apiFetch<TokenResponse>("/auth/login", {
      method: "POST",
      body: JSON.stringify(data),
      skipAuth: true,
    });
    setState("accessToken", res.access);
    await fetchUser(res.access);
  }

  async function register(data: RegisterRequest): Promise<void> {
    await apiFetch<void>("/auth/register", {
      method: "POST",
      body: JSON.stringify(data),
      skipAuth: true,
    });
  }

  async function logout(): Promise<void> {
    try {
      await apiFetch<void>("/auth/logout", { method: "POST" });
    } catch {
      // Ignore logout errors -- clear local state regardless
    }
    batch(() => {
      setState("user", null);
      setState("accessToken", null);
      setState("isAuthenticated", false);
      setState("isLoading", false);
    });
  }

  onMount(() => {
    configureAuth({
      getToken: () => state.accessToken,
      setToken: (token) => setState("accessToken", token),
      onFailure: () => logout(),
    });

    // Attempt silent refresh on app load
    (async () => {
      try {
        const res = await apiFetch<TokenResponse>("/auth/refresh", {
          method: "POST",
          skipAuth: true,
        });
        setState("accessToken", res.access);
        await fetchUser(res.access);
      } catch {
        // No valid refresh token -- user stays unauthenticated
      } finally {
        setState("isLoading", false);
      }
    })();
  });

  const contextValue: AuthContextValue = {
    state,
    login,
    register,
    logout,
  };

  return <AuthContext.Provider value={contextValue}>{props.children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
