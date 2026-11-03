import { supabase } from "@/integrations/supabase/client";
import { normalizeListCode, uniqueRestaurants, type Restaurant } from "@/lib/restaurants";
import { planGmapsSync } from "@/lib/gmaps-sync-plan";

type Row = {
  list_code: string;
  google_maps_url: string;
  name: string | null;
  visits: number;
  last_visited_at: string | null;
  visit_dates: string[] | unknown;
  gmaps_name: string | null;
  source_list_id: string | null;
  gmaps_place_id: string | null;
};

function toRow(list: string, r: Restaurant) {
  return {
    list_code: normalizeListCode(list),
    google_maps_url: r.googleMapsUrl || r.id,
    name: r.name ?? null,
    visits: r.visits ?? 0,
    last_visited_at: r.lastVisitedAt ?? null,
    visit_dates: r.visitDates ?? [],
    ...(r.gmapsName !== undefined ? { gmaps_name: r.gmapsName } : {}),
    ...(r.sourceListId !== undefined ? { source_list_id: r.sourceListId } : {}),
    ...(r.placeId !== undefined ? { gmaps_place_id: r.placeId } : {}),
  };
}

function fromRow(row: Row): Restaurant {
  const dates = Array.isArray(row.visit_dates)
    ? row.visit_dates.filter((d): d is string => typeof d === "string")
    : [];
  return {
    id: row.google_maps_url,
    googleMapsUrl: row.google_maps_url,
    name: row.name ?? undefined,
    gmapsName: row.gmaps_name ?? undefined,
    sourceListId: row.source_list_id ?? undefined,
    placeId: row.gmaps_place_id ?? undefined,
    visits: row.visits || undefined,
    lastVisitedAt: row.last_visited_at ?? undefined,
    visitDates: dates.length ? dates : undefined,
  };
}

export async function fetchCloudList(list: string): Promise<Restaurant[]> {
  const { data, error } = await supabase
    .from("restaurants")
    .select("list_code, google_maps_url, name, visits, last_visited_at, visit_dates, gmaps_name, source_list_id, gmaps_place_id")
    .eq("list_code", normalizeListCode(list))
    .order("created_at", { ascending: true });
  if (error) throw error;
  return (data as Row[]).map(fromRow);
}

export async function upsertCloud(list: string, items: Restaurant[]) {
  if (items.length === 0) return;
  const { error } = await supabase
    .from("restaurants")
    .upsert(items.map((r) => toRow(list, r)), { onConflict: "list_code,google_maps_url" });
  if (error) throw error;
}

export async function deleteCloud(list: string, urls: string[]) {
  if (urls.length === 0) return;
  const { error } = await supabase
    .from("restaurants")
    .delete()
    .eq("list_code", normalizeListCode(list))
    .in("google_maps_url", urls);
  if (error) throw error;
}

/** Push only what changed between two versions of a list. */
export async function pushDiff(list: string, prev: Restaurant[], next: Restaurant[]) {
  const prevMap = new Map(prev.map((r) => [r.id, JSON.stringify(r)]));
  const nextIds = new Set(next.map((r) => r.id));
  const changed = next.filter((r) => prevMap.get(r.id) !== JSON.stringify(r));
  const removed = prev.filter((r) => !nextIds.has(r.id)).map((r) => r.googleMapsUrl || r.id);
  await Promise.all([upsertCloud(list, changed), deleteCloud(list, removed)]);
}

/** Cloud wins for shared entries; local-only entries are uploaded once (migration). */
export async function syncWithLocal(list: string, local: Restaurant[]): Promise<Restaurant[]> {
  const cloud = await fetchCloudList(list);
  const localOnly = uniqueRestaurants(local, cloud);
  await upsertCloud(list, localOnly);
  return [...cloud, ...localOnly];
}

export function subscribeList(list: string, onChange: () => void) {
  const code = normalizeListCode(list);
  const channel = supabase
    .channel(`restaurants:${code}`)
    .on(
      "postgres_changes",
      { event: "*", schema: "public", table: "restaurants" },
      onChange,
    )
    .subscribe();
  return () => {
    void supabase.removeChannel(channel);
  };
}

/** Remember a Google Maps list imported into a group list so the daily refresh can pick up changes. */
export async function registerListSource(list: string, gmapsListId: string, sourceUrl: string, title?: string) {
  const { error } = await supabase.from("gmaps_list_sources").upsert(
    { list_code: normalizeListCode(list), gmaps_list_id: gmapsListId, source_url: sourceUrl, title: title ?? null },
    { onConflict: "list_code,gmaps_list_id" },
  );
  if (error) throw error;
}

export async function getTrackedSource(list: string, sourceId: string) {
  const { data, error } = await supabase.from("gmaps_list_sources")
    .select("id, title, last_synced_at")
    .eq("list_code", normalizeListCode(list)).eq("gmaps_list_id", sourceId).maybeSingle();
  if (error) throw error;
  return data;
}

/** Shared group-code access uses the ordinary RLS client, never privileged credentials. */
export async function syncResolvedSource(list: string, sourceId: string, candidates: Restaurant[]) {
  const existing = await fetchCloudList(list);
  const { added, updates } = planGmapsSync(existing, candidates, sourceId);
  await upsertCloud(list, added);
  // Update only Google-owned fields: do not overwrite concurrent visit counts or custom names.
  for (const r of updates) {
    const before = existing.find((x) => x.id === r.id);
    if (!before) continue;
    let query = supabase.from("restaurants").update({ name: r.name ?? null, gmaps_name: r.gmapsName, source_list_id: sourceId, gmaps_place_id: r.placeId })
      .eq("list_code", normalizeListCode(list)).eq("google_maps_url", r.googleMapsUrl);
    query = before.name == null ? query.is("name", null) : query.eq("name", before.name);
    const { error } = await query;
    if (error) throw error;
  }
  const { error } = await supabase.from("gmaps_list_sources").update({ last_synced_at: new Date().toISOString() })
    .eq("list_code", normalizeListCode(list)).eq("gmaps_list_id", sourceId);
  if (error) throw error;
  return { added: added.length, restaurants: await fetchCloudList(list) };
}
