/**
 * @file src/components/RoulettePage.tsx
 * @description Main interactive Roulette view for a given restaurant list.
 * 
 * Capabilities:
 * - Hybrid storage: reads immediately from localStorage, then synchronizes two-way
 *   with the Lovable Cloud database (`fetchCloudList`, `syncWithLocal`, `subscribeList`).
 * - Pre-spin location filtering: filters restaurants by city, province, postal code,
 *   or country, updating candidate counts and providing clickable suggestion chips.
 * - Roulette spin mechanic: cycles through matching places at high speed before
 *   landing on a random selection.
 * - Result card: displays place name, location metadata, real-time opening hours status,
 *   embedded Google Maps iframe, and navigation/action buttons.
 * - Slide-out Settings drawer: provides quick actions (Share, Add Places), top-5 visited places,
 *   full sortable visit list modal, tracked Google Maps lists dialog, and link to the
 *   dedicated Development Roadmap & Releases History page.
 */

import { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "@tanstack/react-router";
import {
  loadRestaurants,
  saveRestaurants,
  displayName,
  embedUrlFor,
  knownVisitDates,
  type Restaurant,
} from "@/lib/restaurants";
import { RestaurantVisitList } from "@/components/RestaurantVisitList";
import { AddRestaurantsDialog } from "@/components/AddRestaurantsDialog";
import { TrackedListsDialog } from "@/components/TrackedListsDialog";
import { Button } from "@/components/ui/button";
import {
  ArrowLeft,
  Check,
  FileText,
  List,
  ListRestart,
  Pencil,
  Plus,
  Share2,
} from "lucide-react";
import { ShareDialog } from "@/components/ShareDialog";
import { fetchCloudList, pushDiff, subscribeList, syncWithLocal } from "@/lib/cloud-sync";
// Location filter helpers (pure, unit-tested) and opening-hours status logic.
import { filterByLocation, locationLabel, locationSuggestions } from "@/lib/location-filter";
import { computeOpenStatus, describeStatus, type OpenStatus } from "@/lib/opening-hours";
import { getPlaceHours } from "@/lib/gmaps-resolver.functions";

/**
 * Main Roulette Page Component
 * 
 * @param list - Unique slug or group code identifying the active restaurant list (e.g. "default", "office-lunch")
 * @param initialView - Optional initial view flag (e.g. "all" opens the places list on load)
 */
export function RoulettePage({ list, initialView }: { list: string; initialView?: string | undefined }) {
  const [restaurants, setRestaurants] = useState<Restaurant[]>([]);
  const [picked, setPicked] = useState<Restaurant | null>(null);
  const [spinning, setSpinning] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(initialView === "all");
  const [trackedOpen, setTrackedOpen] = useState(false);

  const latest = useRef<Restaurant[]>([]);
  latest.current = restaurants;

  // Initialize and synchronize list data across local storage and cloud database
  useEffect(() => {
    let cancelled = false;
    const local = loadRestaurants(list);
    setRestaurants(local);

    const refresh = () =>
      fetchCloudList(list)
        .then((cloud) => {
          if (cancelled) return;
          setRestaurants(cloud);
          saveRestaurants(cloud, list);
        })
        .catch(() => {});

    syncWithLocal(list, local)
      .then((merged) => {
        if (cancelled) return;
        setRestaurants(merged);
        saveRestaurants(merged, list);
      })
      .catch(() => {});

    const unsubscribe = subscribeList(list, refresh);
    return () => {
      cancelled = true;
      unsubscribe();
    };
  }, [list]);

  // Persists local restaurant changes and synchronizes deltas to the cloud
  const update = (next: Restaurant[]) => {
    const prev = latest.current;
    setRestaurants(next);
    saveRestaurants(next, list);
    pushDiff(list, prev, next).catch(() => {});
  };

  const [recorded, setRecorded] = useState(false);
  const reset = () => {
    setPicked(null);
    setRecorded(false);
  };

  // Optional location filter typed before spinning; candidates = matching places only.
  const [locationQuery, setLocationQuery] = useState("");
  const candidates = useMemo(() => filterByLocation(restaurants, locationQuery), [restaurants, locationQuery]);
  const suggestions = useMemo(() => locationSuggestions(restaurants), [restaurants]);

  // Opening status for the picked place: fetched once spinning stops, computed against local device time.
  const [openStatus, setOpenStatus] = useState<OpenStatus | "loading" | null>(null);
  useEffect(() => {
    if (!picked || spinning || !picked.googleMapsUrl) { setOpenStatus(null); return; }
    let cancelled = false; // Ignore late answers after the user re-spins.
    setOpenStatus("loading");
    getPlaceHours({ data: { url: picked.googleMapsUrl, placeId: picked.placeId } })
      .then((hours) => { if (!cancelled) setOpenStatus(computeOpenStatus(hours)); })
      .catch(() => { if (!cancelled) setOpenStatus({ kind: "unlisted" }); });
    return () => { cancelled = true; };
  }, [picked, spinning]);

  // Spin animation: rapidly selects candidates for ~1.3 seconds before picking the final result
  const spin = () => {
    if (candidates.length === 0 || spinning) return;
    const randomOne = () =>
      candidates[Math.floor(Math.random() * candidates.length)] ?? null;
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

  // Records a visit timestamp to history and opens Google Maps in a new tab
  const letsGo = () => {
    if (!picked || recorded) return;
    const visitedAt = new Date().toISOString();
    update(
      restaurants.map((r) =>
        r.id === picked.id
          ? { ...r, visits: (r.visits ?? 0) + 1, lastVisitedAt: visitedAt, visitDates: [...knownVisitDates(r), visitedAt] }
          : r,
      ),
    );
    setRecorded(true);
    if (picked.googleMapsUrl) window.open(picked.googleMapsUrl, "_blank", "noopener");
  };

  return (
    <div className="relative flex min-h-screen flex-col items-center justify-center px-4">
      {/* Top-Right Settings Gear Button */}
      <button
        onClick={() => setSettingsOpen(true)}
        aria-label="Settings"
        className="absolute right-5 top-5 flex h-11 w-11 items-center justify-center rounded-full bg-card text-foreground shadow-md transition-transform hover:rotate-45"
      >
        <GearIcon />
      </button>

      {picked && !spinning ? (
        /* Selected Restaurant Result View */
        <div className="animate-pop-in flex w-full max-w-xl flex-col items-center text-center">
          <p className="mb-3 text-sm font-medium uppercase tracking-widest text-muted-foreground">
            You're going to
          </p>
          <h1 className="font-display text-3xl font-bold leading-tight text-foreground">
            {displayName(picked)}
          </h1>
          {/* Location metadata under the name, when known. */}
          {locationLabel(picked) && <p className="mt-2 text-sm text-muted-foreground">{locationLabel(picked)}</p>}
          {/* Opening status badge; green-ish tone for open, muted otherwise. */}
          {openStatus && (
            <span className={`mt-3 rounded-full px-3 py-1 text-xs font-medium ${openStatus !== "loading" && (openStatus.kind === "open") ? "bg-primary text-primary-foreground" : openStatus !== "loading" && (openStatus.kind === "closing_soon" || openStatus.kind === "opening_soon") ? "bg-accent text-accent-foreground" : "bg-muted text-muted-foreground"}`}>
              {openStatus === "loading" ? "Checking hours…" : describeStatus(openStatus)}
            </span>
          )}
          <iframe
            title={`Map of ${displayName(picked)}`}
            src={embedUrlFor(picked)}
            loading="lazy"
            referrerPolicy="no-referrer-when-downgrade"
            className="mt-6 h-64 w-full rounded-2xl border shadow-md"
          />
          <div className="mt-8 flex items-center gap-4">
            {/* Back to Roulette sits left of Let's Go! and returns to the start view. */}
            <button
              onClick={reset}
              aria-label="Back to Roulette"
              title="Back to Roulette"
              className="flex h-15 w-15 items-center justify-center rounded-full bg-card text-foreground shadow-md"
            >
              <ArrowLeft />
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
              className="flex h-15 w-15 items-center justify-center rounded-full bg-card text-foreground shadow-md"
            >
              <SpinIcon />
            </button>
          </div>
        </div>
      ) : (
        /* Pre-Spin Roulette Action View */
        <div className="flex w-full max-w-xl flex-col items-center">
          <Button
            onClick={spin}
            disabled={candidates.length === 0}
            className="btn-chunky h-auto max-w-full whitespace-normal rounded-3xl bg-primary px-10 py-8 font-display text-3xl font-semibold leading-snug text-primary-foreground disabled:opacity-50"
          >
            {spinning ? (picked ? displayName(picked) : "…") : "Where To Eat/Drink Today?"}
          </Button>

          {/* Pre-spin location filter: match counter, quick chips, then the input. Hidden while spinning. */}
          {!spinning && restaurants.length > 0 && (
            <div className="mt-6 flex w-full max-w-sm flex-col items-center gap-3">
              <p className="text-sm text-muted-foreground">{candidates.length} of {restaurants.length} places match</p>
              {suggestions.length > 0 && (
                <div className="flex flex-wrap justify-center gap-2">
                  {suggestions.map((s) => (
                    <button
                      key={s}
                      onClick={() => setLocationQuery(locationQuery === s ? "" : s)}
                      aria-pressed={locationQuery === s}
                      className={`rounded-full border px-3 py-1 text-xs transition-colors ${
                        locationQuery === s
                          ? "border-primary bg-primary text-primary-foreground"
                          : "border-input bg-card text-foreground"
                      }`}
                    >
                      {s}
                    </button>
                  ))}
                </div>
              )}
              <input
                value={locationQuery}
                onChange={(e) => setLocationQuery(e.target.value)}
                placeholder="Limit to city, province, postal code or country"
                aria-label="Location filter"
                className="w-full rounded-xl border border-input bg-card px-4 py-2 text-sm text-foreground"
              />
            </div>
          )}
        </div>
      )}

      {restaurants.length === 0 && (
        <p className="mt-6 text-sm text-muted-foreground">
          Add some restaurants in the settings first.
        </p>
      )}

      {/* Slide-out Settings Panel Drawer */}
      {settingsOpen && (
        <SettingsPanel
          restaurants={restaurants}
          list={list}
          initialShowAll={initialView === "all"}
          onChange={update}
          onClose={() => setSettingsOpen(false)}
          onTracked={() => { setSettingsOpen(false); setTrackedOpen(true); }}
        />
      )}

      {/* Tracked Google Maps Lists Dialog */}
      <TrackedListsDialog open={trackedOpen} onOpenChange={setTrackedOpen} list={list} onSynced={setRestaurants} />
    </div>
  );
}

/**
 * Formats visit counts and relative/formatted last visit date for display.
 */
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

/**
 * Slide-out Settings drawer component
 */
function SettingsPanel({
  restaurants,
  list,
  initialShowAll,
  onChange,
  onClose,
  onTracked,
}: {
  restaurants: Restaurant[];
  list: string;
  initialShowAll: boolean;
  onChange: (r: Restaurant[]) => void;
  onClose: () => void;
  onTracked: () => void;
}) {
  const [sortMode, setSortMode] = useState<"visits" | "lastVisit">("visits");
  const [showAll, setShowAll] = useState(initialShowAll);
  const [shareOpen, setShareOpen] = useState(false);
  const [addOpen, setAddOpen] = useState(false);
  const [editing, setEditing] = useState(false);

  // Memoized sorting of restaurants based on visits count or latest visit date
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

  const removeOne = (id: string) => {
    onChange(restaurants.filter((r) => r.id !== id));
  };

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      {/* Share and Add Dialogs */}
      <ShareDialog open={shareOpen} onOpenChange={setShareOpen} list={list} restaurants={restaurants} />
      <AddRestaurantsDialog list={list} open={addOpen} onOpenChange={setAddOpen} restaurants={restaurants} onAdd={(added) => onChange([...restaurants, ...added])} />

      {/* Dimmed backdrop */}
      <button
        aria-label="Close settings"
        className="absolute inset-0 bg-foreground/30"
        onClick={onClose}
      />

      {/* Slide-out Sheet Container */}
      <div className={`relative flex h-full w-full flex-col bg-card shadow-2xl ${showAll ? "max-w-3xl" : "max-w-md"}`}>
        <div className="flex items-center justify-between border-b px-6 py-4">
          <div className="flex min-w-0 items-center gap-1">
            {showAll && (
              <Button
                variant="ghost"
                size="icon"
                aria-label="Back to settings"
                title="Back to settings"
                onClick={() => { setShowAll(false); setEditing(false); }}
              >
                <ArrowLeft />
              </Button>
            )}
            <h2 className="font-display text-xl font-semibold">
              {showAll ? "All restaurants" : "Your restaurants"}
            </h2>
            {showAll ? (
              <Button
                variant={editing ? "default" : "ghost"}
                size="icon"
                aria-label={editing ? "Done editing" : "Edit restaurants"}
                title={editing ? "Done editing" : "Edit"}
                onClick={() => setEditing(!editing)}
              >
                {editing ? <Check /> : <Pencil />}
              </Button>
            ) : (
              <Button
                variant="ghost"
                size="icon"
                aria-label="Add places"
                title="Add places"
                onClick={() => setAddOpen(true)}
              >
                <Plus />
              </Button>
            )}
            <Button
              variant="ghost"
              size="icon"
              aria-label="Share list"
              title="Share list"
              onClick={() => setShareOpen(true)}
            >
              <Share2 />
            </Button>
          </div>
          <button
            onClick={onClose}
            aria-label="Close"
            className="flex h-9 w-9 items-center justify-center rounded-full text-muted-foreground hover:bg-accent"
          >
            ✕
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-4">
          {showAll ? (
            <RestaurantVisitList restaurants={restaurants} editing={editing} onChange={onChange} />
          ) : (
            <>
              {/* Sort Mode Filter Buttons */}
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

              {/* Compact Top-5 Restaurants List */}
              <ul className="space-y-2">
                {sorted.slice(0, 5).map((r) => (
                  <li
                    key={r.id}
                    className="flex items-center justify-between rounded-xl border bg-background px-4 py-3"
                  >
                    <div className="min-w-0 flex-1 break-words">
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
                    No restaurants yet. Tap + to add places.
                  </p>
                )}
              </ul>

              {/* Settings Drawer Action Buttons */}
              <Button
                variant="outline"
                className="mt-4 w-full"
                onClick={() => setShowAll(true)}
              >
                <List className="h-4 w-4" />
                All restaurants ({restaurants.length})
              </Button>
              <Button
                variant="outline"
                className="mt-2 h-auto w-full whitespace-normal"
                onClick={onTracked}
              >
                <ListRestart className="h-4 w-4" />
                Tracked Google Maps Lists
              </Button>

              {/* Development Roadmap & Releases History Page Link */}
              <Link
                to="/roadmap"
                target="_blank"
                rel="noopener noreferrer"
                className="mt-2 inline-flex w-full items-center justify-center gap-2 rounded-md border border-input bg-background px-4 py-2 text-sm font-medium transition-colors hover:bg-accent hover:text-accent-foreground"
              >
                <FileText className="h-4 w-4" />
                Development Roadmap & Releases History
              </Link>
            </>
          )}
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
    <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 12a9 9 0 1 1-3-6.7L21 8" />
      <path d="M21 3v5h-5" />
      <circle cx="12" cy="12" r="2" />
    </svg>
  );
}
