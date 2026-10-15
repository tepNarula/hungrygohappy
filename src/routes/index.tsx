import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  loadRestaurants,
  saveRestaurants,
  parseRestaurantsCsv,
  displayName,
  buildPreviewRows,
  embedUrlFor,
  type PreviewRow,
  type Restaurant,
} from "@/lib/restaurants";
import { ImportPreview } from "@/components/ImportPreview";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Hungry Roulette — Where to go for lunch today?" },
      {
        name: "description",
        content:
          "Can't decide where to eat? Spin the hungry roulette and let fate pick your lunch spot.",
      },
      { property: "og:title", content: "Hungry Roulette" },
      {
        property: "og:description",
        content: "Let fate pick your lunch spot.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Index,
});

function Index() {
  const [restaurants, setRestaurants] = useState<Restaurant[]>([]);
  const [picked, setPicked] = useState<Restaurant | null>(null);
  const [spinning, setSpinning] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);

  useEffect(() => {
    setRestaurants(loadRestaurants());
  }, []);

  const update = (next: Restaurant[]) => {
    setRestaurants(next);
    saveRestaurants(next);
  };

  const [recorded, setRecorded] = useState(false);
  const reset = () => {
    setPicked(null);
    setRecorded(false);
  };

  const spin = () => {
    if (restaurants.length === 0 || spinning) return;
    const randomOne = () =>
      restaurants[Math.floor(Math.random() * restaurants.length)] ?? null;
    setSpinning(true);
    setRecorded(false);
    setPicked(null);
    let ticks = 0;
    const interval = setInterval(() => {
      setPicked(randomOne());
      ticks++;
      if (ticks > 14) {
        clearInterval(interval);
        setPicked(randomOne());
        setSpinning(false);
      }
    }, 90);
  };

  const letsGo = () => {
    if (!picked || recorded) return;
    update(
      restaurants.map((r) =>
        r.id === picked.id
          ? { ...r, visits: (r.visits ?? 0) + 1, lastVisitedAt: new Date().toISOString() }
          : r,
      ),
    );
    setRecorded(true);
    if (picked.googleMapsUrl) window.open(picked.googleMapsUrl, "_blank", "noopener");
  };

  return (
    <div className="relative flex min-h-screen flex-col items-center justify-center px-4">
      <button
        onClick={() => setSettingsOpen(true)}
        aria-label="Settings"
        className="absolute right-5 top-5 flex h-11 w-11 items-center justify-center rounded-full bg-card text-foreground shadow-md transition-transform hover:rotate-45"
      >
        <GearIcon />
      </button>

      {picked && !spinning ? (
        <div className="animate-pop-in flex w-full max-w-xl flex-col items-center text-center">
          <p className="mb-3 text-sm font-medium uppercase tracking-widest text-muted-foreground">
            You're going to
          </p>
          <h1 className="font-display text-5xl font-bold leading-tight text-foreground">
            {displayName(picked)}
          </h1>
          <iframe
            title={`Map of ${displayName(picked)}`}
            src={embedUrlFor(picked)}
            loading="lazy"
            referrerPolicy="no-referrer-when-downgrade"
            className="mt-6 h-64 w-full rounded-2xl border shadow-md"
          />
          <div className="mt-8 flex items-center gap-4">
            <button
              onClick={reset}
              aria-label="Back to start"
              className="flex h-14 w-14 items-center justify-center rounded-full bg-card text-foreground shadow-md"
            >
              <ReloadIcon />
            </button>
            <button
              onClick={letsGo}
              disabled={recorded}
              className="btn-chunky rounded-2xl bg-primary px-8 py-4 font-display text-xl font-semibold text-primary-foreground disabled:opacity-60"
            >
              {recorded ? "Enjoy! ✓" : "Let's Go!"}
            </button>
            <button
              onClick={spin}
              aria-label="Spin again"
              className="flex h-14 w-14 items-center justify-center rounded-full bg-card text-foreground shadow-md"
            >
              <SpinIcon />
            </button>
          </div>
        </div>
      ) : (
        <button
          onClick={spin}
          disabled={restaurants.length === 0}
          className="btn-chunky rounded-3xl bg-primary px-10 py-8 font-display text-3xl font-semibold leading-snug text-primary-foreground disabled:opacity-50"
        >
          {spinning ? (picked ? displayName(picked) : "…") : "Where to go for lunch today?"}
        </button>
      )}

      {restaurants.length === 0 && (
        <p className="mt-6 text-sm text-muted-foreground">
          Add some restaurants in the settings first.
        </p>
      )}

      {settingsOpen && (
        <SettingsPanel
          restaurants={restaurants}
          onChange={update}
          onClose={() => setSettingsOpen(false)}
        />
      )}
    </div>
  );
}

function formatVisitInfo(r: Restaurant): string {
  const count = r.visits ?? 0;
  if (!r.lastVisitedAt) return "Never visited";
  const date = new Date(r.lastVisitedAt);
  const shown = Number.isNaN(date.getTime())
    ? ""
    : ` · ${date.toLocaleDateString(undefined, {
        day: "numeric",
        month: "short",
      })}`;
  return `${count} visit${count === 1 ? "" : "s"}${shown}`;
}

function SettingsPanel({
  restaurants,
  onChange,
  onClose,
}: {
  restaurants: Restaurant[];
  onChange: (r: Restaurant[]) => void;
  onClose: () => void;
}) {
  const [googleMapsUrl, setGoogleMapsUrl] = useState("");
  const [name, setName] = useState("");
  const [csvMessage, setCsvMessage] = useState<string | null>(null);
  const [preview, setPreview] = useState<PreviewRow[] | null>(null);
  const [sortMode, setSortMode] = useState<"visits" | "lastVisit">("visits");
  const fileInputRef = useRef<HTMLInputElement>(null);

  const sorted = useMemo(() => {
    const list = [...restaurants];
    if (sortMode === "visits") {
      list.sort(
        (a, b) =>
          (b.visits ?? 0) - (a.visits ?? 0) ||
          (b.lastVisitedAt ?? "").localeCompare(a.lastVisitedAt ?? "") ||
          displayName(a).localeCompare(displayName(b)),
      );
    } else {
      list.sort(
        (a, b) =>
          (b.lastVisitedAt ?? "").localeCompare(a.lastVisitedAt ?? "") ||
          (b.visits ?? 0) - (a.visits ?? 0) ||
          displayName(a).localeCompare(displayName(b)),
      );
    }
    return list;
  }, [restaurants, sortMode]);

  const addOne = () => {
    const url = googleMapsUrl.trim();
    if (!url) return;
    setCsvMessage(null);
    setPreview(buildPreviewRows([{ url, name: name.trim() || undefined }], restaurants));
  };

  const removeOne = (id: string) => {
    onChange(restaurants.filter((r) => r.id !== id));
  };

  const handleCsvFile = async (file: File) => {
    const text = await file.text();
    const { restaurants: parsed, skipped } = parseRestaurantsCsv(text);
    if (parsed.length === 0) {
      setCsvMessage(
        "No restaurants found. Use one Google Maps URL per line, or google_maps_url,name columns.",
      );
      return;
    }
    setCsvMessage(skipped > 0 ? `Ignored ${skipped} empty row${skipped === 1 ? "" : "s"}.` : null);
    setPreview(
      buildPreviewRows(
        parsed.map((r) => ({ url: r.googleMapsUrl, name: r.name })),
        restaurants,
      ),
    );
  };

  const confirmPreview = (added: Restaurant[]) => {
    onChange([...restaurants, ...added]);
    setPreview(null);
    setGoogleMapsUrl("");
    setName("");
    setCsvMessage(`Added ${added.length} restaurant${added.length === 1 ? "" : "s"}.`);
  };

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <button
        aria-label="Close settings"
        className="absolute inset-0 bg-foreground/30"
        onClick={onClose}
      />
      <div className="relative flex h-full w-full max-w-md flex-col bg-card shadow-2xl">
        <div className="flex items-center justify-between border-b px-6 py-4">
          <h2 className="font-display text-xl font-semibold">Your restaurants</h2>
          <button
            onClick={onClose}
            aria-label="Close"
            className="flex h-9 w-9 items-center justify-center rounded-full text-muted-foreground hover:bg-accent"
          >
            ✕
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-4">
          <div className="mb-3 flex gap-2">
            <button
              onClick={() => setSortMode("visits")}
              aria-pressed={sortMode === "visits"}
              className={`flex-1 rounded-lg border px-3 py-2 text-sm font-medium transition-colors ${
                sortMode === "visits"
                  ? "border-primary bg-primary text-primary-foreground"
                  : "border-input bg-background text-muted-foreground hover:text-foreground"
              }`}
            >
              Most visited
            </button>
            <button
              onClick={() => setSortMode("lastVisit")}
              aria-pressed={sortMode === "lastVisit"}
              className={`flex-1 rounded-lg border px-3 py-2 text-sm font-medium transition-colors ${
                sortMode === "lastVisit"
                  ? "border-primary bg-primary text-primary-foreground"
                  : "border-input bg-background text-muted-foreground hover:text-foreground"
              }`}
            >
              Last visit
            </button>
          </div>

          <ul className="space-y-2">
            {sorted.map((r) => (
              <li
                key={r.id}
                className="flex items-center justify-between rounded-xl border bg-background px-4 py-3"
              >
                <div>
                  <p className="font-medium">{displayName(r)}</p>
                  {r.googleMapsUrl && (
                    <a
                      href={r.googleMapsUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs text-primary underline"
                    >
                      Google Maps
                    </a>
                  )}
                  <p className="text-xs text-muted-foreground">
                    {formatVisitInfo(r)}
                  </p>
                </div>
                <button
                  onClick={() => removeOne(r.id)}
                  aria-label={`Remove ${displayName(r)}`}
                  className="text-muted-foreground hover:text-destructive"
                >
                  ✕
                </button>
              </li>
            ))}
            {restaurants.length === 0 && (
              <p className="py-6 text-center text-sm text-muted-foreground">
                No restaurants yet. Add one below or upload a CSV.
              </p>
            )}
          </ul>

          {preview && (
            <div className="mt-6">
              <ImportPreview
                rows={preview}
                onRowsChange={setPreview}
                onCancel={() => setPreview(null)}
                onConfirm={confirmPreview}
              />
            </div>
          )}

          <div className="mt-6 space-y-3 rounded-2xl border bg-background p-4">
            <h3 className="text-sm font-semibold">Add a restaurant</h3>
            <input
              value={googleMapsUrl}
              onChange={(e) => setGoogleMapsUrl(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && addOne()}
              placeholder="Google Maps URL"
              className="w-full rounded-lg border border-input bg-card px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
            />
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && addOne()}
              placeholder="Name (optional — taken from the link)"
              className="w-full rounded-lg border border-input bg-card px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
            />
            <button
              onClick={addOne}
              className="w-full rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:opacity-90"
            >
              Review &amp; add
            </button>
          </div>

          <div className="mt-4 space-y-3 rounded-2xl border bg-background p-4">
            <h3 className="text-sm font-semibold">Upload CSV</h3>
            <p className="text-xs text-muted-foreground">
              One Google Maps URL per line, or columns{" "}
              <code className="rounded bg-muted px-1">google_maps_url,name</code>. A
              header row is optional; the name column is optional too.
            </p>
            <input
              ref={fileInputRef}
              type="file"
              accept=".csv,text/csv,text/plain"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) void handleCsvFile(file);
                e.target.value = "";
              }}
            />
            <button
              onClick={() => fileInputRef.current?.click()}
              className="w-full rounded-lg border-2 border-dashed border-input px-4 py-3 text-sm font-medium text-muted-foreground hover:border-primary hover:text-foreground"
            >
              Choose CSV file…
            </button>
            {csvMessage && (
              <p className="text-xs text-muted-foreground">{csvMessage}</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function GearIcon() {
  return (
    <svg
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09a1.65 1.65 0 0 0-1-1.51 1.65 1.65 0 0 0-1.82.33l-.06-.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09a1.65 1.65 0 0 0 1.51-1 1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33h.01a1.65 1.65 0 0 0 1-1.51V3a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 1 1.51h.01a1.65 1.65 0 0 0 1.82-.33l.06.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82v.01a1.65 1.65 0 0 0 1.51 1H21a2 2 0 1 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
    </svg>
  );
}

function SpinIcon() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 12a9 9 0 1 1-3-6.7L21 8" />
      <path d="M21 3v5h-5" />
      <circle cx="12" cy="12" r="2" />
    </svg>
  );
}

function ReloadIcon() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 12a9 9 0 0 1 15-6.7L21 8" />
      <path d="M21 3v5h-5" />
      <path d="M21 12a9 9 0 0 1-15 6.7L3 16" />
      <path d="M3 21v-5h5" />
    </svg>
  );
}
