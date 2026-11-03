import { useRef, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { ImportPreview } from "@/components/ImportPreview";
import { resolveGmapsLink } from "@/lib/gmaps-resolver.functions";
import { fetchCloudList, getTrackedSource, registerListSource, syncResolvedSource, upsertCloud } from "@/lib/cloud-sync";
import { buildPreviewRows, parseRestaurantsCsv, preparePreviewImport, uniqueRestaurants, type PreviewRow, type Restaurant } from "@/lib/restaurants";

export function AddRestaurantsDialog({
  open,
  onOpenChange,
  restaurants,
  onAdd,
  list,
}: {
  list: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  restaurants: Restaurant[];
  onAdd: (added: Restaurant[]) => void;
}) {
  const resolve = useServerFn(resolveGmapsLink);
  const [link, setLink] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [preview, setPreview] = useState<PreviewRow[] | null>(null);
  const [source, setSource] = useState<{ id: string; url: string; title?: string | undefined } | null>(null);
  const [connected, setConnected] = useState(false);
  const [resolvedRows, setResolvedRows] = useState<PreviewRow[]>([]);
  const fileRef = useRef<HTMLInputElement>(null);

  const reset = () => { setPreview(null); setSource(null); setMessage(null); setLink(""); setConnected(false); setResolvedRows([]); };

  const fetchLink = async () => {
    const url = link.trim();
    if (!url) return;
    setBusy(true); setMessage(null);
    try {
      const res = await resolve({ data: { url } });
      if (res.error || res.places.length === 0) { setMessage(res.error ?? "No places found."); return; }
      const cloud = await fetchCloudList(list);
      const existing = [...cloud, ...uniqueRestaurants(restaurants, cloud)];
      const rows = buildPreviewRows(res.places, existing);
      setResolvedRows(buildPreviewRows(res.places, []));
      setSource(res.listId ? { id: res.listId, url, title: res.listTitle } : null);
      if (res.listId && await getTrackedSource(list, res.listId)) {
        setConnected(true);
        setMessage("This Google Maps list is already connected and refreshes daily.");
        return;
      }
      if (res.listTitle) setMessage(`Found ${res.places.length} places in “${res.listTitle}”.`);
      setPreview(rows);
    } catch {
      setMessage("Couldn't read that link. Please try again.");
    } finally { setBusy(false); }
  };

  const syncNow = async () => {
    if (!source) return;
    setBusy(true);
    try {
      const result = await syncResolvedSource(list, source.id, preparePreviewImport(resolvedRows));
      onAdd(uniqueRestaurants(result.restaurants, restaurants));
      setMessage(`Synced. ${result.added} new places added.`);
      setConnected(false);
      setSource(null);
    } catch { setMessage("Couldn't sync this list. Please try again."); }
    finally { setBusy(false); }
  };

  const confirm = async (added: Restaurant[]) => {
    setBusy(true);
    try {
      const cloud = await fetchCloudList(list);
      const fresh = uniqueRestaurants(added, [...cloud, ...restaurants]);
      const enriched = fresh.map((r) => ({ ...r, ...(source ? { sourceListId: source.id, gmapsName: resolvedRows.find((x) => x.url === r.googleMapsUrl)?.name } : {}) }));
      await upsertCloud(list, enriched);
      if (source) await registerListSource(list, source.id, source.url, source.title);
      onAdd(enriched); reset(); onOpenChange(false);
    } catch { setMessage("Couldn't save these places. Please try again."); }
    finally { setBusy(false); }
  };

  const handleCsv = async (file: File) => {
    const { restaurants: parsed } = parseRestaurantsCsv(await file.text());
    if (parsed.length === 0) { setMessage("No restaurants found. Use one Google Maps URL per line, or google_maps_url,name columns."); return; }
    setMessage(null); setSource(null);
    setPreview(buildPreviewRows(parsed.map((r) => ({ url: r.googleMapsUrl, name: r.name })), restaurants));
  };

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) reset(); onOpenChange(o); }}>
      <DialogContent className="max-h-[90vh] overflow-y-auto">
        <DialogHeader><DialogTitle>Add places</DialogTitle></DialogHeader>
        {connected ? (
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">{message}</p>
            <Button className="w-full" disabled={busy} onClick={() => void syncNow()}>{busy ? "Syncing…" : "Sync now"}</Button>
            <Button variant="outline" className="w-full" disabled={busy} onClick={reset}>Back</Button>
          </div>
        ) : preview ? (
          <div className="space-y-2">
            {message && <p className="text-xs text-muted-foreground">{message}</p>}
            <ImportPreview
              rows={preview}
              onRowsChange={setPreview}
              onCancel={() => setPreview(null)}
              busy={busy}
              onConfirm={(added) => void confirm(added)}
            />
          </div>
        ) : (
          <Tabs defaultValue="link">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="link">Google Maps Link</TabsTrigger>
              <TabsTrigger value="csv">Upload CSV</TabsTrigger>
            </TabsList>
            <TabsContent value="link" className="space-y-3 pt-2">
              <p className="text-xs text-muted-foreground">Paste a link to one place or a whole shared list.</p>
              <div className="rounded-lg border border-primary/30 bg-primary/10 p-3 text-xs leading-relaxed text-foreground">
                <p className="font-semibold">💡 Importing a whole list?</p>
                <p className="mt-1">
                  In Google Maps open <b>Saved</b> → your list, then tap <b>Share</b> at the top of the list (not on a single place).
                  Make sure link sharing is turned on. Imported lists refresh automatically every day.
                </p>
              </div>
              <input
                value={link}
                onChange={(e) => setLink(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && void fetchLink()}
                placeholder="https://maps.app.goo.gl/…"
                className="w-full rounded-lg border border-input bg-card px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
              />
              <Button className="w-full" disabled={busy || !link.trim()} onClick={() => void fetchLink()}>
                {busy ? "Fetching…" : "Fetch & review"}
              </Button>
            </TabsContent>
            <TabsContent value="csv" className="space-y-3 pt-2">
              <p className="text-xs text-muted-foreground">
                One Google Maps URL per line, or columns <code className="rounded bg-muted px-1">google_maps_url,name</code>.
              </p>
              <input ref={fileRef} type="file" accept=".csv,.txt,text/csv,text/plain" className="hidden"
                onChange={(e) => { const f = e.target.files?.[0]; if (f) void handleCsv(f); e.target.value = ""; }} />
              <button onClick={() => fileRef.current?.click()}
                className="w-full rounded-lg border-2 border-dashed border-input px-4 py-6 text-sm font-medium text-muted-foreground hover:border-primary hover:text-foreground">
                Choose CSV file…
              </button>
            </TabsContent>
            {message && <p className="mt-3 text-xs text-muted-foreground">{message}</p>}
          </Tabs>
        )}
      </DialogContent>
    </Dialog>
  );
}
