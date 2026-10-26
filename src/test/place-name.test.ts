import { describe, expect, it } from "vitest";
import { formatPlaceName, nameFromGmapsUrl } from "@/lib/restaurants";

describe("formatPlaceName", () => {
  it("moves the Plus Code into brackets and drops the address", () => {
    expect(formatPlaceName("QMPW+5WC One Baht Rice Porridge, Tha Hin, Lopburi 15000")).toBe("One Baht Rice Porridge [QMPW+5WC]");
  });
  it("strips the address when there is no Plus Code", () => {
    expect(formatPlaceName("Choch@SongWat, 1192 Song Wat Rd, Bangkok 10100")).toBe("Choch@SongWat");
  });
  it("handles encoded place URLs", () => {
    expect(nameFromGmapsUrl("https://www.google.com/maps/place/QMPW%2B5WC+One+Baht+Rice+Porridge,+Lopburi/@14.8,100.6,17z")).toBe("One Baht Rice Porridge [QMPW+5WC]");
  });
});
