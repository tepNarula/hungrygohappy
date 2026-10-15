import { describe, expect, it } from "vitest";
import { knownVisitDates, recentVisitCount, loadRestaurants, saveRestaurants, type Restaurant } from "@/lib/restaurants";

const restaurant: Restaurant = { id: "https://maps.google.com/maps?q=Cafe", googleMapsUrl: "https://maps.google.com/maps?q=Cafe" };

describe("Restaurant visit history", () => {
  it("counts only dates in the last three months, inclusive", () => {
    const now = new Date("2026-10-15T12:00:00Z");
    expect(recentVisitCount({ ...restaurant, visitDates: ["2026-07-15T12:00:00Z", "2026-10-15T12:00:00Z", "2026-07-15T11:59:59Z", "2026-10-16T12:00:00Z", "invalid"] }, now)).toBe(2);
  });
  it("uses only the known last visit for legacy data", () => {
    const legacy = { ...restaurant, visits: 20, lastVisitedAt: "2026-10-01T12:00:00Z" };
    expect(knownVisitDates(legacy)).toEqual([legacy.lastVisitedAt]);
    expect(recentVisitCount(legacy, new Date("2026-10-15T12:00:00Z"))).toBe(1);
    expect(recentVisitCount({ ...restaurant, visits: 20 })).toBe(0);
  });
  it("preserves history across storage reloads", () => {
    const entry = { ...restaurant, visitDates: ["2026-10-01T12:00:00Z"] };
    saveRestaurants([entry]);
    expect(loadRestaurants()[0]?.visitDates).toEqual(entry.visitDates);
  });
  it("clamps month-end boundaries", () => {
    const now = new Date(2026, 4, 31, 12);
    expect(recentVisitCount({ ...restaurant, visitDates: [new Date(2026, 1, 28, 12).toISOString(), new Date(2026, 1, 28, 11).toISOString()] }, now)).toBe(1);
  });
});