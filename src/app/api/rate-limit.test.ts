import type { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const { getCloudflareContext } = vi.hoisted(() => ({ getCloudflareContext: vi.fn() }));
vi.mock("@opennextjs/cloudflare", () => ({ getCloudflareContext }));

import { checkRateLimit, checkSameOrigin } from "./rate-limit";

function request(headers: Record<string, string> = {}): NextRequest {
  return new Request("http://localhost/api/doi", { method: "POST", headers }) as unknown as NextRequest;
}

function limiterEnv(limit: (options: { key: string }) => Promise<{ success: boolean }>) {
  return { env: { API_RATE_LIMITER: { limit } } };
}

describe("checkRateLimit", () => {
  beforeEach(() => {
    getCloudflareContext.mockReset();
  });

  it("stays out of the way off Workers (next dev / next start)", async () => {
    getCloudflareContext.mockImplementation(() => {
      throw new Error("no workers context");
    });
    expect(await checkRateLimit(request())).toBeNull();
  });

  it("fails closed with a 503 when the binding is missing on Workers", async () => {
    // A renamed binding must be a visible fault, not an unthrottled proxy.
    getCloudflareContext.mockReturnValue({ env: {} });
    const errorLog = vi.spyOn(console, "error").mockImplementation(() => undefined);
    const response = await checkRateLimit(request());
    expect(response?.status).toBe(503);
    expect(await response?.json()).toMatchObject({ code: "UNAVAILABLE" });
    expect(errorLog).toHaveBeenCalledOnce();
    errorLog.mockRestore();
  });

  it("returns the 429 shape the client maps to RATE_LIMITED", async () => {
    getCloudflareContext.mockReturnValue(limiterEnv(async () => ({ success: false })));
    const response = await checkRateLimit(request());
    expect(response?.status).toBe(429);
    expect(await response?.json()).toMatchObject({ code: "RATE_LIMITED" });
  });

  it("keys on the edge-set client IP, first hop only, with a shared fallback bucket", async () => {
    const limit = vi.fn(async () => ({ success: true }));
    getCloudflareContext.mockReturnValue(limiterEnv(limit));

    expect(await checkRateLimit(request({ "cf-connecting-ip": "203.0.113.9" }))).toBeNull();
    expect(limit).toHaveBeenLastCalledWith({ key: "203.0.113.9" });

    await checkRateLimit(request({ "x-forwarded-for": "198.51.100.7, 203.0.113.9" }));
    expect(limit).toHaveBeenLastCalledWith({ key: "198.51.100.7" });

    // No address at all is one shared bucket, not a free pass per request.
    await checkRateLimit(request());
    expect(limit).toHaveBeenLastCalledWith({ key: "unknown" });
  });

  it("fails open when the limiter itself faults transiently", async () => {
    getCloudflareContext.mockReturnValue(limiterEnv(() => Promise.reject(new Error("limiter unavailable"))));
    const errorLog = vi.spyOn(console, "error").mockImplementation(() => undefined);
    expect(await checkRateLimit(request())).toBeNull();
    expect(errorLog).toHaveBeenCalledOnce();
    errorLog.mockRestore();
  });
});

describe("checkSameOrigin", () => {
  it("accepts same-origin and non-browser requests", () => {
    expect(checkSameOrigin(request())).toBeNull();
    expect(checkSameOrigin(request({ origin: "http://localhost", host: "localhost" }))).toBeNull();
  });

  it("rejects a cross-site browser request before it spends a rate bucket", async () => {
    const response = checkSameOrigin(request({ origin: "https://evil.example", host: "localhost" }));
    expect(response?.status).toBe(403);
    expect(await response?.json()).toMatchObject({ code: "FORBIDDEN" });
    // Sandboxed frames send the literal string "null"; nothing we serve.
    expect(checkSameOrigin(request({ origin: "null", host: "localhost" }))?.status).toBe(403);
  });
});
