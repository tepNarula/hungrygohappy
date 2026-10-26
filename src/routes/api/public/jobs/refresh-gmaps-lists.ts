import { createFileRoute } from "@tanstack/react-router";
import { authenticateCronRequest } from "@/integrations/supabase/cron-auth";
import { fetchGmapsList } from "@/lib/gmaps-core";

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
            const { data: existing } = await supabaseAdmin
              .from("restaurants")
              .select("id, google_maps_url, name, gmaps_name")
              .eq("list_code", src.list_code);
            const byUrl = new Map((existing ?? []).map((r) => [r.google_maps_url, r]));

            const inserts = places
              .filter((p) => !byUrl.has(p.url))
              .map((p) => ({ list_code: src.list_code, google_maps_url: p.url, name: p.name, gmaps_name: p.name, source_list_id: src.gmaps_list_id }));
            if (inserts.length) await supabaseAdmin.from("restaurants").upsert(inserts, { onConflict: "list_code,google_maps_url", ignoreDuplicates: true });

            let renamed = 0;
            for (const p of places) {
              const row = byUrl.get(p.url);
              if (!row) continue;
              // Untouched by users when name is empty or still equals the last Google name.
              const baseline = row.gmaps_name ?? row.name;
              const isCustom = row.name != null && row.name !== baseline;
              if (isCustom) continue;
              if (row.name === p.name && row.gmaps_name === p.name) continue;
              await supabaseAdmin.from("restaurants").update({ name: p.name, gmaps_name: p.name, source_list_id: src.gmaps_list_id }).eq("id", row.id);
              if (row.name !== p.name) renamed++;
            }
            await supabaseAdmin.from("gmaps_list_sources").update({ last_synced_at: new Date().toISOString() }).eq("id", src.id);
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
