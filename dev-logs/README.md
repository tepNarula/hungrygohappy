# HungryGoHappy Development Logs (`/dev-logs`)

This directory maintains an append-only historical audit trail of pre-build conversations and on-demand verification reports generated throughout the lifecycle of the **HungryGoHappy** project.

---

## 1. Directory Purpose & Core Invariants

1. **Auditability & Traceability**: Captures the exact user intent, architectural decisions, trade-offs, and verification results that led to each code build.
2. **Standardized Timezone**: All timestamps in filenames and document headers are strictly recorded in **ICT (Indochina Time / UTC+7 / Asia/Bangkok)** using 24-hour time.
3. **Immutable History**: Historical logs are permanent records; past logs are never retroactively overwritten or deleted.
4. **Transparent Provenance**: Reconstructed historical records must carry an explicit disclaimer indicating they are summaries assembled from project memory rather than verbatim transcripts.

---

## 2. File Categories & Naming Conventions

The directory contains two distinct categories of markdown records:

```text
dev-logs/
├── README.md                                          # This documentation file
├── {YYYYMMDD-HHMMSS}_ICT_prebuild_chatlog.md          # Pre-build conversation records
└── {YYYYMMDD}_{HHMMSS}_ICT_on-demand_tests_report.md  # On-demand verification reports
```

### A. Prebuild Chatlogs (`{YYYYMMDD-HHMMSS}_ICT_prebuild_chatlog.md`)
- **Trigger**: Generated prior to every Build attempt.
- **Filename Format**: `{YYYYMMDD-HHMMSS}_ICT_prebuild_chatlog.md` (e.g., `20261110-164300_ICT_prebuild_chatlog.md`).
- **Required Sections**:
  1. `# Prebuild chatlog — YYYY-MM-DD HH:MM:SS ICT` (Header with timestamp)
  2. `> Provenance note` (Attribution note explaining if reconstructed or verbatim)
  3. `## Summary` (High-level narrative of decisions, user instructions, and scope)
  4. `## Chat history since previous build` (Sequential user/assistant chat exchanges with ICT timestamps)

### B. On-Demand Test Reports (`{YYYYMMDD}_{HHMMSS}_ICT_on-demand_tests_report.md`)
- **Trigger**: Generated whenever on-demand automated tests, Playwright browser runs, or integration checks are executed.
- **Filename Format**: `{YYYYMMDD}_{HHMMSS}_ICT_on-demand_tests_report.md` (e.g., `20261105_143021_ICT_on-demand_tests_report.md`).
- **Required Sections**:
  1. `# On-demand Test Report YYYY-MM-DD HH:MM:SS ICT` (Header matching test completion timestamp)
  2. `## Overview` (Test target, scope, parameters, and environment)
  3. `## Test Execution Results` (Vitest unit tests, Playwright browser findings, and packaging status)
  4. `## Issues Found & Remediation` (Categorized findings, regressions, and recommended next steps)

---

## 3. Historical Record Inventory

| Date (ICT) | Filename | Type | Scope / Key Milestone |
| :--- | :--- | :--- | :--- |
| **2026-10-14** | `20261014-140045_ICT_prebuild_chatlog.md` | Prebuild | Initial Hungry Roulette build, URL parameter adding, CSV import. |
| **2026-10-15** | `20261015-120953_ICT_prebuild_chatlog.md` | Prebuild | Schema migration to Google Maps URL key, visit recency tracking. |
| **2026-10-16** | `20261016-112914_ICT_prebuild_chatlog.md` | Prebuild | Group-code lists (`/{code}`), share dialog, and CSV export. |
| **2026-10-19** | `20261019-125423_ICT_prebuild_chatlog.md` | Prebuild | Add dialog preview, duplicate detection, inline editing. |
| **2026-10-20** | `20261020-160701_ICT_prebuild_chatlog.md` | Prebuild | Lovable Cloud PostgreSQL multi-device sync and FAQ homepage. |
| **2026-10-22** | `20261022-130124_ICT_prebuild_chatlog.md` | Prebuild | Copy-to-another-list with history preservation options. |
| **2026-10-26** | `20261026-114947_ICT_prebuild_chatlog.md` | Prebuild | 03:00 Bangkok daily auto-refresh and Plus Code formatting. |
| **2026-11-02** | `20261102-160311_ICT_prebuild_chatlog.md` | Prebuild | Mobile Google Maps 302 shortlink resolver bypassing 429 limits. |
| **2026-11-03** | `20261103-112700_ICT_prebuild_chatlog.md` | Prebuild | Importer deduplication, formula neutralization, and sync planner. |
| **2026-11-04** | `20261104-111601_ICT_prebuild_chatlog.md` | Prebuild | Tracked Google Maps list manager dialog and HTTP 429 retry backoff. |
| **2026-11-05** | `20261105-140834_ICT_prebuild_chatlog.md` | Prebuild | Tracked source management verification and address parsing. |
| **2026-11-05** | `20261105-141527_ICT_prebuild_chatlog.md` | Prebuild | 60-character URL truncation threshold and test cases. |
| **2026-11-05** | `20261105_143021_ICT_on-demand_tests_report.md` | Test Report | Playwright 17-place shared list import and multi-device sync report. |
| **2026-11-09** | `20261109-145400_ICT_prebuild_chatlog.md` | Prebuild | Pre-spin location filtering and result location labels. |
| **2026-11-09** | `20261109-150100_ICT_prebuild_chatlog.md` | Prebuild | Location filter chip suggestions and opening status UI. |
| **2026-11-10** | `20261110-164300_ICT_prebuild_chatlog.md` | Prebuild | Signed 64-bit Google place ID normalization and regression tests. |

---

## 4. Contributing & Maintenance Guidelines

1. **Do Not Delete**: Never remove or rename historical log files.
2. **Bundle in Build Turns**: Prebuild logs and on-demand test reports are bundled automatically during development turns at 0 extra credits.
3. **Cross-Reference**: When completing items tracked in `ROADMAP.md`, link to the corresponding prebuild log or test report under `dev-logs/` to provide clear audit verification.
