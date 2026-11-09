/**
 * Location filtering helpers for the spin screen.
 * Design goal: pure functions (no React) so the matching rules are unit-testable.
 */
import type { Restaurant } from "@/lib/restaurants";

/** Ordered location fields shown and matched; most specific first. */
const FIELDS = ["city", "province", "postalCode", "country"] as const;

/** Normalize for case/whitespace-insensitive comparison. */
const norm = (s: string) => s.trim().toLowerCase();

/**
 * Keep restaurants whose city, province, postal code, or country contains the query.
 * An empty query keeps everything, so the filter is opt-in.
 */
export function filterByLocation(restaurants: Restaurant[], query: string): Restaurant[] {
  const q = norm(query);
  if (!q) return restaurants;
  return restaurants.filter((r) => FIELDS.some((f) => norm(r[f] ?? "").includes(q)));
}

/** Human label like "Sathon, Bangkok 10120, Thailand"; empty when nothing is known. */
export function locationLabel(r: Restaurant): string {
  const head = [r.city, r.province].filter(Boolean).join(", ");
  const withPostal = [head, r.postalCode].filter(Boolean).join(" ");
  return [withPostal, r.country].filter(Boolean).join(", ");
}

/** Up to `limit` distinct city/province values by frequency, for quick suggestion chips. */
export function locationSuggestions(restaurants: Restaurant[], limit = 6): string[] {
  const counts = new Map<string, number>();
  for (const r of restaurants) {
    for (const v of [r.city, r.province]) if (v) counts.set(v, (counts.get(v) ?? 0) + 1);
  }
  return [...counts.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0])).slice(0, limit).map(([v]) => v);
}
