# Roadmap

## Pending Security Issues Found by Lovable Scanner

- [ ] (2026-11-03) [Critical] Anyone can delete any record in `gmaps_list_sources` (`RLS_EXPOSURE`). Unresolved: user explicitly chose to keep group-link deletion on 2026-11-03.
- [ ] (2026-11-03) [Warning] Anyone can delete any record in `restaurants` (`RLS_EXPOSURE`). Unresolved: user explicitly chose to keep group-link deletion on 2026-11-03.

---

## Pending Features & Enhancements

- [ ] (2026-11-02) Location metadata & spin filtering:
  - [ ] Fetch, extract, and sync city, province, postal code, and country during import
  - [ ] Pre-spin screen: Location filter input widget positioned below Live Match Counter and Quick Suggestion Chips
  - [ ] Spin result screen: Display location metadata under place name
- [ ] (2026-11-02) Real-time opening schedule & status badges:
  - [ ] Check place opening hours against client device's local time
  - [ ] Display status badge: Currently open (upcoming closing time), Opening soon (within 60m), Closing soon (within 60m), or Currently closed (next opening day & time / temporarily / permanently closed)
  - [ ] Result screen button layout: Place "Back to Roulette" button to the left of "Let's Go!" button
- [ ] (2026-11-02) Dedicated "All Restaurants" full page:
  - [ ] Move from slide-out Gear drawer to dedicated full-page route (`/{list}/places`)
  - [ ] Include back navigation, sorting, and inline editing/deletion
- [ ] (2026-11-02) Top-left header controls:
  - [ ] Default to dark theme on initial visit
  - [ ] Sun/Moon theme switcher toggle button at top-left of every page
  - [ ] Desktop/Mobile viewport frame toggle button next to theme switcher
- [ ] (2026-11-02) "Review before adding" dialog polish:
  - [ ] Allow dialog width to scale up to 90% of the viewport (`max-w-[90vw]`) to maximize content visibility
  - [ ] Stack primary "Add {N}" button vertically on top of "Cancel" button
  - [ ] Support multi-line word-wrapping for reviewed place names
- [ ] (2026-11-02) Database schema & dependency documentation:
  - [ ] Create dedicated `SCHEMA.md` documenting tables, columns, constraints, and RLS policies
  - [ ] Reference and link `SCHEMA.md` from `README.md`
  - [ ] Maintain an inventory of all software-library & cloud-service dependencies in `README.md`
- [ ] (2026-11-02) Development Roadmap & Releases History page:
  - [ ] Add "Development Roadmap & Releases History" link at the bottom of the Gear menu drawer
  - [ ] Dedicated `/roadmap` page displaying HTML-rendered view of `ROADMAP.md` with return navigation

---

## Partially Implemented / Unverified

- [ ] (2026-11-04) Tracked Google Maps lists manager & resolver resilience:
  - [x] (2026-11-04) Code implemented: `TrackedListsDialog.tsx`, cloud sync functions (`fetchTrackedSources`, `deleteTrackedSource`, `addTrackedSource`), contextual headers and jittered backoff in `gmaps-core.ts`
  - [x] (2026-11-04) Unit and integration test suite passing (7 tests in `gmaps-retries.test.ts`, `gmaps-sync-plan.test.ts`, and `tracked-sources.test.ts`)
  - [ ] End-to-end live browser verification with live Google Maps shared lists and sync workflows
- [ ] (2026-11-03) Prebuild chatlog records in `/dev-logs`:
  - [x] (2026-11-03) Created `dev-logs/20261103-112700_ICT_prebuild_chatlog.md`
  - [ ] Reconstruct historical prebuild chatlogs for earlier builds in `/dev-logs`
  - [ ] Log prebuild chat transcript for the 2026-11-04 build turn
- [ ] (2026-11-03) Comprehensive educational code documentation:
  - [x] Explanatory comments added to new test and utility files
  - [ ] Retrofit educational docstrings and control-flow explanations across all pre-existing source files
- [ ] (2026-11-02) Database foundation for location fields & place opening hours parser:
  - [x] (2026-11-02) Database columns (`city`, `province`, `postal_code`, `country`, `gmaps_place_id`) and `src/lib/opening-hours.ts` added to codebase
  - [ ] Wire location extraction into import flow, UI candidate filter, and opening status badges

---

## Completed Features

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
