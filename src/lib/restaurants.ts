export interface Restaurant {
  /** Primary key: the Google Maps URL. */
  id: string;
  googleMapsUrl: string;
  /** Optional display name; auto-derived from the URL when missing. */
  name?: string | undefined;
  visits?: number;
  lastVisitedAt?: string;
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

export function loadRestaurants(): Restaurant[] {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
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
      });
    }
    return out.length > 0 ? out : DEFAULT_RESTAURANTS;
  } catch {
    return DEFAULT_RESTAURANTS;
  }
}

export function saveRestaurants(restaurants: Restaurant[]) {
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(restaurants));
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
