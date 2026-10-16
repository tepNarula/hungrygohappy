import { createFileRoute } from "@tanstack/react-router";
import { AddPage } from "@/components/AddPage";

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
  component: Add,
});

function Add() {
  const { gmapslink } = Route.useSearch();
  return <AddPage list="default" gmapslink={gmapslink} />;
}
