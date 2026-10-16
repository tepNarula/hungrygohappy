import { createFileRoute } from "@tanstack/react-router";
import { RoulettePage } from "@/components/RoulettePage";

export const Route = createFileRoute("/")({
  validateSearch: (search: Record<string, unknown>): { view?: string | undefined } => ({
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
  return <RoulettePage list="default" initialView={view} />;
}
