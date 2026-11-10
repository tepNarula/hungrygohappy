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

/** XHR context belongs on the entity-list request, not on a shortlink navigation. */
export const LIST_HEADERS: Record<string, string> = {
  Accept: "*/*",
  Referer: "https://www.google.com/maps/",
  "sec-fetch-dest": "empty",
  "sec-fetch-mode": "cors",
  "sec-fetch-site": "same-origin",
};

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/** Bound retries and respect Retry-After without letting a provider stall indefinitely. */
export function retryDelay(attempt: number, retryAfter: string | null, now = Date.now()): number {
  const seconds = retryAfter == null ? NaN : Number(retryAfter);
  const providerDelay = Number.isFinite(seconds) ? seconds * 1000 : retryAfter ? Date.parse(retryAfter) - now : 0;
  const backoff = 1000 * 2 ** attempt + Math.floor(Math.random() * 500);
  return Math.min(10_000, Math.max(backoff, Number.isFinite(providerDelay) ? providerDelay : 0));
}

/** Four bounded attempts with browser headers, jitter and per-request timeouts. */
export async function politeFetch(url: string, init: RequestInit = {}, attempts = 4): Promise<Response> {
  let last: Response | null = null;
  for (let i = 0; i < attempts; i++) {
    const headers = new Headers(BROWSER_HEADERS);
    new Headers(init.headers).forEach((value, key) => headers.set(key, value));
    const res = await fetch(url, { ...init, headers, signal: init.signal ?? AbortSignal.timeout(15_000) });
    if (res.status !== 429 && res.status < 500) return res;
    last = res;
    if (i < attempts - 1) {
      const delay = retryDelay(i, res.headers.get("retry-after"));
      await res.body?.cancel();
      await sleep(delay);
    }
  }
  if (last?.status === 429) {
    await last.body?.cancel();
    throw new RateLimitedError("rate limited");
  }
  if (!last) throw new Error("No fetch attempts performed");
  return last;
}

export function extractListId(url: string): string | undefined {
  return url.match(/!11m\d+!2s([A-Za-z0-9_-]{8,})/)?.[1] ?? url.match(/placelists\/list\/([A-Za-z0-9_-]+)/)?.[1];
}

export interface ListPlace { url: string; name: string; address?: string | undefined; placeId?: string | undefined }

/**
 * Convert Google's pair of signed 64-bit decimal integers into its canonical place ID.
 * BigInt#toString preserves a minus sign, so explicitly reinterpreting each value as an
 * unsigned 64-bit integer is essential for IDs whose highest bit is set.
 */
export function toHexId(pair: unknown): string | undefined {
  // Google stores the two ID halves as a two-element array; ignore malformed payloads.
  if (!Array.isArray(pair) || pair.length < 2) return undefined;
  try {
    // asUintN performs two's-complement wrapping instead of producing strings like "0x-abc".
    const high = BigInt.asUintN(64, BigInt(String(pair[0]))).toString(16);
    const low = BigInt.asUintN(64, BigInt(String(pair[1]))).toString(16);
    return `0x${high}:0x${low}`;
  } catch {
    // A non-numeric half cannot identify a place, so let the caller use its URL fallback.
    return undefined;
  }
}

/**
 * Normalize canonical IDs and legacy IDs containing a signed hexadecimal half.
 * This keeps places imported before the unsigned conversion fix usable without migration.
 */
export function normalizePlaceId(value: unknown): string | undefined {
  // Each half contains at most 64 bits; an optional minus sign marks a legacy signed value.
  const match = typeof value === "string" ? value.match(/^0x(-?[0-9a-f]{1,16}):0x(-?[0-9a-f]{1,16})$/i) : null;
  if (!match) return undefined;
  try {
    // Parse each half independently, wrapping negative legacy values back to unsigned 64-bit form.
    const halves = [match[1]!, match[2]!].map((part) => {
      const parsed = part.startsWith("-") ? -BigInt(`0x${part.slice(1)}`) : BigInt(`0x${part}`);
      return BigInt.asUintN(64, parsed).toString(16);
    });
    return `0x${halves[0]}:0x${halves[1]}`;
  } catch {
    // Defensive fallback for values that pass the shape check but fail numeric parsing.
    return undefined;
  }
}

const SHORT_HOSTS = new Set(["maps.app.goo.gl", "goo.gl"]);

/**
 * Expand a Google shortlink by reading the redirect Location header only (redirect: "manual"),
 * so we never download the heavy Maps web app (which triggers 429s on datacenter IPs).
 */
export async function expandShortlink(url: string): Promise<string> {
  let current = url;
  for (let hop = 0; hop < 4; hop++) {
    const host = new URL(current).hostname.toLowerCase();
    if (!SHORT_HOSTS.has(host)) return current;
    const res = await politeFetch(current, { redirect: "manual" });
    const loc = res.headers.get("location");
    await res.body?.cancel();
    if (!loc) throw new Error("Google Maps did not return a redirect");
    const next = new URL(loc, current);
    if (next.protocol !== "https:" || !/^(?:maps\.app\.goo\.gl|goo\.gl|(?:www\.|maps\.)?google\.[a-z.]+)$/.test(next.hostname)) {
      throw new Error("Invalid Google Maps redirect");
    }
    current = next.toString();
  }
  throw new Error("Too many Google Maps redirects");
}

export async function fetchGmapsList(listId: string): Promise<{ title?: string | undefined; places: ListPlace[] }> {
  const api = `https://www.google.com/maps/preview/entitylist/getlist?hl=en&pb=!1m4!1s${listId}!2e1!3m1!1e1!2e2!3e2!4i500!16b1`;
  const res = await politeFetch(api, { headers: LIST_HEADERS });
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
    const info = item?.[1];
    const coords = info?.[5];
    const lat = coords?.[2];
    const lng = coords?.[3];
    if (!name) return [];
    const url =
      typeof lat === "number" && typeof lng === "number"
        ? `https://www.google.com/maps/place/${encodeURIComponent(name)}/@${lat},${lng},17z`
        : `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(name)}`;
    const address = typeof info?.[4] === "string" && info[4] ? info[4] : undefined;
    return [{ url, name, address, placeId: toHexId(info?.[6]) }];
  });
  if (places.length === 0) throw new ListNotFoundError("empty");
  return { title: typeof json?.[0]?.[4] === "string" ? json[0][4] : undefined, places };
}

// ---------- Opening hours ----------

import type { DayHours, PlaceHours } from "@/lib/opening-hours";

const DAY_INDEX: Record<string, number> = { Monday: 1, Tuesday: 2, Wednesday: 3, Thursday: 4, Friday: 5, Saturday: 6, Sunday: 7 };

function isWeek(node: unknown): node is any[][] {
  return Array.isArray(node) && node.length === 7 && node.every((d) => Array.isArray(d) && typeof d[0] === "string" && d[0] in DAY_INDEX && typeof d[1] === "number");
}

/** First weekly-hours block that is not labeled (e.g. not "Delivery"/"Takeout" hours). */
function findWeek(node: unknown, labeled = false): any[][] | null {
  if (!Array.isArray(node)) return null;
  if (isWeek(node)) return labeled ? null : node;
  const isLabel = typeof node[0] === "string" && node[1] === null && node[2] === null && Array.isArray(node[3]);
  for (const child of node) {
    const hit = findWeek(child, labeled || isLabel);
    if (hit) return hit;
  }
  return null;
}

const toMin = (t: unknown) => (Array.isArray(t) ? (Number(t[0]) || 0) * 60 + (Number(t[1]) || 0) : NaN);

export function parsePlaceHours(text: string): PlaceHours {
  let json: unknown;
  try {
    json = JSON.parse(text.replace(/^\)\]\}'\s*/, ""));
  } catch {
    return { state: "unknown", week: [] };
  }
  const state = /"Permanently closed"/.test(text) ? "permanently_closed" : /"Temporarily closed"/.test(text) ? "temporarily_closed" : "operational";
  const week: DayHours[] = (findWeek(json) ?? []).map((d) => {
    const intervals: Array<[number, number]> = [];
    for (const slot of (Array.isArray(d[3]) ? d[3] : []) as any[]) {
      const label = String(slot?.[0] ?? "");
      if (/24 hours/i.test(label)) { intervals.push([0, 1440]); continue; }
      const times = slot?.[1];
      if (!Array.isArray(times) || times.length < 2) continue;
      const s = toMin(times[0]);
      let e = toMin(times[1]);
      if (!Number.isFinite(s) || !Number.isFinite(e)) continue;
      if (e <= s) e += 1440;
      intervals.push([s, e]);
    }
    return { day: DAY_INDEX[d[0]]!, intervals };
  });
  return { state: week.length ? state : state === "operational" ? "unknown" : state, week };
}

/** Look up a place's weekly hours via its Google feature id (found in list data or the place URL). */
export async function fetchPlaceHours(url: string, placeId?: string): Promise<PlaceHours | null> {
  // Normalize stored IDs first so both fixed and legacy imports produce a valid Google request.
  let id = normalizePlaceId(placeId)
    ?? normalizePlaceId(url.match(/!1s(0x[0-9a-f]+:0x[0-9a-f]+)/i)?.[1])
    ?? normalizePlaceId(url.match(/[?&]ftid=(0x[0-9a-f]+:0x[0-9a-f]+)/i)?.[1]);
  if (!id && SHORT_HOSTS.has(new URL(url).hostname)) {
    // A shortlink hides its feature ID until Google returns the canonical destination URL.
    const expanded = await expandShortlink(url);
    id = normalizePlaceId(expanded.match(/!1s(0x[0-9a-f]+:0x[0-9a-f]+)/i)?.[1])
      ?? normalizePlaceId(expanded.match(/[?&]ftid=(0x[0-9a-f]+:0x[0-9a-f]+)/i)?.[1]);
  }
  if (!id) {
    // Diagnostics distinguish an unusable stored ID from a provider-side response failure.
    console.error("place hours: no usable feature ID", { url, placeId });
    return null;
  }
  // Fetch the compact place page, which contains the endpoint for the weekly-hours payload.
  const page = await politeFetch(`https://www.google.com/maps/place/data=!4m2!3m1!1s${id}?hl=en`);
  if (!page.ok) {
    console.error("place hours: place page failed", { id, status: page.status });
    return null;
  }
  const html = await page.text();
  // Google embeds a fully parameterized detail endpoint in the place page markup.
  const preview = html.match(/preview\/place\?[^"]+/)?.[0]?.replace(/&amp;/g, "&");
  if (!preview) {
    console.error("place hours: preview endpoint missing", { id, htmlLength: html.length });
    return null;
  }
  const res = await politeFetch(`https://www.google.com/maps/${preview}`);
  if (!res.ok) {
    console.error("place hours: preview request failed", { id, status: res.status });
    return null;
  }
  return parsePlaceHours(await res.text());
}
