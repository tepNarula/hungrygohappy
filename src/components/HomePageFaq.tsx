import { useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { normalizeListCode } from "@/lib/restaurants";

const FAQS = [
  {
    q: "How to create a new restaurants list and add new restaurants?",
    a: [
      "Type a list name in the box above (or visit /your-list-name) — a new, empty list is created instantly.",
      "Tap the ⚙ gear, then the + button. Paste any Google Maps link (a single place or a shared saved-places list) or upload a CSV file.",
      "Review the preview: rename places if you like, untick any you don't want, then tap Add.",
      "You can also add one place via a link: /your-list-name/add?gmapslink=<Google Maps URL>.",
    ],
  },
  {
    q: "How to spin, re-spin, select, and reload?",
    a: [
      "Spin: tap the big “Where To Eat/Drink Today?” button.",
      "Re-spin: not feeling it? Tap the spin icon to pick again — nothing is recorded.",
      "Select: tap “Let's Go!” to record the visit and open directions in Google Maps.",
      "Reload: tap the reload icon to go back to the start screen.",
    ],
  },
  {
    q: "How to edit restaurants info on a list (and how does auto-update from Google Maps work)?",
    a: [
      "Open the ⚙ gear, tap “All restaurants”, then the ✏ pencil to enter edit mode.",
      "Change any name, link, last-visit date or visit count — changes save as you leave each field. Tap the bin to delete a place, then ✓ when done.",
      "Auto-update: lists imported from a shared Google Maps list will be re-checked once a day — new places get added and official name changes are picked up, while names you renamed yourself are kept.",
    ],
  },
  {
    q: "How to share a restaurants list link and export to a local CSV file?",
    a: [
      "Open the ⚙ gear and tap the share icon next to “Your restaurants”.",
      "Copy the link and send it — anyone who opens it sees and edits the same list, on any device.",
      "Tap “Download CSV” to save a file named HappyGoHungry_{list}_{YYYYMMDD}_{HHMMSS}.txt with every restaurant and its visit history.",
    ],
  },
];

export function HomePageFaq() {
  const navigate = useNavigate();
  const [code, setCode] = useState("");
  const open = (value: string) => {
    const list = normalizeListCode(value.replace(/[^a-zA-Z0-9-_]/g, "-"));
    void navigate({ to: "/$list", params: { list } });
  };

  return (
    <main className="mx-auto flex min-h-screen max-w-2xl flex-col px-5 py-12">
      <header className="text-center">
        <h1 className="font-display text-5xl font-bold leading-tight">Hungry? Let's Go Happy!</h1>
        <p className="mt-3 text-muted-foreground">
          Spin a shared list of your favourite spots and let fate pick where to eat or drink.
        </p>
      </header>

      <form
        className="mt-8 rounded-3xl border bg-card p-5 shadow-sm"
        onSubmit={(e) => {
          e.preventDefault();
          if (code.trim()) open(code);
        }}
      >
        <label htmlFor="list-code" className="font-display text-lg font-semibold">
          Open or create a list
        </label>
        <div className="mt-3 flex gap-2">
          <input
            id="list-code"
            value={code}
            onChange={(e) => setCode(e.target.value)}
            placeholder="e.g. office-lunch"
            className="min-w-0 flex-1 rounded-xl border bg-background px-4 py-3"
          />
          <button
            type="submit"
            disabled={!code.trim()}
            className="btn-chunky rounded-xl bg-primary px-5 py-3 font-display font-semibold text-primary-foreground disabled:opacity-50"
          >
            Open
          </button>
        </div>
        or open the “default” list
      </form>

      <section className="mt-10">
        <h2 className="font-display text-2xl font-bold">Frequently asked questions</h2>
        <Accordion type="multiple" className="mt-4 space-y-3">
          {FAQS.map((f, i) => (
            <AccordionItem key={f.q} value={`q${i}`} className="rounded-2xl border bg-card px-4">
              <AccordionTrigger className="font-display text-base">{f.q}</AccordionTrigger>
              <AccordionContent>
                <ul className="list-disc space-y-2 rounded-2xl bg-muted p-4 pl-8 text-muted-foreground">
                  {f.a.map((line) => (
                    <li key={line}>{line}</li>
                  ))}
                </ul>
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </section>
    </main>
  );
}
