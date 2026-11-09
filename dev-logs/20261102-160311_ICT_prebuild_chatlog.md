# Prebuild chatlog — 2026-11-02 16:03 ICT (reconstructed)

> **Reconstructed historical record.** This file was synthesized after the fact from git history and a condensed summary of the project conversation. It is NOT a verbatim chat transcript; wording is paraphrased and timestamps come from the build commit.

## Summary
**Deduplication logic.** Shared normalized URL/name/place-ID matching across add, copy, offline migration and refresh paths; resolver hardening discussion following a production 429 bug report.

**Build commits:** 6d9b6ce Added deduplication logic

## Reconstructed chat history since previous build

**User:** Bug report: adding a shared list URL (https://maps.app.goo.gl/siLyWLNfACfMe4GT6?g_st=ac) still produces the Google busy error.

**Assistant:** Confirmed production hit HTTP 429 on entity-list fetches although local resolution worked; proposed XHR context headers and longer jittered retries.

**User:** Add the resolver resilience improvements to the Tracked Lists manager item.
