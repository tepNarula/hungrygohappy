# Prebuild chatlog — 2026-11-10 16:43:00 ICT

> This log was assembled from the available project chat history. Lengthy roadmap reproductions are summarized by their resulting decisions rather than duplicated in full.

## Summary
The user approved the proposed opening-hours place-ID fix. The build converts Google's signed 64-bit integer halves to canonical unsigned hexadecimal IDs, normalizes legacy signed-hex IDs already stored in the database, and adds three regression tests. The full suite passes 24 tests. Live UI verification remains blocked because Google returns HTTP 403 anti-abuse pages to the app server, so the result badge still shows "Hours unlisted".

## Chat history since previous build

**User (2026-11-09 17:12 ICT):** move the "Partially Implemented / Unverified" section to the top of the roadmap.

**Assistant:** Moved that section to the top in project memory and supplied the complete reordered roadmap, followed by security issues, pending work, and completed features.

**User (2026-11-09 17:18 ICT):** new ROADMAP item: also display the list's URL as QR Code on list sharing dialog so user can quickly share list with a friend with smartphone.

**Assistant:** Added the QR-code sharing item to Pending Fixes, Features, and Enhancements and supplied the complete updated roadmap.

**User (2026-11-09 17:20 ICT):** the 'Add "Development Roadmap & Releases History" link...' item on the ROADMAP was already committed manually.

**Assistant:** Verified the manual commit, marked the gear-menu link complete, retained the dedicated roadmap page as pending, and supplied the complete updated roadmap.

**User (2026-11-09 18:22 ICT):** is the roadmap up to date?

**Assistant:** Confirmed the roadmap was current and supplied its complete text.

**User (2026-11-09 18:24 ICT):** Location metadata & place opening hours pipeline

**Assistant:** Diagnosed the opening-hours failure. Google's signed 64-bit ID halves could become malformed values such as `0x-1b2002beca532784`; the server validator then rejected the ID and generic search URLs had no fallback feature ID. Proposed unsigned conversion with `BigInt.asUintN(64, ...)`, legacy-ID normalization, and regression tests.

**User (2026-11-10 16:43 ICT):** go

**Assistant:** Started the approved build and verification work.
