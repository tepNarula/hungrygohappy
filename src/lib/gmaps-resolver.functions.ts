import { createServerFn } from "@tanstack/react-start";
import { extractListId, fetchGmapsList, politeFetch, RateLimitedError } from "@/lib/gmaps-core";
import { nameFromGmapsUrl } from "@/lib/restaurants";

export interface ResolvedPlaces {
  listTitle?: string | undefined;
  listId?: string | undefined;
  places: Array<{ url: string; name?: string | undefined }>;
  error?: string | undefined;
}

const BUSY = "Google Maps is busy right now. Please wait a minute and try again.";

function isGoogleHost(u: URL) {
  return /(^|\.)google\.[a-z.]+$/.test(u.hostname) || u.hostname === "maps.app.goo.gl" || u.hostname === "goo.gl";
}

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
    if (!isGoogleHost(parsed)) return { places: [], error: "Please paste a Google Maps link." };

    let finalUrl = data.url;
    try {
      const res = await politeFetch(data.url, { redirect: "follow" });
      finalUrl = res.url || data.url;
    } catch (e) {
      if (e instanceof RateLimitedError) return { places: [], error: BUSY };
      console.error("gmaps resolve failed", e);
    }

    const listId = extractListId(finalUrl);
    if (listId) {
      try {
        const { title, places } = await fetchGmapsList(listId);
        return { listTitle: title, listId, places };
      } catch (e) {
        console.error("gmaps list fetch failed", e);
        if (e instanceof RateLimitedError) return { places: [], error: BUSY };
        return { places: [], error: "This list is private or could not be found. Check that link sharing is enabled." };
      }
    }

    const isPlace = /\/maps\/place\//.test(finalUrl) || /[?&]q(uery)?=/.test(finalUrl);
    const url = isPlace ? finalUrl.split("?entry=")[0]! : data.url;
    return { places: [{ url, name: nameFromGmapsUrl(url) ?? undefined }] };
  });
