import { supabase } from "@/integrations/supabase/client";
import { normalizeListCode, type Restaurant } from "@/lib/restaurants";

type Row = {
  list_code: string;
  google_maps_url: string;
  name: string | null;
  visits: number;
  last_visited_at: string | null;
  visit_dates: unknown;
};

function toRow(list: string, r: Restaurant): Row {
  return {
    list_code: normalizeListCode(list),
    google_maps_url: r.googleMapsUrl || r.id,
    name: r.name ?? null,
    visits: r.visits ?? 0,
    last_visited_at: r.lastVisitedAt ?? null,
    visit_dates: r.visitDates ?? [],
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
    visits: row.visits || undefined,
    lastVisitedAt: row.last_visited_at ?? undefined,
    visitDates: dates.length ? dates : undefined,
  };
}

export async function fetchCloudList(list: string): Promise<Restaurant[]> {
  const { data, error } = await supabase
    .from("restaurants")
    .select("list_code, google_maps_url, name, visits, last_visited_at, visit_dates")
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
  const cloudIds = new Set(cloud.map((r) => r.id));
  const localOnly = local.filter((r) => !cloudIds.has(r.id));
  await upsertCloud(list, localOnly);
  return [...cloud, ...localOnly];
}

export function subscribeList(list: string, onChange: () => void) {
  const code = normalizeListCode(list);
  const channel = supabase
    .channel(`restaurants:${code}`)
    .on(
      "postgres_changes",
      { event: "*", schema: "public", table: "restaurants", filter: `list_code=eq.${code}` },
      onChange,
    )
    .subscribe();
  return () => {
    void supabase.removeChannel(channel);
  };
}
