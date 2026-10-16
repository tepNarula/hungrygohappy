export interface Restaurant {
  /** Primary key: the Google Maps URL. */
  id: string;
  googleMapsUrl: string;
  /** Optional display name; auto-derived from the URL when missing. */
  name?: string | undefined;
  visits?: number | undefined;
  lastVisitedAt?: string | undefined;
  /** Individual visit timestamps for rolling visit counts. */
  visitDates?: string[] | undefined;
}

export const DEFAULT_RESTAURANTS: Restaurant[] = [];

const STORAGE_KEY = "hungry-roulette-restaurants";

/** Best-effort restaurant name extraction from a Google Maps URL. */
export function nameFromGmapsUrl(link: string): string | null {
  try {
    const url = new URL(link);
    // /maps/place/Some+Name/...
    const placeMatch = url.pathname.match(/\/place\/([^/]+)/);
    if (placeMatch?.[1]) {
      return decodeURIComponent(placeMatch[1]).replace(/\+/g, " ").trim();
    }
    // ?q=Some+Name or ?query=...
    const q = url.searchParams.get("q") ?? url.searchParams.get("query");
    if (q) return q.replace(/\+/g, " ").trim();
    return null;
  } catch {
    return null;
  }
}

/** Display name for a restaurant: stored name, else derived from its URL. */
export function displayName(r: Restaurant): string {
  return r.name?.trim() || nameFromGmapsUrl(r.googleMapsUrl) || "Unnamed place";
}

/** Normalized list (group) code; empty means "default". */
export function normalizeListCode(code: string | undefined): string {
  return (code ?? "").trim().toLowerCase() || "default";
}

function storageKey(list: string | undefined): string {
  const code = normalizeListCode(list);
  return code === "default" ? STORAGE_KEY : `${STORAGE_KEY}:${code}`;
}

export function loadRestaurants(list?: string): Restaurant[] {
  try {
    const raw = window.localStorage.getItem(storageKey(list));
    if (!raw) return DEFAULT_RESTAURANTS;
    const parsed = JSON.parse(raw) as Array<Partial<Restaurant> & { name?: string }>;
    if (!Array.isArray(parsed)) return DEFAULT_RESTAURANTS;
    // Migrate legacy entries (name-only, no URL) and dedupe by URL.
    const seen = new Set<string>();
    const out: Restaurant[] = [];
    for (const r of parsed) {
      if (!r || typeof r !== "object") continue;
      const url = typeof r.googleMapsUrl === "string" ? r.googleMapsUrl.trim() : "";
      const id = url || (typeof r.id === "string" ? r.id : "");
      if (!id || seen.has(id)) continue;
      seen.add(id);
      out.push({
        id,
        googleMapsUrl: url,
        name: typeof r.name === "string" && r.name.trim() ? r.name.trim() : undefined,
        visits: typeof r.visits === "number" ? r.visits : undefined,
        lastVisitedAt: typeof r.lastVisitedAt === "string" ? r.lastVisitedAt : undefined,
        visitDates: Array.isArray(r.visitDates)
          ? r.visitDates.filter((date): date is string => typeof date === "string" && Number.isFinite(Date.parse(date)))
          : undefined,
      });
    }
    return out.length > 0 ? out : DEFAULT_RESTAURANTS;
  } catch {
    return DEFAULT_RESTAURANTS;
  }
}

export function saveRestaurants(restaurants: Restaurant[], list?: string) {
  window.localStorage.setItem(storageKey(list), JSON.stringify(restaurants));
}

/** Legacy entries retain their one known visit, without inventing older dates. */
export function knownVisitDates(r: Restaurant): string[] {
  return r.visitDates ?? (r.lastVisitedAt ? [r.lastVisitedAt] : []);
}

export function recentVisitCount(r: Restaurant, now = new Date()): number {
  const cutoff = new Date(now);
  const day = cutoff.getDate();
  cutoff.setDate(1);
  cutoff.setMonth(cutoff.getMonth() - 3);
  const lastDay = new Date(cutoff.getFullYear(), cutoff.getMonth() + 1, 0).getDate();
  cutoff.setDate(Math.min(day, lastDay));
  return knownVisitDates(r).filter((date) => {
    const time = Date.parse(date);
    return time >= cutoff.getTime() && time <= now.getTime();
  }).length;
}

/**
 * Parse a CSV of restaurants. First column is the Google Maps URL
 * (required), second column is an optional name. Accepts an optional header
 * row (google_maps_url,name) and quoted values.
 */
export function parseRestaurantsCsv(text: string): {
  restaurants: Restaurant[];
  skipped: number;
} {
  const rows = parseCsvRows(text);
  if (rows.length === 0) return { restaurants: [], skipped: 0 };

  let start = 0;
  const first = (rows[0] ?? []).map((c) => c.trim().toLowerCase());
  if (
    first[0] === "google_maps_url" ||
    first[0] === "url" ||
    first[0] === "link" ||
    first.includes("name")
  )
    start = 1;

  const restaurants: Restaurant[] = [];
  let skipped = 0;

  for (let i = start; i < rows.length; i++) {
    const cols = rows[i] ?? [];
    const googleMapsUrl = (cols[0] ?? "").trim();
    const name = (cols[1] ?? "").trim();
    if (!googleMapsUrl) {
      skipped++;
      continue;
    }
    restaurants.push({
      id: googleMapsUrl,
      googleMapsUrl,
      name: name || undefined,
    });
  }

  return { restaurants, skipped };
}

/** Minimal RFC-4180-ish CSV parser: handles quotes, commas, newlines. */
function parseCsvRows(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let inQuotes = false;

  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (inQuotes) {
      if (ch === '"') {
        if (text[i + 1] === '"') {
          field += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        field += ch;
      }
    } else if (ch === '"') {
      inQuotes = true;
    } else if (ch === ",") {
      row.push(field);
      field = "";
    } else if (ch === "\n" || ch === "\r") {
      if (ch === "\r" && text[i + 1] === "\n") i++;
      row.push(field);
      field = "";
      if (row.some((c) => c.trim() !== "")) rows.push(row);
      row = [];
    } else {
      field += ch;
    }
  }

  row.push(field);
  if (row.some((c) => c.trim() !== "")) rows.push(row);
  return rows;
}

/** True when the link looks like a Google Maps place/search/share URL. */
export function isValidGmapsUrl(link: string): boolean {
  try {
    const u = new URL(link);
    if (u.protocol !== "https:" && u.protocol !== "http:") return false;
    const h = u.hostname.toLowerCase();
    if (h === "maps.app.goo.gl") return true;
    if (h === "goo.gl" && u.pathname.startsWith("/maps")) return true;
    if (/^maps\.google\.[a-z.]+$/.test(h)) return true;
    if (/^(www\.)?google\.[a-z.]+$/.test(h) && u.pathname.startsWith("/maps")) return true;
    return false;
  } catch {
    return false;
  }
}

export type PreviewStatus = "ok" | "duplicate" | "invalid";
export interface PreviewRow {
  key: string;
  url: string;
  name?: string | undefined;
  status: PreviewStatus;
  include: boolean;
}

/** Validate candidate rows against the existing list and each other. */
export function buildPreviewRows(
  candidates: Array<{ url: string; name?: string | undefined }>,
  existing: Restaurant[],
): PreviewRow[] {
  const have = new Set(existing.map((r) => r.id));
  const seen = new Set<string>();
  return candidates.map((c, i) => {
    const url = c.url.trim();
    let status: PreviewStatus = "ok";
    if (!isValidGmapsUrl(url)) status = "invalid";
    else if (have.has(url) || seen.has(url)) status = "duplicate";
    seen.add(url);
    return { key: `${i}-${url}`, url, name: c.name, status, include: status === "ok" };
  });
}

/** Keyless embeddable Google Maps URL for a restaurant. */
export function embedUrlFor(r: Restaurant): string {
  const at = r.googleMapsUrl.match(/@(-?\d+\.\d+),(-?\d+\.\d+)/);
  const q = at ? `${at[1]},${at[2]}` : displayName(r);
  return `https://maps.google.com/maps?q=${encodeURIComponent(q)}&z=16&output=embed`;
}

function csvCell(v: string): string {
  return /[",\n\r]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v;
}

/** Export every restaurant attribute as CSV (visit_dates separated by "|"). */
export function restaurantsToCsv(restaurants: Restaurant[]): string {
  const header = "google_maps_url,name,visits,last_visited_at,visit_dates";
  const lines = restaurants.map((r) =>
    [r.googleMapsUrl, r.name ?? "", String(r.visits ?? 0), r.lastVisitedAt ?? "", (r.visitDates ?? []).join("|")]
      .map(csvCell)
      .join(","),
  );
  return [header, ...lines].join("\n") + "\n";
}
