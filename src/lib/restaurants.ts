export interface Restaurant {
  id: string;
  name: string;
  googleMapsUrl?: string | undefined;
  visits?: number;
  lastVisitedAt?: string;
}

export const DEFAULT_RESTAURANTS: Restaurant[] = [
  { id: "1", name: "Som Tam Nua" },
  { id: "2", name: "Peppina" },
  { id: "3", name: "Sushi Hiro" },
  { id: "4", name: "El Toro" },
  { id: "5", name: "Baagadin" },
];

const STORAGE_KEY = "hungry-roulette-restaurants";

export function loadRestaurants(): Restaurant[] {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_RESTAURANTS;
    const parsed = JSON.parse(raw) as Restaurant[];
    if (!Array.isArray(parsed) || parsed.length === 0) return DEFAULT_RESTAURANTS;
    return parsed.filter((r) => r && typeof r.name === "string");
  } catch {
    return DEFAULT_RESTAURANTS;
  }
}

export function saveRestaurants(restaurants: Restaurant[]) {
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(restaurants));
}

/**
 * Parse a CSV of restaurants. Accepts an optional header row
 * (name,cuisine) and quoted values. Returns parsed restaurants and
 * the number of skipped rows.
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
    first[0] === "name" ||
    first.includes("google_maps_url") ||
    first.includes("url")
  )
    start = 1;

  const restaurants: Restaurant[] = [];
  let skipped = 0;

  for (let i = start; i < rows.length; i++) {
    const cols = rows[i] ?? [];
    const name = (cols[0] ?? "").trim();
    const googleMapsUrl = (cols[1] ?? "").trim();
    if (!name) {
      skipped++;
      continue;
    }
    restaurants.push({
      id: `csv-${i}-${name.toLowerCase().replace(/\s+/g, "-")}`,
      name,
      googleMapsUrl: googleMapsUrl || undefined,
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
