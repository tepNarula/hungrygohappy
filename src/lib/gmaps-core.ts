/** Server-side Google Maps fetching helpers (used by the resolver and the daily refresh). */

export const BROWSER_HEADERS: Record<string, string> = {
  "User-Agent":
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36",
  Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
  "Accept-Language": "en-US,en;q=0.9",
  "sec-ch-ua": '"Chromium";v="130", "Google Chrome";v="130", "Not?A_Brand";v="99"',
  "sec-ch-ua-mobile": "?0",
  "sec-ch-ua-platform": '"Windows"',
};

export class RateLimitedError extends Error {}
export class ListNotFoundError extends Error {}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/** fetch with browser-like headers; retries on 429/5xx with backoff. */
export async function politeFetch(url: string, init: RequestInit = {}, attempts = 3): Promise<Response> {
  let last: Response | null = null;
  for (let i = 0; i < attempts; i++) {
    const res = await fetch(url, { ...init, headers: { ...BROWSER_HEADERS, ...(init.headers ?? {}) } });
    if (res.status !== 429 && res.status < 500) return res;
    last = res;
    if (i < attempts - 1) await sleep(800 * 2 ** i);
  }
  if (last?.status === 429) throw new RateLimitedError("rate limited");
  return last!;
}

export function extractListId(url: string): string | undefined {
  return url.match(/!11m\d+!2s([A-Za-z0-9_-]{8,})/)?.[1] ?? url.match(/placelists\/list\/([A-Za-z0-9_-]+)/)?.[1];
}

export interface ListPlace { url: string; name: string }

export async function fetchGmapsList(listId: string): Promise<{ title?: string | undefined; places: ListPlace[] }> {
  const api = `https://www.google.com/maps/preview/entitylist/getlist?hl=en&pb=!1m4!1s${listId}!2e1!3m1!1e1!2e2!3e2!4i500!16b1`;
  const res = await politeFetch(api);
  if (!res.ok) throw new ListNotFoundError(`status ${res.status}`);
  const text = await res.text();
  let json: any;
  try {
    json = JSON.parse(text.replace(/^\)\]\}'\s*/, ""));
  } catch {
    throw new ListNotFoundError("unparseable");
  }
  const items: unknown[] = json?.[0]?.[8] ?? [];
  const places = items.flatMap((it) => {
    const item = it as any[];
    const name: string | undefined = typeof item?.[2] === "string" ? item[2] : undefined;
    const coords = item?.[1]?.[5];
    const lat = coords?.[2];
    const lng = coords?.[3];
    if (!name) return [];
    const url =
      typeof lat === "number" && typeof lng === "number"
        ? `https://www.google.com/maps/place/${encodeURIComponent(name)}/@${lat},${lng},17z`
        : `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(name)}`;
    return [{ url, name }];
  });
  if (places.length === 0) throw new ListNotFoundError("empty");
  return { title: typeof json?.[0]?.[4] === "string" ? json[0][4] : undefined, places };
}
