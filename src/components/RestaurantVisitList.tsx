import { useMemo, useState } from "react";
import { ArrowDown, ArrowUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { displayName, recentVisitCount, type Restaurant } from "@/lib/restaurants";

type SortKey = "name" | "lastVisit" | "recentVisits";

export function RestaurantVisitList({ restaurants }: { restaurants: Restaurant[] }) {
  const [sort, setSort] = useState<SortKey>("recentVisits");
  const [ascending, setAscending] = useState(false);
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
        <tr>{heading("name", "Name")}{heading("lastVisit", "Last visit")}{heading("recentVisits", "Visits · last 3 months")}</tr>
      </thead>
      <tbody>
        {sorted.map((r) => (
          <tr key={r.id} className="border-b">
            <td className="break-words px-2 py-4 align-top">
              {r.googleMapsUrl ? <a className="font-medium text-primary underline underline-offset-2" href={r.googleMapsUrl} target="_blank" rel="noopener noreferrer">{displayName(r)}</a> : displayName(r)}
            </td>
            <td className="px-2 py-4 align-top text-muted-foreground">{r.lastVisitedAt && Number.isFinite(Date.parse(r.lastVisitedAt)) ? new Date(r.lastVisitedAt).toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" }) : "Never visited"}</td>
            <td className="px-2 py-4 align-top tabular-nums">{recentVisitCount(r)}</td>
          </tr>
        ))}
        {sorted.length === 0 && <tr><td colSpan={3} className="py-8 text-center text-muted-foreground">No restaurants yet.</td></tr>}
      </tbody>
    </table>
  );
}