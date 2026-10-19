import { createServerFn } from "@tanstack/react-start";

export interface ResolvedPlaces {
  listTitle?: string | undefined;
  places: Array<{ url: string; name?: string | undefined }>;
  error?: string | undefined;
}

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
      const res = await fetch(data.url, { redirect: "follow", headers: { "User-Agent": "Mozilla/5.0" } });
      finalUrl = res.url || data.url;
    } catch (e) {
      console.error("gmaps resolve failed", e);
    }

    const listId =
      finalUrl.match(/!11m2!2s([A-Za-z0-9_-]+)/)?.[1] ??
      finalUrl.match(/placelists\/list\/([A-Za-z0-9_-]+)/)?.[1];

    if (listId) {
      try {
        const api = `https://www.google.com/maps/preview/entitylist/getlist?hl=en&pb=!1m4!1s${listId}!2e1!3m1!1e1!2e2!3e2!4i500!16b1`;
        const res = await fetch(api, { headers: { "User-Agent": "Mozilla/5.0" } });
        if (!res.ok) throw new Error(`status ${res.status}`);
        const text = await res.text();
        const json = JSON.parse(text.replace(/^\)\]\}'\s*/, ""));
        const items: unknown[] = json?.[0]?.[8] ?? [];
        const places = items.flatMap((it) => {
          const item = it as any[];
          const name: string | undefined = typeof item?.[2] === "string" ? item[2] : undefined;
          const coords = item?.[1]?.[5];
          const lat = coords?.[2];
          const lng = coords?.[3];
          if (!name) return [];
          const url =
            typeof lat === "number" && typeof lng === "number"
              ? `https://www.google.com/maps/place/${encodeURIComponent(name)}/@${lat},${lng},17z`
              : `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(name)}`;
          return [{ url, name }];
        });
        if (places.length === 0) throw new Error("empty");
        return { listTitle: typeof json?.[0]?.[4] === "string" ? json[0][4] : undefined, places };
      } catch (e) {
        console.error("gmaps list fetch failed", e);
        return { places: [], error: "This list is private or could not be found. Check that link sharing is enabled." };
      }
    }

    const url = /\/maps\/place\//.test(finalUrl) || /[?&]q(uery)?=/.test(finalUrl) ? finalUrl.split("?entry=")[0]! : data.url;
    return { places: [{ url }] };
  });
