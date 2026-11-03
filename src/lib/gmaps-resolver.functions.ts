import { createServerFn } from "@tanstack/react-start";
import { expandShortlink, extractListId, fetchGmapsList, RateLimitedError } from "@/lib/gmaps-core";
import { formatPlaceName, isValidGmapsUrl, nameFromGmapsUrl, type PlaceMeta } from "@/lib/restaurants";

export interface ResolvedPlaces {
  listTitle?: string | undefined;
  listId?: string | undefined;
  places: Array<{ url: string; name?: string | undefined; meta?: PlaceMeta | undefined }>;
  error?: string | undefined;
}

const BUSY = "Google Maps is busy right now. Please wait a minute and try again.";

/** Resolve any Google Maps link (place, shortlink, or shared list) into places. */
export const resolveGmapsLink = createServerFn({ method: "POST" })
  .inputValidator((input: { url: string }) => {
    const url = String(input?.url ?? "").trim();
    if (!url || url.length > 2000) throw new Error("Invalid link");
    return { url };
  })
  .handler(async ({ data }): Promise<ResolvedPlaces> => {
    let parsed: URL;
    try {
      parsed = new URL(data.url);
    } catch {
      return { places: [], error: "That doesn't look like a link." };
    }
    if (parsed.protocol !== "https:" || !isValidGmapsUrl(data.url)) return { places: [], error: "Please paste a Google Maps HTTPS link." };

    let finalUrl = data.url;
    try {
      finalUrl = await expandShortlink(data.url);
    } catch (e) {
      if (e instanceof RateLimitedError) return { places: [], error: BUSY };
      console.error("gmaps resolve failed", e);
      return { places: [], error: "Couldn't resolve that Google Maps link. Please try again." };
    }

    const listId = extractListId(finalUrl);
    if (listId) {
      try {
        const { title, places } = await fetchGmapsList(listId);
        return { listTitle: title, listId, places: places.map((p) => ({ url: p.url, name: formatPlaceName(p.name), meta: { placeId: p.placeId } })) };
      } catch (e) {
        console.error("gmaps list fetch failed", e);
        if (e instanceof RateLimitedError) return { places: [], error: BUSY };
        return { places: [], error: "This list is private or could not be found. Check that link sharing is enabled." };
      }
    }

    const isPlace = /\/maps\/place\//.test(finalUrl) || /[?&]q(uery)?=/.test(finalUrl);
    const url = isPlace ? finalUrl.split("?entry=")[0] ?? finalUrl : finalUrl;
    return { places: [{ url, name: nameFromGmapsUrl(url) ?? undefined }] };
  });
