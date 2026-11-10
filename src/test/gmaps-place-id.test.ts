/** Regression coverage for Google's signed 64-bit place-ID representation. */
import { afterEach, describe, expect, it, vi } from "vitest";
import { fetchPlaceHours, normalizePlaceId, toHexId } from "@/lib/gmaps-core";

/** Restore the global request mock after each isolated helper test. */
afterEach(() => { vi.unstubAllGlobals(); });

/** Canonical ID used by a real place whose low half has its sign bit set. */
const CANONICAL_ID = "0x3102bf84957100fd:0xe4dffd4135acd87c";

describe("Google Maps place IDs", () => {
  it("converts signed decimal halves to canonical unsigned hexadecimal", () => {
    // Recreate the signed decimals returned by Google for both canonical 64-bit halves.
    const signedPair = CANONICAL_ID.split(":").map((half) => String(BigInt.asIntN(64, BigInt(half))));
    // The conversion must never leak a minus sign into the resulting place ID.
    expect(toHexId(signedPair)).toBe(CANONICAL_ID);
  });

  it("normalizes legacy signed hexadecimal IDs produced by earlier imports", () => {
    // This is the exact malformed low-half shape produced by BigInt#toString before the fix.
    const legacyId = "0x3102bf84957100fd:0x-1b2002beca532784";
    // Existing database rows therefore work without a destructive data migration.
    expect(normalizePlaceId(legacyId)).toBe(CANONICAL_ID);
  });

  it("keeps valid IDs unchanged and rejects malformed input", () => {
    // Canonical IDs should remain stable through validation and repeated normalization.
    expect(normalizePlaceId(CANONICAL_ID)).toBe(CANONICAL_ID);
    // Non-ID input must not be fetched or treated as a place identifier.
    expect(normalizePlaceId("not-a-place-id")).toBeUndefined();
    expect(normalizePlaceId(undefined)).toBeUndefined();
  });

  it("requests place details directly with a normalized legacy ID", async () => {
    // A minimal JSON payload keeps the network mock independent of Google's response fixture.
    const fetchMock = vi.fn(async () => new Response("null", { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);
    // The search URL has no feature ID, forcing the lookup to use its legacy placeId argument.
    await fetchPlaceHours(
      "https://www.google.com/maps/search/?api=1&query=Backstreet%20House%20Pattaya",
      "0x3102bf84957100fd:0x-1b2002beca532784",
    );
    // Exactly one direct detail request avoids the intermittently blocked place HTML page.
    expect(fetchMock).toHaveBeenCalledTimes(1);
    const requestUrl = String(fetchMock.mock.calls[0]?.[0]);
    expect(requestUrl).toContain("/maps/preview/place?");
    expect(requestUrl).not.toContain("/maps/place/data=");
    // Decoding the protobuf query confirms the canonical unsigned ID reached the request.
    expect(decodeURIComponent(requestUrl)).toContain(CANONICAL_ID);
  });
});
