import { nameFromGmapsUrl, type PreviewRow, type Restaurant } from "@/lib/restaurants";

const LABEL = { ok: "Ready", duplicate: "Duplicate", invalid: "Invalid link" } as const;

export function ImportPreview({
  rows,
  onRowsChange,
  onConfirm,
  onCancel,
}: {
  rows: PreviewRow[];
  onRowsChange: (rows: PreviewRow[]) => void;
  onConfirm: (restaurants: Restaurant[]) => void;
  onCancel: () => void;
}) {
  const chosen = rows.filter((r) => r.include && r.status === "ok");
  const toggle = (key: string) =>
    onRowsChange(rows.map((r) => (r.key === key ? { ...r, include: !r.include } : r)));

  return (
    <div className="space-y-3 rounded-2xl border bg-background p-4 text-left">
      <h3 className="text-sm font-semibold">Review before adding</h3>
      <ul className="max-h-72 space-y-2 overflow-y-auto">
        {rows.map((r) => {
          const bad = r.status !== "ok";
          return (
            <li
              key={r.key}
              className={`flex items-start gap-3 rounded-lg border px-3 py-2 text-sm ${
                bad ? "border-destructive/50 bg-destructive/10" : "bg-card"
              }`}
            >
              <input
                type="checkbox"
                className="mt-1"
                checked={r.include && !bad}
                disabled={bad}
                onChange={() => toggle(r.key)}
                aria-label={`Include ${r.url}`}
              />
              <div className="min-w-0 flex-1">
                <input
                  value={r.name ?? ""}
                  placeholder={nameFromGmapsUrl(r.url) || "Unnamed place"}
                  onChange={(e) =>
                    onRowsChange(rows.map((x) => (x.key === r.key ? { ...x, name: e.target.value } : x)))
                  }
                  aria-label="Restaurant name"
                  className="w-full rounded border border-transparent bg-transparent px-1 py-0.5 font-medium outline-none hover:border-input focus:border-input focus:bg-card"
                />
                <p className="truncate px-1 text-xs text-muted-foreground">{r.url || "(empty)"}</p>
              </div>
              <span
                className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-medium ${
                  bad ? "bg-destructive text-destructive-foreground" : "bg-primary/15 text-primary"
                }`}
              >
                {LABEL[r.status]}
              </span>
            </li>
          );
        })}
      </ul>
      <div flex flex-col gap-2>

        <button
          disabled={chosen.length === 0}
          onClick={() =>
            onConfirm(
              chosen.map((r) => ({
                id: r.url,
                googleMapsUrl: r.url,
                name: r.name?.trim() || nameFromGmapsUrl(r.url) || undefined,
              })),
            )
          }
          className="flex-1 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground disabled:opacity-50"
        >
          Add {chosen.length}
        </button>
        <button
          onClick={onCancel}
          className="flex-1 rounded-lg border border-input px-4 py-2 text-sm font-medium"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}
