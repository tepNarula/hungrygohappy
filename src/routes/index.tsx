import { createFileRoute, redirect } from "@tanstack/react-router";
import { HomePageFaq } from "@/components/HomePageFaq";

export const Route = createFileRoute("/")({
  validateSearch: (search: Record<string, unknown>): { view?: string | undefined } => ({
    view: typeof search["view"] === "string" ? search["view"] : undefined,
  }),
  beforeLoad: ({ search }) => {
    // Old share links (/?view=all) still open the default list.
    if (search.view) throw redirect({ to: "/$list", params: { list: "default" }, search: { view: search.view } });
  },
  head: () => ({
    meta: [
      { title: "Hungry? Let's Go Happy!" },
      {
        name: "description",
        content:
          "Create shared restaurant lists, spin to pick where to eat or drink, edit places, and share or export your list.",
      },
      { property: "og:title", content: "Hungry? Let's Go Happy!" },
      {
        property: "og:description",
        content: "Shared restaurant lists — how to create, spin, edit and share.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: HomePageFaq,
});
