import { useMemo, useState } from "react";
import { ArrowDown, ArrowUp, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { displayName, isValidGmapsUrl, recentVisitCount, type Restaurant } from "@/lib/restaurants";

type SortKey = "name" | "lastVisit" | "recentVisits";

const inputCls = "w-full rounded border border-input bg-card px-2 py-1 text-sm outline-none focus:ring-2 focus:ring-ring";

export function RestaurantVisitList({
  restaurants,
  editing = false,
  onChange,
}: {
  restaurants: Restaurant[];
  editing?: boolean;
  onChange?: (r: Restaurant[]) => void;
}) {
  const [sort, setSort] = useState<SortKey>("recentVisits");
  const [ascending, setAscending] = useState(false);
  const [confirmId, setConfirmId] = useState<string | null>(null);
  const sorted = useMemo(() => {
    const now = new Date();
    return [...restaurants].sort((a, b) => {
      const comparison = sort === "name"
        ? displayName(a).localeCompare(displayName(b))
        : sort === "lastVisit"
          ? (Date.parse(a.lastVisitedAt ?? "") || 0) - (Date.parse(b.lastVisitedAt ?? "") || 0)
          : recentVisitCount(a, now) - recentVisitCount(b, now);
      return (ascending ? comparison : -comparison) || displayName(a).localeCompare(displayName(b));
    });
  }, [restaurants, sort, ascending]);

  const update = (id: string, patch: Partial<Restaurant>) =>
    onChange?.(restaurants.map((r) => (r.id === id ? { ...r, ...patch } : r)));

  const changeUrl = (r: Restaurant, url: string) => {
    const u = url.trim();
    if (!u || u === r.id || !isValidGmapsUrl(u) || restaurants.some((x) => x.id === u)) return false;
    update(r.id, { id: u, googleMapsUrl: u });
    return true;
  };

  const heading = (key: SortKey, label: string) => (
    <th scope="col" aria-sort={sort === key ? (ascending ? "ascending" : "descending") : "none"} className="px-2 py-3 text-left align-bottom">
      <Button variant="ghost" className="h-auto max-w-full justify-start whitespace-normal px-0 py-1 text-left text-xs" onClick={() => {
        if (sort === key) setAscending(!ascending);
        else { setSort(key); setAscending(key === "name"); }
      }}>
        {label}{sort === key && (ascending ? <ArrowUp /> : <ArrowDown />)}
      </Button>
    </th>
  );

  return (
    <table className="w-full table-fixed text-sm">
      <thead className="border-b">
        <tr>{heading("name", "Name")}{heading("lastVisit", "Last visit")}{heading("recentVisits", editing ? "Total visits" : "Visits · last 3 months")}{editing && <th className="w-10" />}</tr>
      </thead>
      <tbody>
        {sorted.map((r) => (
          <tr key={r.id} className="border-b">
            <td className="break-words px-2 py-4 align-top">
              {editing ? (
                <div className="space-y-1">
                  <input className={inputCls} aria-label="Name" defaultValue={r.name ?? ""} placeholder={displayName(r)}
                    onBlur={(e) => update(r.id, { name: e.target.value.trim() || undefined })} />
                  <input className={`${inputCls} text-xs`} aria-label="Google Maps URL" defaultValue={r.googleMapsUrl}
                    onBlur={(e) => { if (!changeUrl(r, e.target.value)) e.target.value = r.googleMapsUrl; }} />
                </div>
              ) : r.googleMapsUrl ? <a className="font-medium text-primary underline underline-offset-2" href={r.googleMapsUrl} target="_blank" rel="noopener noreferrer">{displayName(r)}</a> : displayName(r)}
            </td>
            <td className="px-2 py-4 align-top text-muted-foreground">
              {editing ? (
                <input type="date" className={inputCls} aria-label="Last visit"
                  defaultValue={r.lastVisitedAt && Number.isFinite(Date.parse(r.lastVisitedAt)) ? new Date(r.lastVisitedAt).toISOString().slice(0, 10) : ""}
                  onBlur={(e) => update(r.id, { lastVisitedAt: e.target.value ? new Date(e.target.value).toISOString() : undefined })} />
              ) : r.lastVisitedAt && Number.isFinite(Date.parse(r.lastVisitedAt)) ? new Date(r.lastVisitedAt).toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" }) : "Never visited"}
            </td>
            <td className="px-2 py-4 align-top tabular-nums">
              {editing ? (
                <input type="number" min={0} className={inputCls} aria-label="Total visits" defaultValue={r.visits ?? 0}
                  onBlur={(e) => update(r.id, { visits: Math.max(0, Math.floor(Number(e.target.value) || 0)) })} />
              ) : recentVisitCount(r)}
            </td>
            {editing && (
              <td className="px-1 py-4 align-top">
                {confirmId === r.id ? (
                  <div className="flex flex-col gap-1">
                    <Button size="sm" variant="destructive" onClick={() => { onChange?.(restaurants.filter((x) => x.id !== r.id)); setConfirmId(null); }}>Delete</Button>
                    <Button size="sm" variant="ghost" onClick={() => setConfirmId(null)}>Keep</Button>
                  </div>
                ) : (
                  <Button size="icon" variant="ghost" aria-label={`Delete ${displayName(r)}`} onClick={() => setConfirmId(r.id)}><Trash2 /></Button>
                )}
              </td>
            )}
          </tr>
        ))}
        {sorted.length === 0 && <tr><td colSpan={editing ? 4 : 3} className="py-8 text-center text-muted-foreground">No restaurants yet.</td></tr>}
      </tbody>
    </table>
  );
}
