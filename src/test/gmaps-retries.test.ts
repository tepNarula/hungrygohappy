/** Exercise provider throttling without sending real requests or waiting on timers. */
import { afterEach, describe, expect, it, vi } from "vitest";
import { LIST_HEADERS, RateLimitedError, fetchGmapsList, politeFetch, retryDelay } from "@/lib/gmaps-core";

/** Restore global fetch and clocks so retry tests cannot influence other suites. */
afterEach(() => { vi.useRealTimers(); vi.restoreAllMocks(); vi.unstubAllGlobals(); });

describe("Google Maps resilience", () => {
  it("makes four attempts for persistent HTTP 429 and then reports busy", async () => {
    vi.useFakeTimers();
    const fetchMock = vi.fn(async () => new Response("busy", { status: 429 }));
    vi.stubGlobal("fetch", fetchMock);
    const request = politeFetch("https://www.google.com/maps/");
    const rejection = expect(request).rejects.toBeInstanceOf(RateLimitedError);
    await vi.runAllTimersAsync();
    await rejection;
    expect(fetchMock).toHaveBeenCalledTimes(4);
  });

  it("uses extended exponential delays of 1000, 2000 and 4000ms before jitter", () => {
    vi.spyOn(Math, "random").mockReturnValue(0);
    expect([0, 1, 2].map((attempt) => retryDelay(attempt, null))).toEqual([1000, 2000, 4000]);
    expect(retryDelay(0, "3")).toBe(3000);
    expect(retryDelay(0, "300")).toBe(10000);
  });

  it("applies Maps XHR context to list fetches and preserves Headers overrides", async () => {
    const fetchMock = vi.fn(async () => new Response('[[null,null,null,null,"Lunch",null,null,null,[[null,[null,null,null,null,"Bangkok",[null,null,13.7,100.5]],"Cafe"]]]]'));
    vi.stubGlobal("fetch", fetchMock);
    expect((await fetchGmapsList("test-list-id")).places).toHaveLength(1);
    const first = fetchMock.mock.calls[0] as unknown as [string, RequestInit];
    const headers = new Headers(first[1].headers);
    for (const [key, value] of Object.entries(LIST_HEADERS)) expect(headers.get(key)).toBe(value);
    await politeFetch("https://www.google.com/maps/", { headers: new Headers({ Accept: "application/json" }) });
    const second = fetchMock.mock.calls[1] as unknown as [string, RequestInit];
    expect(new Headers(second[1].headers).get("accept")).toBe("application/json");
  });
});