/** Manage tracked Google sources independently of the compact settings drawer. */
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { ExternalLink, Loader2, Plus, RefreshCw, Trash2 } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { resolveGmapsLink } from "@/lib/gmaps-resolver.functions";
import { fetchTrackedSources, registerListSource, removeTrackedSources, syncResolvedSource, type TrackedSource } from "@/lib/cloud-sync";
import { buildPreviewRows, preparePreviewImport, saveRestaurants, type Restaurant } from "@/lib/restaurants";

/** Timestamp presentation follows the viewer's locale and time zone. */
function syncTime(value: string | null): string {
  if (!value) return "Not synced yet";
  const date = new Date(value);
  return Number.isFinite(date.getTime()) ? date.toLocaleString() : "Not synced yet";
}

/** Serialize mutations to avoid overlapping refreshes and preserve per-source failures. */
export function TrackedListsDialog({ open, onOpenChange, list, onSynced }: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  list: string;
  onSynced: (restaurants: Restaurant[]) => void;
}) {
  const resolve = useServerFn(resolveGmapsLink);
  const [sources, setSources] = useState<TrackedSource[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);
  const [link, setLink] = useState("");
  const [selected, setSelected] = useState<string[]>([]);
  const [notice, setNotice] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [removing, setRemoving] = useState<string[] | null>(null);

  /** Load fresh Cloud data each time the dialog opens; ignore stale responses. */
  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    setLoading(true);
    setNotice("");
    setSelected([]);
    setRemoving(null);
    setErrors({});
    fetchTrackedSources(list).then((rows) => {
      if (!cancelled) setSources(rows);
    }).catch(() => {
      if (!cancelled) setNotice("Couldn't load tracked lists. Please try again.");
    }).finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [open, list]);

  /** Refresh one source through the same dedupe/custom-name-safe planner as cron. */
  const refreshSource = async (source: TrackedSource) => {
    const result = await resolve({ data: { url: source.source_url } });
    if (result.error) throw new Error(result.error);
    if (result.listId !== source.gmaps_list_id) throw new Error("This link no longer points to the tracked Google Maps list.");
    const rows = preparePreviewImport(buildPreviewRows(result.places, []));
    const synced = await syncResolvedSource(list, source.gmaps_list_id, rows);
    saveRestaurants(synced.restaurants, list);
    onSynced(synced.restaurants);
    return synced.added;
  };

  /** Sequential refresh avoids bursts; a failed list does not block its siblings. */
  const refresh = async (targets: TrackedSource[]) => {
    setBusy(targets.length > 1 ? "all" : targets[0]?.id ?? "all");
    setNotice("");
    setErrors({});
    let succeeded = 0;
    let added = 0;
    const failures: Record<string, string> = {};
    try {
      for (const source of targets) {
        try { added += await refreshSource(source); succeeded++; }
        catch (error) { failures[source.id] = error instanceof Error ? error.message : "Couldn't refresh this list."; }
      }
      setErrors(failures);
      setNotice(`Refreshed ${succeeded} of ${targets.length} lists. ${added} new places added.`);
      setSources(await fetchTrackedSources(list));
    } catch { setNotice("Couldn't reload sync times. Please reopen this window."); }
    finally { setBusy(null); }
  };

  /** Only shared lists can be tracked; the Cloud uniqueness constraint handles duplicates. */
  const add = async () => {
    setBusy("add"); setNotice("");
    try {
      const result = await resolve({ data: { url: link.trim() } });
      if (result.error) { setNotice(result.error); return; }
      if (!result.listId) { setNotice("Please enter a shared Google Maps list link, not a single place."); return; }
      const current = await fetchTrackedSources(list);
      if (current.some((source) => source.gmaps_list_id === result.listId)) {
        setSources(current); setNotice("This Google Maps list is already tracked."); return;
      }
      await registerListSource(list, result.listId, link.trim(), result.listTitle);
      const synced = await syncResolvedSource(list, result.listId, preparePreviewImport(buildPreviewRows(result.places, [])));
      saveRestaurants(synced.restaurants, list);
      onSynced(synced.restaurants);
      setSources(await fetchTrackedSources(list));
      setLink("");
      setNotice(`List added. ${synced.added} new places imported.`);
    } catch {
      setNotice("Couldn't finish adding this list. If it appears below, use Refresh to retry.");
      try { setSources(await fetchTrackedSources(list)); } catch { /* Keep last known rows during outages. */ }
    } finally { setBusy(null); }
  };

  /** Confirm deletion of tracking records, preserving all imported places and visits. */
  const remove = async () => {
    if (!removing) return;
    setBusy("remove"); setNotice("");
    try {
      await removeTrackedSources(list, removing);
      setSources(await fetchTrackedSources(list));
      setSelected([]); setRemoving(null);
      setNotice("Tracking removed. Imported places and visit history were kept.");
    } catch { setNotice("Couldn't remove tracking. Please try again."); }
    finally { setBusy(null); }
  };

  return (
    <Dialog open={open} onOpenChange={(next) => { if (!busy) onOpenChange(next); }}>
      <DialogContent className="max-h-[90vh] w-[calc(100%-2rem)] max-w-2xl overflow-y-auto" onEscapeKeyDown={(event) => { if (busy) event.preventDefault(); }}>
        <DialogHeader>
          <DialogTitle>Tracked Google Maps Lists</DialogTitle>
          <DialogDescription>{list}</DialogDescription>
        </DialogHeader>
        <form className="flex flex-col gap-2 sm:flex-row" onSubmit={(event) => { event.preventDefault(); if (!busy && link.trim()) void add(); }}>
          <Input aria-label="Google Maps shared list URL" placeholder="https://maps.app.goo.gl/…" value={link} onChange={(event) => setLink(event.target.value)} disabled={!!busy} className="min-w-0 flex-1" />
          <Button type="submit" disabled={!!busy || !link.trim()}><Plus />{busy === "add" ? "Adding…" : "Add list"}</Button>
        </form>
        <div className="flex flex-wrap items-center justify-between gap-2 border-b pb-3">
          <span className="text-sm text-muted-foreground">{sources.length} tracked lists</span>
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" disabled={!!busy || loading || sources.length === 0} onClick={() => void refresh(sources)}><RefreshCw className={busy === "all" ? "animate-spin" : ""} />Refresh all</Button>
            {selected.length > 0 && <Button variant="destructive" disabled={!!busy} onClick={() => setRemoving(selected)}><Trash2 />Remove ({selected.length})</Button>}
          </div>
        </div>
        {notice && <p role="status" className="break-words text-sm text-muted-foreground">{notice}</p>}
        {removing && <div className="space-y-3 border-b pb-4">
          <p className="text-sm">Remove tracking for {removing.length} {removing.length === 1 ? "list" : "lists"}? Imported places and visit history will stay.</p>
          <div className="flex flex-wrap gap-2"><Button variant="destructive" disabled={!!busy} onClick={() => void remove()}>Confirm removal</Button><Button variant="outline" disabled={!!busy} onClick={() => setRemoving(null)}>Cancel</Button></div>
        </div>}
        {loading ? <div className="flex items-center gap-2 py-6 text-muted-foreground"><Loader2 className="animate-spin" />Loading…</div> : sources.length === 0 ? <p className="py-6 text-center text-sm text-muted-foreground">No tracked Google Maps lists.</p> : <ul className="divide-y">
          {sources.map((source) => <li key={source.id} className="flex gap-3 py-4">
            <Checkbox aria-label={`Select ${source.title ?? source.gmaps_list_id}`} checked={selected.includes(source.id)} disabled={!!busy} onCheckedChange={(checked) => setSelected((ids) => checked === true ? [...ids, source.id] : ids.filter((id) => id !== source.id))} className="mt-1" />
            <div className="min-w-0 flex-1">
              <a href={source.source_url} target="_blank" rel="noopener noreferrer" className="inline-flex max-w-full items-start gap-2 break-words font-medium text-primary underline underline-offset-4"><span className="min-w-0 break-words">{source.title ?? source.gmaps_list_id}</span><ExternalLink className="mt-1 h-4 w-4 shrink-0" /></a>
              <p className="mt-1 break-words text-xs text-muted-foreground">Last sync: {syncTime(source.last_synced_at)}</p>
              {errors[source.id] && <p role="alert" className="mt-2 break-words text-sm text-destructive">{errors[source.id]}</p>}
              <div className="mt-3 flex gap-2">
                <Button size="sm" variant="outline" disabled={!!busy} onClick={() => void refresh([source])}><RefreshCw className={busy === source.id ? "animate-spin" : ""} />Refresh</Button>
                <Button size="icon" variant="ghost" title="Remove tracking" aria-label={`Remove tracking for ${source.title ?? source.gmaps_list_id}`} disabled={!!busy} onClick={() => setRemoving([source.id])}><Trash2 /></Button>
              </div>
            </div>
          </li>)}
        </ul>}
      </DialogContent>
    </Dialog>
  );
}