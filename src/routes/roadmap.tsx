/**
 * @file src/routes/roadmap.tsx
 * @description Dedicated "Development Roadmap & Releases History" route for Hungry Roulette.
 * 
 * Provides an interactive, accessible dashboard displaying the active roadmap:
 * 1. Partially Implemented / Unverified items (with current verification status)
 * 2. Pending Security Issues Found by Lovable Scanner (with Critical & Warning badges and RLS context)
 * 3. Pending Fixes, Features, and Enhancements (organized with search & category filters)
 * 4. Completed Features (reverse chronological delivery log with dates and details)
 * 
 * Includes:
 * - Back navigation with fallback to the home page (`/`).
 * - TanStack Start route head() SEO and OpenGraph metadata.
 */

import { createFileRoute, Link, useRouter } from "@tanstack/react-router";
import { useState, useMemo } from "react";
import {
  ArrowLeft,
  Search,
  CheckCircle2,
  Clock,
  ShieldAlert,
  Sparkles,
  Copy,
  Check,
  ExternalLink,
} from "lucide-react";
import { Button } from "@/components/ui/button";

// Import the raw ROADMAP.md file content directly at compile-time via Vite's ?raw query
import rawRoadmapContent from "../../ROADMAP.md?raw";

/**
 * Route definition for `/roadmap` with dedicated SEO/OG metadata.
 */
export const Route = createFileRoute("/roadmap")({
  head: () => ({
    meta: [
      { title: "Development Roadmap & Releases History" },
      {
        property: "og:title",
        content: "Development Roadmap & Releases History | HungryGoHappy",
      },
      {
        property: "og:description",
        content:
          "Live development roadmap, scanner security audit status, and release milestones.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: RoadmapPage,
});

/**
 * Represents a parsed item or subsection from ROADMAP.md
 */
interface RoadmapItem {
  id: string;
  completed: boolean;
  date?: string | undefined;
  title: string;
  badge?: "Critical" | "Warning" | "Info" | undefined;
  subItems: string[];
  rawText: string;
}

interface RoadmapSection {
  title: string;
  icon: typeof Sparkles;
  items: RoadmapItem[];
}

/**
 * Utility function to parse the structured markdown into reactive data structures.
 */
function parseRoadmapMarkdown(content: string): RoadmapSection[] {
  const sections: RoadmapSection[] = [];
  const rawSections = content.split(/^## /m).slice(1);

  for (const rawSec of rawSections) {
    const lines = rawSec.split("\n");
    const sectionTitle = lines[0]?.trim() ?? "";
    const bodyLines = lines.slice(1);

    let description = "";
    let icon = Sparkles;

    if (sectionTitle.includes("Partially Implemented")) {
      description = "Features with active code or test progress awaiting live verification.";
      icon = Clock;
    } else if (sectionTitle.includes("Pending Security Issues")) {
      description = "Security scanner findings, documented risk mitigations, and accepted architectural boundaries.";
      icon = ShieldAlert;
    } else if (sectionTitle.includes("Pending Fixes")) {
      description = "Prioritized upcoming enhancements, companion apps, and planned capabilities.";
      icon = Sparkles;
    } else if (sectionTitle.includes("Completed Features")) {
      description = "Chronological log of verified releases and merged enhancements.";
      icon = CheckCircle2;
    }

    const items: RoadmapItem[] = [];
    let currentItem: RoadmapItem | null = null;

    for (const line of bodyLines) {
      // Top-level checklist bullet: e.g. "- [ ] (2026-11-09) Feature title"
      const mainMatch = line.match(/^-\s*\[([ xX])\]\s*(.*)$/);
      if (mainMatch) {
        if (currentItem) items.push(currentItem);

        const isChecked = mainMatch[1]?.toLowerCase() === "x";
        let rest = mainMatch[2]?.trim() ?? "";

        // Extract date prefix e.g. (2026-11-09)
        let date: string | undefined;
        const dateMatch = rest.match(/^\((\d{4}-\d{2}-\d{2})\)\s*/);
        if (dateMatch?.[1]) {
          date = dateMatch[1];
          rest = rest.replace(dateMatch[0], "");
        }

        // Extract scanner severity badges e.g. [Critical] or [Warning]
        let badge: "Critical" | "Warning" | "Info" | undefined;
        if (rest.includes("[Critical]")) {
          badge = "Critical";
          rest = rest.replace("[Critical]", "").trim();
        } else if (rest.includes("[Warning]")) {
          badge = "Warning";
          rest = rest.replace("[Warning]", "").trim();
        }

        currentItem = {
          id: `${sectionTitle}-${items.length}`,
          completed: isChecked,
          date,
          badge,
          title: rest,
          subItems: [],
          rawText: line,
        };
      } else if (line.trim().startsWith("- [") && currentItem) {
        // Nested sub-item
        currentItem.subItems.push(line.trim().replace(/^-\s*\[[ xX]\]\s*/, ""));
      } else if (line.trim().startsWith("- ") && currentItem) {
        // Nested plain bullet
        currentItem.subItems.push(line.trim().replace(/^-\s*/, ""));
      }
    }

    if (currentItem) items.push(currentItem);

    sections.push({
      title: sectionTitle,
      description,
      icon,
      items,
    });
  }

  return sections;
}

/**
 * Main Roadmap & Releases History Page Component
 */
export function RoadmapPage() {
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState("");
  const [copied, setCopied] = useState(false);

  // Parse raw markdown once into structured sections
  const sections = useMemo(() => parseRoadmapMarkdown(rawRoadmapContent), []);

  // Filter sections and items based on search query
  const filteredSections = useMemo(() => {
    if (!searchQuery.trim()) return sections;
    const q = searchQuery.toLowerCase();

    return sections
      .map((sec) => ({
        ...sec,
        items: sec.items.filter(
          (item) =>
            item.title.toLowerCase().includes(q) ||
            item.date?.toLowerCase().includes(q) ||
            item.subItems.some((sub) => sub.toLowerCase().includes(q))
        ),
      }))
      .filter((sec) => sec.items.length > 0);
  }, [sections, searchQuery]);

  // Safe back navigation: returns to previous browser history or defaults to /
  const handleBack = () => {
    if (typeof window !== "undefined" && window.history.length > 1) {
      window.history.back();
    } else {
      router.navigate({ to: "/", params: {} });
    }
  };

  return (
    <div className="min-h-screen bg-background text-foreground transition-colors">
      {/* Sticky Sub-Header with Navigation and Search Controls */}
      <header className="sticky top-0 z-30 border-b border-border bg-card/85 backdrop-blur-md">
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-3 px-4 py-3 sm:px-6">
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={handleBack}
              aria-label="Back to previous page"
              className="gap-1.5 font-medium"
            >
              <ArrowLeft className="h-4 w-4" />
              <span>Back</span>
            </Button>
            <div className="h-4 w-px bg-border hidden sm:block" />
            <h1 className="font-display text-lg font-bold tracking-tight sm:text-xl">
              Development Roadmap & Releases History
            </h1>
          </div>
        </div>
      </header>

        {/* Sections Listing */}
        <div className="space-y-10">
          {filteredSections.map((sec) => {
            const Icon = sec.icon;
            return (
              <section key={sec.title} className="space-y-4">
                {/* Section Header */}
                <div className="border-b border-border pb-2.5">
                  <div className="flex items-center gap-2">
                    <Icon className="h-5 w-5 text-primary" />
                    <h3 className="font-display text-xl font-bold text-foreground">
                      {sec.title}
                    </h3>
                    <span className="ml-auto rounded-full bg-secondary px-2.5 py-0.5 text-xs font-semibold text-secondary-foreground">
                      {sec.items.length} {sec.items.length === 1 ? "item" : "items"}
                    </span>
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground">{sec.description}</p>
                </div>

                {/* Section Items Grid */}
                <div className="space-y-3">
                  {sec.items.map((item) => (
                    <div
                      key={item.id}
                      className="group rounded-xl border border-border/80 bg-card p-4 transition-all hover:border-border hover:shadow-md"
                    >
                      <div className="flex items-start gap-3">
                        {/* Status Checkbox / Completion Icon */}
                        <div className="mt-0.5 shrink-0">
                          {item.completed ? (
                            <CheckCircle2 className="h-5 w-5 text-emerald-500" />
                          ) : (
                            <div className="h-5 w-5 rounded-md border-2 border-muted-foreground/40" />
                          )}
                        </div>

                        {/* Item Details */}
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-2">
                            {/* Date Badge */}
                            {item.date && (
                              <span className="inline-flex items-center rounded-md bg-secondary/80 px-2 py-0.5 font-mono text-xs text-muted-foreground">
                                {item.date}
                              </span>
                            )}

                            {/* Scanner Risk Badges */}
                            {item.badge === "Critical" && (
                              <span className="inline-flex items-center rounded-md bg-destructive/15 px-2 py-0.5 font-mono text-xs font-semibold text-destructive">
                                Critical
                              </span>
                            )}
                            {item.badge === "Warning" && (
                              <span className="inline-flex items-center rounded-md bg-amber-500/15 px-2 py-0.5 font-mono text-xs font-semibold text-amber-600 dark:text-amber-400">
                                Warning
                              </span>
                            )}

                            {/* Item Title */}
                            <h4
                              className={`text-sm font-semibold leading-snug sm:text-base ${
                                item.completed
                                  ? "text-foreground"
                                  : "text-foreground font-medium"
                              }`}
                            >
                              {item.title}
                            </h4>
                          </div>

                          {/* Sub-items Checklist */}
                          {item.subItems.length > 0 && (
                            <ul className="mt-2.5 space-y-1.5 border-l-2 border-border/60 pl-3.5 text-xs text-muted-foreground">
                              {item.subItems.map((sub, idx) => (
                                <li key={idx} className="leading-relaxed">
                                  {sub}
                                </li>
                              ))}
                            </ul>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            );
          })}

          {filteredSections.length === 0 && (
            <div className="rounded-xl border border-dashed border-border py-12 text-center text-sm text-muted-foreground">
              No roadmap items match "{searchQuery}".
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
