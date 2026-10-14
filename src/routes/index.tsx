import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import {
  loadRestaurants,
  saveRestaurants,
  parseRestaurantsCsv,
  type Restaurant,
} from "@/lib/restaurants";

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

  const spin = () => {
    if (restaurants.length === 0 || spinning) return;
    setSpinning(true);
    setPicked(null);
    let ticks = 0;
    const interval = setInterval(() => {
      setPicked(restaurants[Math.floor(Math.random() * restaurants.length)]);
      ticks++;
      if (ticks > 14) {
        clearInterval(interval);
        setPicked(restaurants[Math.floor(Math.random() * restaurants.length)]);
        setSpinning(false);
      }
    }, 90);
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
        <div className="animate-pop-in text-center">
          <p className="mb-3 text-sm font-medium uppercase tracking-widest text-muted-foreground">
            You're going to
          </p>
          <h1 className="font-display max-w-xl text-5xl font-bold leading-tight text-foreground">
            {picked.name}
          </h1>
          {picked.cuisine && (
            <p className="mt-2 text-lg text-muted-foreground">{picked.cuisine}</p>
          )}
          <button
            onClick={spin}
            className="btn-chunky mt-10 rounded-2xl bg-primary px-8 py-4 font-display text-xl font-semibold text-primary-foreground"
          >
            Spin again
          </button>
        </div>
      ) : (
        <button
          onClick={spin}
          disabled={restaurants.length === 0}
          className="btn-chunky rounded-3xl bg-primary px-10 py-8 font-display text-3xl font-semibold leading-snug text-primary-foreground disabled:opacity-50"
        >
          {spinning ? (picked?.name ?? "…") : "Where to go for lunch today?"}
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

function SettingsPanel({
  restaurants,
  onChange,
  onClose,
}: {
  restaurants: Restaurant[];
  onChange: (r: Restaurant[]) => void;
  onClose: () => void;
}) {
  const [name, setName] = useState("");
  const [cuisine, setCuisine] = useState("");
  const [csvMessage, setCsvMessage] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const addOne = () => {
    const trimmed = name.trim();
    if (!trimmed) return;
    onChange([
      ...restaurants,
      {
        id: `manual-${Date.now()}`,
        name: trimmed,
        cuisine: cuisine.trim() || undefined,
      },
    ]);
    setName("");
    setCuisine("");
  };

  const removeOne = (id: string) => {
    onChange(restaurants.filter((r) => r.id !== id));
  };

  const handleCsvFile = async (file: File) => {
    const text = await file.text();
    const { restaurants: parsed, skipped } = parseRestaurantsCsv(text);
    if (parsed.length === 0) {
      setCsvMessage(
        "No restaurants found. Use one name per line, or name,cuisine columns.",
      );
      return;
    }
    const existing = new Set(restaurants.map((r) => r.name.toLowerCase()));
    const fresh = parsed.filter((r) => !existing.has(r.name.toLowerCase()));
    const dupes = parsed.length - fresh.length;
    onChange([...restaurants, ...fresh]);
    const parts = [`Added ${fresh.length} restaurant${fresh.length === 1 ? "" : "s"}`];
    if (dupes > 0) parts.push(`skipped ${dupes} duplicate${dupes === 1 ? "" : "s"}`);
    if (skipped > 0) parts.push(`ignored ${skipped} empty row${skipped === 1 ? "" : "s"}`);
    setCsvMessage(parts.join(", ") + ".");
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
          <ul className="space-y-2">
            {restaurants.map((r) => (
              <li
                key={r.id}
                className="flex items-center justify-between rounded-xl border bg-background px-4 py-3"
              >
                <div>
                  <p className="font-medium">{r.name}</p>
                  {r.cuisine && (
                    <p className="text-xs text-muted-foreground">{r.cuisine}</p>
                  )}
                </div>
                <button
                  onClick={() => removeOne(r.id)}
                  aria-label={`Remove ${r.name}`}
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

          <div className="mt-6 space-y-3 rounded-2xl border bg-background p-4">
            <h3 className="text-sm font-semibold">Add a restaurant</h3>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && addOne()}
              placeholder="Name"
              className="w-full rounded-lg border border-input bg-card px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
            />
            <input
              value={cuisine}
              onChange={(e) => setCuisine(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && addOne()}
              placeholder="Cuisine (optional)"
              className="w-full rounded-lg border border-input bg-card px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
            />
            <button
              onClick={addOne}
              className="w-full rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:opacity-90"
            >
              Add
            </button>
          </div>

          <div className="mt-4 space-y-3 rounded-2xl border bg-background p-4">
            <h3 className="text-sm font-semibold">Upload CSV</h3>
            <p className="text-xs text-muted-foreground">
              One restaurant per line, or columns{" "}
              <code className="rounded bg-muted px-1">name,cuisine</code>. A
              header row is optional.
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
      <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09a1.65 1.65 0 0 0-1-1.51 1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09a1.65 1.65 0 0 0 1.51-1 1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33h.01a1.65 1.65 0 0 0 1-1.51V3a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 1 1.51h.01a1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82v.01a1.65 1.65 0 0 0 1.51 1H21a2 2 0 1 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
    </svg>
  );
}
