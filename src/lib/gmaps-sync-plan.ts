import { formatPlaceName, normalizeNameKey, normalizeUrlKey, uniqueRestaurants, type Restaurant } from "@/lib/restaurants";

export function planGmapsSync(existing: Restaurant[], candidates: Restaurant[], sourceId: string) {
  const updates: Restaurant[] = [];
  for (const p of candidates) {
    const row = existing.find((r) =>
      (p.placeId && r.placeId === p.placeId) ||
      normalizeUrlKey(r.googleMapsUrl) === normalizeUrlKey(p.googleMapsUrl) ||
      (normalizeNameKey(p.name) && normalizeNameKey(p.name) === normalizeNameKey(r.gmapsName ?? r.name)),
    );
    if (!row) continue;
    const googleName = formatPlaceName(p.name ?? "");
    // Without a known baseline, preserve a nonempty existing name rather than guess ownership.
    const canRename = !row.name || (row.gmapsName !== undefined && row.name === row.gmapsName);
    updates.push({ ...row, name: canRename ? googleName : row.name, gmapsName: googleName, sourceListId: sourceId, placeId: p.placeId ?? row.placeId });
  }
  const added = uniqueRestaurants(candidates, existing).map((r) => ({ ...r, name: formatPlaceName(r.name ?? ""), gmapsName: formatPlaceName(r.name ?? ""), sourceListId: sourceId }));
  return { added, updates };
}