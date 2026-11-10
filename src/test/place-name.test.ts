/**
 * Place Name Formatting & Display URL Truncation Test Suite
 * =========================================================
 * Validates place name normalization, Google Plus Code extraction,
 * URL decoding, and display-only string truncation for the Review dialog.
 */

import { describe, expect, it } from "vitest";
import { formatPlaceName, nameFromGmapsUrl, truncateForDisplay } from "@/lib/restaurants";

describe("formatPlaceName", () => {
  it("moves the Plus Code into brackets and drops the address", () => {
    // Intent: When Google returns a name containing an address with a Plus Code,
    // format as 'Name [PlusCode]' so users can identify the exact branch.
    expect(
      formatPlaceName("QMPW+5WC One Baht Rice Porridge, Tha Hin, Lopburi 15000")
    ).toBe("One Baht Rice Porridge [QMPW+5WC]");
  });

  it("strips the address when there is no Plus Code", () => {
    // Intent: Retain only the establishment title when no Plus Code is detected.
    expect(
      formatPlaceName("Choch@SongWat, 1192 Song Wat Rd, Bangkok 10100")
    ).toBe("Choch@SongWat");
  });

  it("handles encoded place URLs", () => {
    // Intent: Safely extract and decode place names encoded inside Google Maps URLs.
    expect(
      nameFromGmapsUrl(
        "https://www.google.com/maps/place/QMPW%2B5WC+One+Baht+Rice+Porridge,+Lopburi/@14.8,100.6,17z"
      )
    ).toBe("One Baht Rice Porridge [QMPW+5WC]");
  });
});

describe("truncateForDisplay", () => {
  it("leaves strings at or below the default 60-character limit untouched", () => {
    // Short URL under 60 characters should not have an ellipsis appended
    const shortUrl = "https://maps.app.goo.gl/siLyWLNfACfMe4GT6";
    expect(truncateForDisplay(shortUrl)).toBe(shortUrl);

    // Exactly 60 characters boundary check
    const exact60Chars = "https://example.com/restaurants/list/subpath/item/exactly60ch";
    expect(exact60Chars.length).toBe(60);
    expect(truncateForDisplay(exact60Chars)).toBe(exact60Chars);
  });

  it("truncates strings exceeding 60 characters to 60 characters with trailing ellipsis", () => {
    // Intent: Prevent wide URLs from expanding table and dialog columns beyond viewport
    const longUrl = "https://www.google.com/maps/place/CentralWorld,+999%2F9+Rama+I+Rd,+Pathum+Wan,+Bangkok+10330";
    expect(longUrl.length).toBeGreaterThan(60);

    const truncated = truncateForDisplay(longUrl);
    // Verifies the slice takes first 60 characters and appends 3 dots
    expect(truncated).toBe(`${longUrl.slice(0, 60)}...`);
    expect(truncated.endsWith("...")).toBe(true);
  });

  it("respects a custom maximum character limit parameter", () => {
    // Intent: Support varying thresholds for tight mobile cards or wider desktop views
    const sampleText = "The quick brown fox jumps over the lazy dog";
    const customLimit = 16;
    expect(truncateForDisplay(sampleText, customLimit)).toBe("The quick brown ...");
  });

  it("handles empty or blank strings safely", () => {
    // Defensively ensures zero-length input does not throw or return ellipses
    expect(truncateForDisplay("")).toBe("");
  });
});
