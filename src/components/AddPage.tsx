import { Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { resolveGmapsLink } from "@/lib/gmaps-resolver.functions";
import { Button } from "@/components/ui/button";
import {
  loadRestaurants,
  saveRestaurants,
  buildPreviewRows,
  preparePreviewImport,
  uniqueRestaurants,
  type PreviewRow,
} from "@/lib/restaurants";
import { ImportPreview } from "@/components/ImportPreview";
import { fetchCloudList, getTrackedSource, registerListSource, syncResolvedSource, upsertCloud } from "@/lib/cloud-sync";

export function AddPage({ list, gmapslink }: { list: string; gmapslink: string }) {
  const [rows, setRows] = useState<PreviewRow[] | null>(null);
  const [done, setDone] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [source, setSource] = useState<{ id: string; title?: string | undefined } | null>(null);
  const [connected, setConnected] = useState(false);
  const [candidates, setCandidates] = useState<PreviewRow[]>([]);
  const resolve = useServerFn(resolveGmapsLink);

  useEffect(() => {
    if (!gmapslink) return;
    let active = true;
    setBusy(true);
    void (async () => {
      try {
        const result = await resolve({ data: { url: gmapslink } });
        if (!active) return;
        if (result.error) { setError(result.error); return; }
        const existing = await fetchCloudList(list);
        const tracked = result.listId ? await getTrackedSource(list, result.listId) : null;
        if (!active) return;
        setSource(result.listId ? { id: result.listId, title: result.listTitle } : null);
        setConnected(Boolean(tracked));
        setCandidates(buildPreviewRows(result.places, []));
        setRows(buildPreviewRows(result.places, [...existing, ...loadRestaurants(list)]));
      } catch { if (active) setError("Couldn't read that link. Please try again."); }
      finally { if (active) setBusy(false); }
    })();
    return () => { active = false; };
  }, [gmapslink, list, resolve]);

  const confirm = async (added: ReturnType<typeof preparePreviewImport>) => {
    setBusy(true); setError(null);
    try {
      const existing = await fetchCloudList(list);
      const fresh = uniqueRestaurants(added, [...existing, ...loadRestaurants(list)]).map((r) => ({ ...r,
        ...(source ? { sourceListId: source.id, gmapsName: candidates.find((x) => x.url === r.googleMapsUrl)?.name } : {}),
      }));
      await upsertCloud(list, fresh);
      if (source) await registerListSource(list, source.id, gmapslink, source.title);
      saveRestaurants([...existing, ...fresh], list);
      setDone(`Added ${fresh.length} places.`);
    } catch { setError("Couldn't save these places. Please try again."); }
    finally { setBusy(false); }
  };

  const sync = async () => {
    if (!source) return;
    setBusy(true); setError(null);
    try {
      const result = await syncResolvedSource(list, source.id, preparePreviewImport(candidates));
      saveRestaurants(result.restaurants, list);
      setDone(`Synced. ${result.added} new places added.`);
    } catch { setError("Couldn't sync this list. Please try again."); }
    finally { setBusy(false); }
  };

  return (
    <div className="flex min-h-screen flex-col items-center justify-center px-4 text-center">
      {error && <p role="alert" className="mb-3 text-sm text-destructive">{error}</p>}
      {!gmapslink ? (
        <div>
          <h1 className="font-display text-4xl font-bold">No link provided</h1>
          <p className="mt-3 max-w-md text-muted-foreground">
            Add a restaurant like this:{" "}
            <code className="rounded bg-muted px-2 py-1 text-sm">/LISTNAME/add?gmapslink=https://maps.google.com/…</code>
          </p>
        </div>
      ) : done !== null ? (
        <div className="animate-pop-in">
          <h1 className="font-display max-w-xl text-4xl font-bold">{done}</h1>
        </div>
      ) : connected ? (
        <div className="space-y-3">
          <p>This Google Maps list is already connected and refreshes daily.</p>
          <Button disabled={busy} onClick={() => void sync()}>{busy ? "Syncing…" : "Sync now"}</Button>
        </div>
      ) : rows ? (
        <div className="w-full max-w-md">
          <ImportPreview
            rows={rows}
            busy={busy}
            onRowsChange={setRows}
            onCancel={() => setDone("Nothing added.")}
            onConfirm={(added) => void confirm(added)}
          />
        </div>
      ) : busy ? <p>Fetching…</p> : null}
    </div>
  );
}
