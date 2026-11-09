# Prebuild chatlog — 2026-10-16 11:29 ICT (reconstructed)

> **Reconstructed historical record.** This file was synthesized after the fact from git history and a condensed summary of the project conversation. It is NOT a verbatim chat transcript; wording is paraphrased and timestamps come from the build commit.

## Summary
**Group-code lists, share dialog, CSV export.** Added share links and CSV export plus group-code routes `/{code}`; each list gets its own storage key while `default` keeps the legacy key. Also a roadmap/test refinement pass and README.

**Build commits:** 923a3ad..0969113 (Tested and refined roadmap); 465fe6a Added share dialog & group routing; 3a328a1 Add project README

## Reconstructed chat history since previous build

**User:** I would prefer to allow database syncs across devices and users.

**Assistant:** Implemented Cloud sync with `restaurants` keyed by `(list_code, google_maps_url)`, localStorage cache and realtime.

**User:** Go ahead with items 1 and 2 first (share links / CSV export and group-code routes).

**Assistant:** Added share dialog, CSV export and group-code routing.
