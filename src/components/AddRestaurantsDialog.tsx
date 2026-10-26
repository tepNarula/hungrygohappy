import { useRef, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { ImportPreview } from "@/components/ImportPreview";
import { resolveGmapsLink } from "@/lib/gmaps-resolver.functions";
import { registerListSource } from "@/lib/cloud-sync";
import { buildPreviewRows, parseRestaurantsCsv, type PreviewRow, type Restaurant } from "@/lib/restaurants";

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
  const fileRef = useRef<HTMLInputElement>(null);

  const reset = () => { setPreview(null); setSource(null); setMessage(null); setLink(""); };

  const fetchLink = async () => {
    const url = link.trim();
    if (!url) return;
    setBusy(true); setMessage(null);
    try {
      const res = await resolve({ data: { url } });
      if (res.error || res.places.length === 0) { setMessage(res.error ?? "No places found."); return; }
      if (res.listTitle) setMessage(`Found ${res.places.length} places in “${res.listTitle}”.`);
      setSource(res.listId ? { id: res.listId, url, title: res.listTitle } : null);
      setPreview(buildPreviewRows(res.places, restaurants));
    } catch {
      setMessage("Couldn't read that link. Please try again.");
    } finally { setBusy(false); }
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
        {preview ? (
          <div className="space-y-2">
            {message && <p className="text-xs text-muted-foreground">{message}</p>}
            <ImportPreview
              rows={preview}
              onRowsChange={setPreview}
              onCancel={() => setPreview(null)}
              onConfirm={(added) => {
                if (source) void registerListSource(list, source.id, source.url, source.title);
                onAdd(added); reset(); onOpenChange(false);
              }}
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
