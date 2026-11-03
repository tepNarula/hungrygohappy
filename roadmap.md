# Roadmap

## Completed Features

- [x] (2026-10-14) Rebuild Hungry Roulette (cream bg, chunky orange button, settings gear)
- [x] (2026-10-14) CSV upload for adding restaurants (verified: 3-row CSV imported, dedupe works)
- [x] (2026-10-14) /add?gmapslink=... route to add a restaurant via URL parameter (verified: name extracted, duplicate detected)
- [x] (2026-10-15) Changed restaurant data schema: Google Maps URL as primary unique key, name optional / auto-retrieved
- [x] (2026-10-15) Import preview for all add channels
- [x] (2026-10-15) Spin result: mini map, Let's Go, re-spin, reset
- [x] (2026-10-15) Update spin label ("Where To Eat/Drink Today?") and limit gear menu to five restaurants
- [x] (2026-10-15) Full sortable restaurant list with map links and three-month visit counts
- [x] (2026-10-16) Verify menu, sorting, and visit recording
- [x] (2026-10-16) Share dialog + CSV download
- [x] (2026-10-16) Group-code lists (/{code}, /{code}/add)
- [x] (2026-10-19) + Add dialog (Google Maps link/list + CSV) with inline name editing
- [x] (2026-10-19) Edit/delete mode in All restaurants
- [x] (2026-10-20) FAQ homepage ("Hungry? Let's Go Happy!")
- [x] (2026-10-20) Cloud sync across devices
- [x] (2026-10-22) "Copy to another list" in Share dialog (existing or new target, keep-history vs start-fresh choice, duplicate skip, cloud sync)
- [x] (2026-10-26) Daily auto-refresh of imported Google Maps lists (03:00 Bangkok)
- [x] (2026-10-26) Single-place names formatted as "{name} [{plusCode}]"
- [x] (2026-10-26) List-sharing tip in Add dialog
- [x] (2026-10-26) Resolver browser headers + HTTP 429 retry backoff + "Google Maps is busy" message
- [x] (2026-11-02) Database foundation for location fields (`city`, `province`, `postal_code`, `country`), place opening hours parser, and tracked list deletion RLS policy
- [x] (2026-11-02) Mobile Google Maps shortlink resolver: Manual 302 redirect handling reading `Location` header directly to bypass 429 rate-limiting
- [x] (2026-11-03) Active ImportPreview JSX fix: valid className for flex layout
- [x] (2026-11-03) CSV export formula neutralization (`safeSpreadsheetText` prepending `'` on export and preview confirmation)
- [x] (2026-11-03) Importer reliability & deduplication (Batch 1 — verified live in browser):
  - [x] (2026-11-03) Mobile Google Maps shortlink manual 302 redirection (verified live: resolved 115 places without rate limits)
  - [x] (2026-11-03) Shared-list source duplicate prevention (verified live: detects already-tracked list and offers "Sync now")
  - [x] (2026-11-03) Cross-format place deduplication by normalized URL and name (verified live: flags duplicate places, deselects, updates button count)
  - [x] (2026-11-03) Custom-name-safe sync planner (`planGmapsSync` protecting user-renamed places)
  - [x] (2026-11-03) Display-only URL truncation to 80 characters with trailing ellipses in preview
- [x] (2026-11-03) Dev-logs prebuild conversation log: Created `dev-logs/20261103-112700_ICT_prebuild_chatlog.md` with executive summary and complete chat history

---

## Pending Security Issues Found by Lovable Scanner

- [ ] [Critical] Anyone can delete any record in `gmaps_list_sources` (`RLS_EXPOSURE`). Unresolved: user explicitly chose to keep group-link deletion on 2026-11-03.
- [ ] [Warning] Anyone can delete any record in `restaurants` (`RLS_EXPOSURE`). Unresolved: user explicitly chose to keep group-link deletion on 2026-11-03.

---

## Pending Features & Enhancements

### Batch 2: Live Google Features, Opening Schedules & Roulette Filtering
- [ ] Tracked Google Maps lists manager:
  - [ ] Add button on Gear menu opening manager dialog/panel
  - [ ] View all synced lists and their last sync timestamps
  - [ ] Manual refresh for individual lists or all lists at once
  - [ ] Add new Google Maps shared list to tracked auto-sync sources
  - [ ] Remove existing tracked list(s)
- [ ] Real-time opening schedule & status badges:
  - [ ] Check place opening hours against client device's local time
  - [ ] Display status badge: Currently open (upcoming closing time), Opening soon (within 60m), Closing soon (within 60m), or Currently closed (next opening day & time / temporarily / permanently closed)
  - [ ] Result screen button layout: Place "Back to Roulette" button to the left of "Let's Go!" button
- [ ] Location metadata & spin filtering:
  - [ ] Fetch, extract, and sync city, province, postal code, and country during import
  - [ ] Pre-spin screen: Location filter input widget positioned below Live Match Counter and Quick Suggestion Chips
  - [ ] Spin result screen: Display location metadata under place name

### Batch 3: UI Shell, Dialog Polish, Header Controls & Documentation
- [ ] "Review before adding" dialog polish:
  - [ ] Stack primary "Add {N}" button above "Cancel" button vertically
  - [ ] Support multi-line word-wrapping for reviewed place names
- [ ] Top-left header controls:
  - [ ] Default to dark theme on initial visit
  - [ ] Sun/Moon theme switcher toggle button at top-left of every page
  - [ ] Desktop/Mobile viewport frame toggle button next to theme switcher
- [ ] Dedicated "All Restaurants" full page:
  - [ ] Move from slide-out Gear drawer to dedicated full-page route (`/{list}/places`)
  - [ ] Include back navigation, sorting, and inline editing/deletion
- [ ] Homepage FAQ improvements:
  - [ ] Make source code URL in "Can I get the sourcecode?" answer a clickable link opening in a new tab
- [ ] Prebuild chatlog records:
  - [ ] Reconstruct historical prebuild chatlogs for earlier builds in `/dev-logs`
- [ ] Database schema documentation:
  - [ ] Create dedicated `SCHEMA.md` documenting tables, columns, constraints, and RLS policies
  - [ ] Reference and link `SCHEMA.md` from `README.md`
- [ ] Development Roadmap & Published Releases page:
  - [ ] Add "Development Roadmap & Published Releases" link at the bottom of the Gear menu drawer
  - [ ] Dedicated `/roadmap` page displaying HTML-rendered view of `roadmap.md` with return navigation
