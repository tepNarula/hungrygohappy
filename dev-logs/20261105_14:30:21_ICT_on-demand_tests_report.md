# On-demand Tests Report 2026-11-05 14:30:21 ICT

## Overview
- **Target URL Tested:** `https://maps.app.goo.gl/siLyWLNfACfMe4GT6?g_st=ac`
- **List ID Resolved:** `ZE2rDgElimHfygYw6nnn8savEZVeJg`
- **List Name:** `YnxLunchRoulette` (17 places)
- **Test Scope:** (i) Live shortlink expansion, list parsing, preview confirmation, tracking, and manual refresh against Google Maps; (ii) Cross-device synchronization of list rows and parsed location attributes across independent browser sessions.

---

## Test (i): Importing & Refreshing a Real Shared Google Maps List

### What Succeeded
1. **Shortlink & Redirect Resolution:** The server-side resolver correctly resolved the 302 HTTP redirect for `https://maps.app.goo.gl/siLyWLNfACfMe4GT6`, extracted the canonical list ID (`ZE2rDgElimHfygYw6nnn8savEZVeJg`), and fetched all 17 places without triggering HTTP 429 rate limits.
2. **Entity Metadata Extraction:** All 17 places were extracted with place names, addresses, Google Place IDs (`0x...:0x...`), and Google Maps place URLs.
3. **Import Confirmation & Storage:** The "Review before adding" dialog showed "Add 17". Confirming the import successfully persisted all 17 rows to the Cloud database under the list code.
4. **Source Registration:** The list source was recorded in `gmaps_list_sources` with title `YnxLunchRoulette` and the source URL.
5. **Live Refresh Execution:** Executing "Refresh" from the Tracked Lists dialog triggered a fresh scrape of Google Maps and successfully updated the source's `last_synced_at` timestamp in the database (`2026-11-05T07:30:21.926+00:00`).

### Issues Found
1. **Tracked Source Shows "Not synced yet" Immediately After Initial Import:**
   - **Behavior:** When a list is first added via the Add dialog, `registerListSource()` writes `{ list_code, gmaps_list_id, source_url, title }` leaving `last_synced_at` as `null`.
   - **Impact:** Opening the Tracked Lists dialog right after a successful import displays *"Last sync: Not synced yet"*, even though all items were just fetched.
2. **Tracked Lists Dialog UI State Lag After Refresh:**
   - **Behavior:** In `TrackedListsDialog.tsx`, clicking the per-row "Refresh" button performs the sync and updates `gmaps_list_sources` in the database, but the dialog's local React state does not re-render with the new timestamp until the dialog is closed and re-opened.
3. **Missing Country Field When Address Omits Explicit Country:**
   - **Behavior:** For all 17 imported places, Google returned address strings formatted like `"9/3 Nang Linchi 4 Alley, Thung Maha Mek, Sathon, Bangkok 10120"`.
   - **Impact:** `parseAddress()` successfully extracted `city` (`"Sathon"`), `province` (`"Bangkok"`), and `postalCode` (`"10120"`), but `country` remained `null` for all 17 rows because Thailand is not explicitly written in the string.
4. **Import Preview Does Not Expose Extracted Location Data:**
   - **Behavior:** In `ImportPreview.tsx`, the review list only displays the restaurant name and truncated URL.
   - **Impact:** Users cannot verify whether city, province, or postal code was successfully parsed before confirming the import.

---

## Test (ii): Location Data Syncing Across Devices

### What Succeeded
1. **Cloud Database Column Persistence:** All 17 places were stored in the `restaurants` table with populated location columns (`city: "Sathon"`, `province: "Bangkok"`, `postal_code: "10120"`).
2. **Cross-Device Cloud Fetch:** When a second, completely isolated browser context (Device 2, zero local cache) navigated to `/{list}`, `fetchCloudList()` retrieved all 17 restaurants and their location attributes.
3. **Local Cache Sync:** Device 2 populated its local storage key (`hungry-roulette-restaurants:{list}`) with the complete 17-item payload, including `city`, `province`, and `postalCode`.
4. **Cross-Device Tracked List Visibility:** Device 2 opened the Tracked Lists dialog and displayed `YnxLunchRoulette` along with its updated sync timestamp (`11/5/2026, 7:30:21 AM`).

### Issues Found
1. **Location Metadata is Entirely Dormant in the Roulette UI:**
   - **Pre-spin screen:** There is no location filter input widget to restrict roulette candidates by city, province, or postal code.
   - **Spin result screen:** When a place is picked, `RoulettePage.tsx` only renders the place name and mini-map; `locationLabel(picked)` is never displayed.
   - **Restaurant list drawer:** The "Your restaurants" and "All restaurants" drawers do not display location information.
2. **Real-time Opening Schedule & Status Badges are Inactive in the UI:**
   - **Behavior:** The `getPlaceHours` server function exists in `gmaps-resolver.functions.ts` and the status evaluator exists in `opening-hours.ts`, but `RoulettePage.tsx` does not invoke `getPlaceHours` or render any open, opening-soon, closing-soon, or closed status badges on spin results.
