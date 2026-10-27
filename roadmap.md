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

- [ ] Top-left header controls: Default to dark theme + Sun/Moon switcher + Desktop/Mobile viewport frame toggle
- [ ] "Review before adding" dialog polish: Stack "Add {N}" above "Cancel", trim preview URLs to 80 chars for display, and allow multi-line word-wrapping for place names
- [ ] Dedicated "All Restaurants" full page: Move from drawer in Gear menu to a dedicated full-page route (/{list}/places) with return navigation
- [ ] Tracked Google Maps lists manager: View synced lists, last sync timestamps, manual refresh (single or all), add new list, and remove tracked lists
- [ ] Real-time opening schedule & status badges: Check place hours against client local time with 60-min opening/closing soon thresholds
- [ ] Database schema documentation: Create dedicated SCHEMA.md documenting tables and constraints, linked from README.md
- [ ] Location metadata & spin filtering:
  - [ ] Extract and store city, province, postal code, and country in the database
  - [ ] Pre-spin screen: Location filter widget placed below Live Match Counter and Quick Suggestion Chips
  - [ ] Spin result screen: Show location metadata and place "Back to Roulette" button to the left of "Let's Go!"
