import { createFileRoute } from "@tanstack/react-router";
import { AddPage } from "@/components/AddPage";
import { normalizeListCode } from "@/lib/restaurants";

export const Route = createFileRoute("/$list/add")({
  validateSearch: (search: Record<string, unknown>) => ({
    gmapslink: typeof search["gmapslink"] === "string" ? search["gmapslink"] : "",
  }),
  head: () => ({
    meta: [
      { title: "Add a restaurant" },
      { name: "description", content: "Add a restaurant to your lunch roulette from a Google Maps link." },
      { property: "og:title", content: "Add a restaurant" },
      { property: "og:description", content: "Add a restaurant to your lunch roulette from a Google Maps link." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Add,
});

function Add() {
  const { gmapslink } = Route.useSearch();
  const { list } = Route.useParams();
  return <AddPage list={normalizeListCode(list)} gmapslink={gmapslink} />;
}
