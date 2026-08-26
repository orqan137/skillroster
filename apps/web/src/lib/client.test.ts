import { afterEach, describe, expect, it, vi } from "vitest";
import { fetchJson } from "./client.js";

afterEach(() => vi.unstubAllGlobals());

describe("web API client", () => {
  it("preserves structured API errors", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(JSON.stringify({ error: "충돌", code: "GIT_CONFLICT", requestId: "req-1" }), { status: 409, headers: { "content-type": "application/json" } })));
    const error = await fetchJson("/api/test").catch((caught: unknown) => caught);
    expect(error).toMatchObject({ name: "ApiError", message: "충돌", status: 409, code: "GIT_CONFLICT", requestId: "req-1" });
  });

  it("turns malformed server responses into an actionable client error", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response("not-json", { status: 502 })));
    await expect(fetchJson("/api/test")).rejects.toMatchObject({ code: "INVALID_SERVER_RESPONSE", status: 502 });
  });
});
