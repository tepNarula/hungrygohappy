import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { loadRestaurants, saveRestaurants, type Restaurant } from "@/lib/restaurants";

export const Route = createFileRoute("/add")({
  validateSearch: (search: Record<string, unknown>) => ({
    gmapslink: typeof search["gmapslink"] === "string" ? search["gmapslink"] : "",
  }),
  head: () => ({
    meta: [
      { title: "Add a restaurant — Hungry Roulette" },
      { name: "description", content: "Add a restaurant to your lunch roulette from a Google Maps link." },
      { property: "og:title", content: "Add a restaurant — Hungry Roulette" },
      { property: "og:description", content: "Add a restaurant to your lunch roulette from a Google Maps link." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: AddPage,
});

/** Best-effort restaurant name extraction from a Google Maps URL. */
function nameFromGmapsLink(link: string): string | null {
  try {
    const url = new URL(link);
    // /maps/place/Some+Name/...
    const placeMatch = url.pathname.match(/\/place\/([^/]+)/);
    if (placeMatch?.[1]) {
      return decodeURIComponent(placeMatch[1]).replace(/\+/g, " ").trim();
    }
    // ?q=Some+Name or ?query=...
    const q = url.searchParams.get("q") ?? url.searchParams.get("query");
    if (q) return q.replace(/\+/g, " ").trim();
    return null;
  } catch {
    return null;
  }
}

function AddPage() {
  const { gmapslink } = Route.useSearch();
  const [status, setStatus] = useState<
    { kind: "added" | "duplicate" | "invalid" | "missing"; name?: string }
  >({ kind: "missing" });

  useEffect(() => {
    if (!gmapslink) {
      setStatus({ kind: "missing" });
      return;
    }
    const name = nameFromGmapsLink(gmapslink);
    if (!name) {
      setStatus({ kind: "invalid" });
      return;
    }
    const restaurants = loadRestaurants();
    if (restaurants.some((r) => r.name.toLowerCase() === name.toLowerCase())) {
      setStatus({ kind: "duplicate", name });
      return;
    }
    const next: Restaurant[] = [
      ...restaurants,
      { id: `gmaps-${Date.now()}`, name },
    ];
    saveRestaurants(next);
    setStatus({ kind: "added", name });
  }, [gmapslink]);

  return (
    <div className="flex min-h-screen flex-col items-center justify-center px-4 text-center">
      {status.kind === "added" && (
        <div className="animate-pop-in">
          <p className="mb-3 text-sm font-medium uppercase tracking-widest text-muted-foreground">
            Added to your roulette
          </p>
          <h1 className="font-display max-w-xl text-4xl font-bold">{status.name}</h1>
        </div>
      )}
      {status.kind === "duplicate" && (
        <div>
          <h1 className="font-display max-w-xl text-4xl font-bold">{status.name}</h1>
          <p className="mt-3 text-muted-foreground">is already on your list.</p>
        </div>
      )}
      {status.kind === "invalid" && (
        <div>
          <h1 className="font-display text-4xl font-bold">Hmm, that link didn't work</h1>
          <p className="mt-3 max-w-md text-muted-foreground">
            I couldn't find a restaurant name in that Google Maps link. Try the
            full link from the address bar of the place's page.
          </p>
        </div>
      )}
      {status.kind === "missing" && (
        <div>
          <h1 className="font-display text-4xl font-bold">No link provided</h1>
          <p className="mt-3 max-w-md text-muted-foreground">
            Add a restaurant like this:{" "}
            <code className="rounded bg-muted px-2 py-1 text-sm">
              /add?gmapslink=https://maps.google.com/…
            </code>
          </p>
        </div>
      )}
      <Link
        to="/"
        className="btn-chunky mt-10 inline-block rounded-2xl bg-primary px-8 py-4 font-display text-xl font-semibold text-primary-foreground"
      >
        Back to the roulette
      </Link>
    </div>
  );
}
