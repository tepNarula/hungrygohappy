import { createFileRoute } from "@tanstack/react-router";
import { authenticateCronRequest } from "@/integrations/supabase/cron-auth";
import { fetchGmapsList } from "@/lib/gmaps-core";
import { planGmapsSync } from "@/lib/gmaps-sync-plan";

export const Route = createFileRoute("/api/public/jobs/refresh-gmaps-lists")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const authFailure = await authenticateCronRequest(request);
        if (authFailure) return authFailure;

        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        const { data: sources, error } = await supabaseAdmin
          .from("gmaps_list_sources")
          .select("id, list_code, gmaps_list_id")
          .order("last_synced_at", { ascending: true, nullsFirst: true })
          .limit(25);
        if (error) return Response.json({ error: error.message }, { status: 500 });

        const summary: Array<{ list: string; added: number; renamed: number; error?: string }> = [];
        for (const src of sources ?? []) {
          try {
            const { places } = await fetchGmapsList(src.gmaps_list_id);
            const { data: existing, error: readError } = await supabaseAdmin
              .from("restaurants")
              .select("id, google_maps_url, name, gmaps_name, gmaps_place_id")
              .eq("list_code", src.list_code);
            if (readError) throw readError;
            const plan = planGmapsSync((existing ?? []).map((r) => ({
              id: r.google_maps_url, googleMapsUrl: r.google_maps_url, name: r.name ?? undefined,
              gmapsName: r.gmaps_name ?? undefined, placeId: r.gmaps_place_id ?? undefined,
            })), places.map((p) => ({ id: p.url, googleMapsUrl: p.url, name: p.name, placeId: p.placeId })), src.gmaps_list_id);
            const inserts = plan.added.map((p) => ({ list_code: src.list_code, google_maps_url: p.googleMapsUrl, name: p.name, gmaps_name: p.gmapsName, source_list_id: src.gmaps_list_id, gmaps_place_id: p.placeId ?? null }));
            if (inserts.length) {
              const { error } = await supabaseAdmin.from("restaurants").upsert(inserts, { onConflict: "list_code,google_maps_url", ignoreDuplicates: true });
              if (error) throw error;
            }

            let renamed = 0;
            for (const p of plan.updates) {
              const row = existing?.find((r) => r.google_maps_url === p.googleMapsUrl);
              if (!row) continue;
              let query = supabaseAdmin.from("restaurants").update({ name: p.name ?? null, gmaps_name: p.gmapsName ?? null, source_list_id: src.gmaps_list_id, gmaps_place_id: p.placeId ?? null }).eq("id", row.id);
              query = row.name == null ? query.is("name", null) : query.eq("name", row.name);
              const { error } = await query;
              if (error) throw error;
              if (row.name !== (p.name ?? null)) renamed++;
            }
            const { error: syncError } = await supabaseAdmin.from("gmaps_list_sources").update({ last_synced_at: new Date().toISOString() }).eq("id", src.id);
            if (syncError) throw syncError;
            summary.push({ list: src.list_code, added: inserts.length, renamed });
          } catch (e) {
            console.error("refresh list failed", src.gmaps_list_id, e);
            summary.push({ list: src.list_code, added: 0, renamed: 0, error: String(e) });
          }
        }
        return Response.json({ success: true, summary });
      },
    },
  },
});
