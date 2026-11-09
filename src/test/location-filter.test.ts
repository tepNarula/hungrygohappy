/** Tests for spin-screen location filtering (src/lib/location-filter.ts). */
import { describe, expect, it } from "vitest";
import { filterByLocation, locationLabel, locationSuggestions } from "@/lib/location-filter";
import type { Restaurant } from "@/lib/restaurants";

// Minimal fixtures: only the fields the helpers read.
const a = { id: "a", googleMapsUrl: "https://maps.google.com/a", city: "Sathon", province: "Bangkok", postalCode: "10120", country: "Thailand" } as Restaurant;
const b = { id: "b", googleMapsUrl: "https://maps.google.com/b", city: "Mueang", province: "Chiang Mai", postalCode: "50200" } as Restaurant;
const c = { id: "c", googleMapsUrl: "https://maps.google.com/c" } as Restaurant;

describe("filterByLocation", () => {
  it("keeps every place when the filter is empty", () => {
    expect(filterByLocation([a, b, c], "  ")).toHaveLength(3);
  });
  it("matches province case-insensitively", () => {
    expect(filterByLocation([a, b, c], "chiang").map((r) => r.id)).toEqual(["b"]);
  });
  it("matches postal code", () => {
    expect(filterByLocation([a, b, c], "10120").map((r) => r.id)).toEqual(["a"]);
  });
  it("excludes places without location data when filtering", () => {
    expect(filterByLocation([c], "bangkok")).toEqual([]);
  });
});

describe("locationLabel", () => {
  it("joins known parts", () => {
    expect(locationLabel(a)).toBe("Sathon, Bangkok 10120, Thailand");
    expect(locationLabel(c)).toBe("");
  });
});

describe("locationSuggestions", () => {
  it("lists distinct city/province values", () => {
    expect(locationSuggestions([a, b, c]).sort()).toEqual(["Bangkok", "Chiang Mai", "Mueang", "Sathon"]);
  });
});
