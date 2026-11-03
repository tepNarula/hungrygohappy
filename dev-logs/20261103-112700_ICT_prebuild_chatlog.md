# Prebuild conversation — 2026-11-03 11:27 ICT

This record summarizes available conversation context; it is not a verbatim transcript. Historical records for earlier builds remain pending.

## Conversation leading up to this build

- User requested an updated roadmap and a build strategy after an earlier build exhausted credits before verification.
- User reordered the strategy: Batch 1 importer reliability and deduplication; Batch 2 tracked lists, opening schedules and location filtering; Batch 3 UI and documentation.
- User moved Review Dialog Polish from Batch 1 into Batch 3.
- User requested a permanent roadmap section covering Critical and Warning scanner findings.
- User requested prebuild chatlogs for every build, retroactively and moving forward, and a clickable source-code FAQ link; both added to Batch 3.
- Assistant identified the active invalid JSX flex attributes and the CSV formula-injection warning.
- User: “complete Active Code Fix, Pending Security Issues, and Batch 1”.

## Decision during the build

- Assistant asked whether scanner-flagged deletion permissions should become owner-only, be disabled temporarily, or remain group-link based.
- User: “Keep group-link deletion”. Corresponding scanner findings remain unresolved and documented.

## Interruption

Credits ran out before tests, end-to-end verification and scanner confirmation. The reported TypeScript optional-property errors were corrected in the recovery step. See roadmap.md for verification still pending.