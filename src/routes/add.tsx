import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import {
  loadRestaurants,
  saveRestaurants,
  buildPreviewRows,
  type PreviewRow,
} from "@/lib/restaurants";
import { ImportPreview } from "@/components/ImportPreview";

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

function AddPage() {
  const { gmapslink } = Route.useSearch();
  const [rows, setRows] = useState<PreviewRow[] | null>(null);
  const [done, setDone] = useState<string | null>(null);

  useEffect(() => {
    if (gmapslink) setRows(buildPreviewRows([{ url: gmapslink }], loadRestaurants()));
  }, [gmapslink]);

  return (
    <div className="flex min-h-screen flex-col items-center justify-center px-4 text-center">
      {!gmapslink ? (
        <div>
          <h1 className="font-display text-4xl font-bold">No link provided</h1>
          <p className="mt-3 max-w-md text-muted-foreground">
            Add a restaurant like this:{" "}
            <code className="rounded bg-muted px-2 py-1 text-sm">/add?gmapslink=https://maps.google.com/…</code>
          </p>
        </div>
      ) : done !== null ? (
        <div className="animate-pop-in">
          <h1 className="font-display max-w-xl text-4xl font-bold">{done}</h1>
        </div>
      ) : rows ? (
        <div className="w-full max-w-md">
          <ImportPreview
            rows={rows}
            onRowsChange={setRows}
            onCancel={() => setDone("Nothing added.")}
            onConfirm={(added) => {
              saveRestaurants([...loadRestaurants(), ...added]);
              setDone(`Added ${added.map((a) => a.name ?? "restaurant").join(", ")}`);
            }}
          />
        </div>
      ) : null}
      <Link
        to="/"
        className="btn-chunky mt-10 inline-block rounded-2xl bg-primary px-8 py-4 font-display text-xl font-semibold text-primary-foreground"
      >
        Back to the roulette
      </Link>
    </div>
  );
}
