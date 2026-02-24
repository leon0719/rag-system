import { beforeEach, describe, expect, it, vi } from "vitest";
import { ApiClientError, apiFetch, configureAuth } from "../api";

describe("apiFetch", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("should make requests with correct URL and headers", async () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(
      new Response(JSON.stringify({ id: 1 }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }),
    );

    const result = await apiFetch<{ id: number }>("/test", { skipAuth: true });

    expect(result).toEqual({ id: 1 });
    const [url, options] = fetchSpy.mock.calls[0];
    expect(url).toContain("/test");
    expect(options?.credentials).toBe("include");
  });

  it("should include Authorization header when auth is configured", async () => {
    configureAuth({
      getToken: () => "test-token",
      setToken: () => {},
      onFailure: () => {},
    });

    const fetchSpy = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValueOnce(new Response(JSON.stringify({}), { status: 200 }));

    await apiFetch("/test");

    const [, options] = fetchSpy.mock.calls[0];
    const headers = options?.headers as Headers;
    expect(headers.get("Authorization")).toBe("Bearer test-token");
  });

  it("should throw ApiClientError on non-OK responses", async () => {
    configureAuth({
      getToken: () => null,
      setToken: () => {},
      onFailure: () => {},
    });

    vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(
      new Response(JSON.stringify({ detail: "Not found" }), { status: 404 }),
    );

    await expect(apiFetch("/missing", { skipAuth: true })).rejects.toThrow(ApiClientError);

    try {
      vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(
        new Response(JSON.stringify({ detail: "Not found" }), { status: 404 }),
      );
      await apiFetch("/missing", { skipAuth: true });
    } catch (e) {
      expect(e).toBeInstanceOf(ApiClientError);
      expect((e as ApiClientError).status).toBe(404);
      expect((e as ApiClientError).detail).toBe("Not found");
    }
  });

  it("should return undefined for 204 responses", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(new Response(null, { status: 204 }));

    const result = await apiFetch("/delete", { method: "DELETE", skipAuth: true });
    expect(result).toBeUndefined();
  });

  it("should not set Content-Type for FormData bodies", async () => {
    const fetchSpy = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValueOnce(new Response(JSON.stringify({}), { status: 200 }));

    const formData = new FormData();
    formData.append("file", new Blob(["content"]), "test.txt");

    await apiFetch("/upload", { method: "POST", body: formData, skipAuth: true });

    const [, options] = fetchSpy.mock.calls[0];
    const headers = options?.headers as Headers;
    expect(headers.has("Content-Type")).toBe(false);
  });

  it("should auto-refresh token on 401", async () => {
    const setToken = vi.fn();
    configureAuth({
      getToken: () => "expired-token",
      setToken,
      onFailure: () => {},
    });

    const fetchSpy = vi.spyOn(globalThis, "fetch");

    // Original request returns 401
    fetchSpy.mockResolvedValueOnce(
      new Response(JSON.stringify({ detail: "Unauthorized" }), { status: 401 }),
    );

    // Refresh returns new token
    fetchSpy.mockResolvedValueOnce(
      new Response(JSON.stringify({ access: "new-token" }), { status: 200 }),
    );

    // Retry succeeds
    fetchSpy.mockResolvedValueOnce(new Response(JSON.stringify({ data: "ok" }), { status: 200 }));

    const result = await apiFetch<{ data: string }>("/protected");

    expect(result).toEqual({ data: "ok" });
    expect(setToken).toHaveBeenCalledWith("new-token");
  });

  it("should call onFailure when refresh fails on 401", async () => {
    const onFailure = vi.fn();
    configureAuth({
      getToken: () => "expired-token",
      setToken: () => {},
      onFailure,
    });

    const fetchSpy = vi.spyOn(globalThis, "fetch");

    // Original request returns 401
    fetchSpy.mockResolvedValueOnce(
      new Response(JSON.stringify({ detail: "Unauthorized" }), { status: 401 }),
    );

    // Refresh fails
    fetchSpy.mockResolvedValueOnce(new Response(null, { status: 401 }));

    await expect(apiFetch("/protected")).rejects.toThrow(ApiClientError);
    expect(onFailure).toHaveBeenCalled();
  });
});
