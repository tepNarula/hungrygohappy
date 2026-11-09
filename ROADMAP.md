# Roadmap

## Partially Implemented / Unverified

- [ ] (2026-11-09) Location metadata & place opening hours pipeline:
  - [x] (2026-11-09) Pre-spin location filter (match counter, city/province chips, text input) limits spin candidates — verified in browser (217 → 12 for "bangkok")
  - [x] (2026-11-09) Result screen shows location under the name and an opening-status badge; "Back to Roulette" left of "Let's Go!" — verified in browser
  - [x] (2026-11-09) Unit tests `src/test/location-filter.test.ts` (6 tests)
  - [ ] Opening hours lookup returned "Hours unlisted" for the tested place; verify `getPlaceHours` actually extracts hours from Google
- [ ] (2026-11-03) Comprehensive educational code documentation:
  - [x] Explanatory comments added to new test and utility files (including `cloud-sync`, `gmaps-resolver`, `gmaps-sync-plan`, `restaurants`, `refresh-gmaps-lists`, `location-filter`)
  - [ ] Retrofit educational docstrings and control-flow explanations across all pre-existing source files

---

## Pending Security Issues Found by Lovable Scanner

- [ ] (2026-11-03) [Critical] Anyone can delete any record in `gmaps_list_sources` (`RLS_EXPOSURE`). Unresolved: user explicitly chose to keep group-link deletion on 2026-11-03.
- [ ] (2026-11-03) [Warning] Anyone can delete any record in `restaurants` (`RLS_EXPOSURE`). Unresolved: user explicitly chose to keep group-link deletion on 2026-11-03.

---

## Pending Fixes, Features, and Enhancements

- [ ] (2026-11-09) List share URL QR code display:
  - [ ] Display the list's full shareable URL as a scannable QR code on the Share dialog so users can quickly share the list in person with nearby smartphone users
- [ ] (2026-11-05) Test suite documentation (`/src/test/README.md`):
  - [ ] Maintain a markdown document `/src/test/README.md` describing the purposes, coverage, and design of all source files under the `/src/test/` directory
- [ ] (2026-11-05) Test suite inventory & test scripts directory structure:
  - [ ] Maintain an inventory of all unit tests and test-script source files (ever developed and used) in the repository under `/src/test/`
  - [ ] Move deprecated/obsolete test source files into subdirectory `/src/test/deprecated/`
  - [ ] Keep stand-alone executable Python test scripts under `/src/test/python-scripts/`
- [ ] (2026-11-05) Shared list import & tracked sync polish:
  - [ ] Set initial `last_synced_at` timestamp on newly registered tracked sources (currently shows "Not synced yet" upon first import until manual/cron sync)
  - [ ] Fix Tracked Lists Dialog UI state lag when refreshing individual source (local React state does not immediately reflect updated timestamp without closing/reopening)
  - [ ] Expose extracted location details in the Import Preview dialog (display parsed city/province/country alongside name and URL)
  - [ ] Support country inference in `parseAddress()` when Google Maps address omits country token (e.g. Bangkok addresses with postal code `10xxx` infer Thailand)
- [ ] (2026-11-02) Dedicated "All Restaurants" full page:
  - [ ] Move from slide-out Gear drawer to dedicated full-page route (`/{list}/places`)
  - [ ] Include back navigation, sorting, and inline editing/deletion
- [ ] (2026-11-02) Top-left header controls:
  - [ ] Default to dark theme on initial visit
  - [ ] Sun/Moon theme switcher toggle button at top-left of every page
  - [ ] Desktop/Mobile viewport frame toggle button next to theme switcher
- [ ] (2026-11-02) "Review before adding" dialog polish:
  - [ ] Add unit tests in `src/test/place-name.test.ts` validating `truncateForDisplay()` (60-character default threshold, trailing ellipsis, short-URL pass-through, custom `max` override)
  - [ ] Allow dialog width to scale up to 90% of the viewport (`max-w-[90vw]`) to maximize content visibility
  - [ ] Stack primary "Add {N}" button vertically on top of "Cancel" button
  - [ ] Support multi-line word-wrapping for reviewed place names
- [ ] (2026-11-02) Database schema & dependency documentation:
  - [ ] Create dedicated `SCHEMA.md` documenting tables, columns, constraints, and RLS policies
  - [ ] Reference and link `SCHEMA.md` from `README.md`
  - [ ] Maintain an inventory of all software-library & cloud-service dependencies in `README.md`
- [ ] (2026-11-02) Development Roadmap & Releases History page:
  - [x] Add "Development Roadmap & Releases History" link at the bottom of the Gear menu drawer
  - [ ] Dedicated `/roadmap` page displaying HTML-rendered view of `ROADMAP.md` with return navigation

---

## Completed Features

- [x] (2026-11-09) Prebuild chatlog records in `/dev-logs`:
  - [x] (2026-11-09) Reconstructed, clearly labeled historical chatlogs for all earlier builds (2026-10-14, 10-15, 10-16, 10-19, 10-20, 10-22, 10-26, 11-02, 11-04, 11-05 14:15 ICT)
  - [x] (2026-11-09) Created `dev-logs/20261109-145400_ICT_prebuild_chatlog.md` and `dev-logs/20261109-150100_ICT_prebuild_chatlog.md`
  - [x] (2026-11-05) Created `dev-logs/20261105-140834_ICT_prebuild_chatlog.md`
  - [x] (2026-11-03) Created `dev-logs/20261103-112700_ICT_prebuild_chatlog.md`
- [x] (2026-11-05) Tracked Google Maps lists manager & resolver resilience:
  - [x] (2026-11-04) Code implemented: `TrackedListsDialog.tsx`, cloud sync functions (`fetchTrackedSources`, `deleteTrackedSource`, `addTrackedSource`), contextual headers and jittered backoff in `gmaps-core.ts`
  - [x] (2026-11-04) Unit and integration test suite passing (7 tests in `gmaps-retries.test.ts`, `gmaps-sync-plan.test.ts`, and `tracked-sources.test.ts`)
  - [x] (2026-11-05) Live browser end-to-end verification passed (17-place shared list import, tracking registration, multi-device sync)
- [x] (2026-11-04) Display-only preview URL truncation threshold adjusted to 60 characters (manual commits: `truncateForDisplay` default in `src/lib/restaurants.ts`, wired into `src/components/ImportPreview.tsx`)
- [x] (2026-11-03) Importer reliability & deduplication (Batch 1 — verified live in browser):
  - [x] (2026-11-03) Display-only URL truncation to 80 characters with trailing ellipses in preview
  - [x] (2026-11-03) Custom-name-safe sync planner (`planGmapsSync` protecting user-renamed places)
  - [x] (2026-11-03) Cross-format place deduplication by normalized URL and name (verified live: flags duplicate places, deselects, updates button count)
  - [x] (2026-11-03) Shared-list source duplicate prevention (verified live: detects already-tracked list and offers "Sync now")
  - [x] (2026-11-03) Mobile Google Maps shortlink manual 302 redirection (verified live: resolved 115 places without rate limits)
- [x] (2026-11-03) CSV export formula neutralization (`safeSpreadsheetText` prepending `'` on export and preview confirmation)
- [x] (2026-11-03) Active ImportPreview JSX fix: valid className for flex layout
- [x] (2026-11-02) Mobile Google Maps shortlink resolver: Manual 302 redirect handling reading `Location` header directly to bypass 429 rate-limiting
- [x] (2026-10-26) Resolver browser headers + HTTP 429 retry backoff + "Google Maps is busy" message
- [x] (2026-10-26) List-sharing tip in Add dialog
- [x] (2026-10-26) Single-place names formatted as "{name} [{plusCode}]"
- [x] (2026-10-26) Daily auto-refresh of imported Google Maps lists (03:00 Bangkok)
- [x] (2026-10-22) "Copy to another list" in Share dialog (existing or new target, keep-history vs start-fresh choice, duplicate skip, cloud sync)
- [x] (2026-10-20) Cloud sync across devices
- [x] (2026-10-20) FAQ homepage ("Hungry? Let's Go Happy!")
- [x] (2026-10-19) Edit/delete mode in All restaurants
- [x] (2026-10-19) + Add dialog (Google Maps link/list + CSV) with inline name editing
- [x] (2026-10-16) Group-code lists (/{code}, /{code}/add)
- [x] (2026-10-16) Share dialog + CSV download
- [x] (2026-10-16) Verify menu, sorting, and visit recording
- [x] (2026-10-15) Full sortable restaurant list with map links and three-month visit counts
- [x] (2026-10-15) Update spin label ("Where To Eat/Drink Today?") and limit gear menu to five restaurants
- [x] (2026-10-15) Spin result: mini map, Let's Go, re-spin, reset
- [x] (2026-10-15) Import preview for all add channels
- [x] (2026-10-15) Changed restaurant data schema: Google Maps URL as primary unique key, name optional / auto-retrieved
- [x] (2026-10-14) /add?gmapslink=... route to add a restaurant via URL parameter (verified: name extracted, duplicate detected)
- [x] (2026-10-14) CSV upload for adding restaurants (verified: 3-row CSV imported, dedupe works)
- [x] (2026-10-14) Rebuild Hungry Roulette (cream bg, chunky orange button, settings gear)
