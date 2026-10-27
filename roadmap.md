# Roadmap

## Completed

- [x] Rebuild Hungry Roulette (cream bg, chunky orange button, settings gear)
- [x] CSV upload for adding restaurants (verified: 3-row CSV imported, dedupe works)
- [x] /add?gmapslink=... route to add a restaurant via URL parameter (verified: name extracted, duplicate detected)
- [x] Import preview for all add channels
- [x] Spin result: mini map, Let's Go, re-spin, reset
- [x] Update spin label ("Where To Eat/Drink Today?") and limit gear menu to five restaurants
- [x] Full sortable restaurant list with map links and three-month visit counts
- [x] Verify menu, sorting, and visit recording
- [x] Share dialog + CSV download
- [x] Group-code lists (/{code}, /{code}/add)
- [x] + Add dialog (Google Maps link/list + CSV) with inline name editing
- [x] Edit/delete mode in All restaurants
- [x] FAQ homepage ("Hungry? Let's Go Happy!")
- [x] Cloud sync across devices
- [x] "Copy to another list" in Share dialog (existing or new target, keep-history vs start-fresh choice, duplicate skip, cloud sync)
- [x] Daily auto-refresh of imported Google Maps lists (03:00 Bangkok)
- [x] Single-place names formatted as "{name} [{plusCode}]"
- [x] List-sharing tip in Add dialog
- [x] Resolver browser headers + HTTP 429 retry backoff + "Google Maps is busy" message

## Pending

- [ ] Top-left header controls:
  - [ ] Default to dark theme on initial visit
  - [ ] Sun/Moon theme switcher toggle button at top-left of every page
  - [ ] Desktop/Mobile viewport frame toggle button next to theme switcher
- [ ] "Review before adding" dialog polish:
  - [ ] Stack primary "Add {N}" button above "Cancel" button vertically
  - [ ] Auto-trim preview URLs to 80 characters with trailing ellipses for display only (preserve full URL on import)
  - [ ] Support multi-line word-wrapping for reviewed place names
- [ ] Dedicated "All Restaurants" full page:
  - [ ] Move from slide-out Gear drawer to dedicated full-page route (`/{list}/places`)
  - [ ] Include back navigation, sorting, and inline editing/deletion
- [ ] Tracked Google Maps lists manager:
  - [ ] Add button on Gear menu opening manager dialog/panel
  - [ ] View all synced lists and their last sync timestamps
  - [ ] Manual refresh for individual lists or all lists at once
  - [ ] Add new Google Maps shared list to tracked auto-sync sources
  - [ ] Remove existing tracked list(s)
- [ ] Real-time opening schedule & status badges:
  - [ ] Check place opening hours against client device's local time
  - [ ] Display status: Currently open (upcoming closing time), Opening soon (within 60m), Closing soon (within 60m), or Currently closed (next opening day & time / temporarily / permanently closed)
- [ ] Database schema documentation:
  - [ ] Create dedicated `SCHEMA.md` documenting tables, columns, constraints, and RLS policies
  - [ ] Reference and link `SCHEMA.md` from `README.md`
- [ ] Location metadata & spin filtering:
  - [ ] Fetch, extract, and sync city, province, postal code, and country into database
  - [ ] Pre-spin screen: Location filter input widget positioned below Live Match Counter and Quick Suggestion Chips
  - [ ] Spin result screen: Display location metadata and place "Back to Roulette" button to the left of "Let's Go!"
- [ ] Development Roadmap page & Homepage link:
  - [ ] Add clickable "(Roadmap)" label under "Frequently asked questions" header on the Homepage
  - [ ] Dedicated `/roadmap` page displaying HTML-rendered view of `roadmap.md` with return navigation
