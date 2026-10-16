import { createFileRoute } from "@tanstack/react-router";
import { RoulettePage } from "@/components/RoulettePage";
import { normalizeListCode } from "@/lib/restaurants";

export const Route = createFileRoute("/$list/")({
  validateSearch: (search: Record<string, unknown>) => ({
    view: typeof search["view"] === "string" ? search["view"] : undefined,
  }),
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
  const { view } = Route.useSearch();
  const { list } = Route.useParams();
  return <RoulettePage key={list} list={normalizeListCode(list)} initialView={view} />;
}
