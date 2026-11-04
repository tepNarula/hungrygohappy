/** Manual and daily sync must preserve custom labels and avoid duplicate places. */
import { describe, expect, it } from "vitest";
import { planGmapsSync } from "@/lib/gmaps-sync-plan";

describe("Shared sync planner", () => {
  it("preserves a custom name while advancing the Google name baseline", () => {
    const url = "https://www.google.com/maps/place/Cafe";
    const plan = planGmapsSync([{ id: url, googleMapsUrl: url, name: "Our lunch spot", gmapsName: "Cafe" }], [{ id: url, googleMapsUrl: url, name: "New Cafe" }], "source");
    expect(plan.added).toEqual([]);
    expect(plan.updates[0]?.name).toBe("Our lunch spot");
    expect(plan.updates[0]?.gmapsName).toBe("New Cafe");
  });
  it("keeps an unknown nonempty name baseline rather than guessing ownership", () => {
    const url = "https://www.google.com/maps/place/Cafe";
    const plan = planGmapsSync([{ id: url, googleMapsUrl: url, name: "Our lunch spot" }], [{ id: url, googleMapsUrl: url, name: "New Cafe" }], "source");
    expect(plan.updates[0]?.name).toBe("Our lunch spot");
  });
});