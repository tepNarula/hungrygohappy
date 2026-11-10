# HungryGoHappy Test Suite Documentation

This document describes the structure, design principles, test suites, and automation scripts used to verify the correctness, reliability, and security of HungryGoHappy.

---

## 1. Directory Structure & Organization Policy

Per project memory and repository guidelines, all testing assets are structured under `/src/test/`:

```text
src/test/
├── README.md                     # This documentation file
├── setup.ts                      # Global Vitest / jsdom environment harness
├── app-routing.test.tsx          # Route tree definition and root routing verification
├── gmaps-place-id.test.ts        # Google 64-bit signed/unsigned place ID normalization
├── gmaps-retries.test.ts         # Google Maps HTTP 429 throttling & jittered backoff
├── gmaps-sync-plan.test.ts       # 3-way sync planner and custom name preservation
├── location-filter.test.ts       # Location metadata extraction and pre-spin filtering
├── place-name.test.ts            # Plus Code formatting and URL display name parsing
├── restaurant-visits.test.ts     # Rolling 3-month visit counts and legacy data preservation
├── tracked-sources.test.ts       # Group-code scoped query isolation and non-destructive deletion
├── deprecated/                   # Archived/obsolete test suites no longer in active CI
└── python-scripts/               # Standalone executable Python automation & Playwright scripts
```

---

## 2. Running Automated Tests

Tests are executed with **Vitest**:

```bash
# Run all 24 unit and integration tests across 8 test suites
bunx vitest run

# Run tests in watch mode during active development
bunx vitest
```

---

## 3. Test Suites & Coverage Breakdown

### `setup.ts` — Test Environment Harness
- **Purpose**: Pre-test configuration executed before every suite runs in jsdom.
- **Mocks & Polyfills**:
  - Injects `@testing-library/jest-dom/vitest` custom matchers.
  - Stubs `window.scrollTo` to silence unhandled DOM navigation warnings.
  - Implements a polyfill for `window.matchMedia` for components relying on CSS media queries.

---

### `gmaps-place-id.test.ts` — Google Maps 64-bit Place ID Normalization (3 tests)
- **Target Module**: `src/lib/gmaps-core.ts` (`toHexId`, `normalizePlaceId`)
- **Design Intent**:
  - Verifies that Google's signed 64-bit decimal halves are properly wrapped to unsigned 64-bit hexadecimal strings via `BigInt.asUintN(64, ...)` without leaking minus signs (e.g., preventing malformed shapes like `0x-1b20...`).
  - Ensures legacy signed-hex IDs already stored in the database are normalized on-the-fly to canonical unsigned IDs without requiring a database migration.
  - Rejects non-place strings and handles undefined inputs defensively.

---

### `gmaps-retries.test.ts` — Upstream Throttling & HTTP 429 Resilience (3 tests)
- **Target Module**: `src/lib/gmaps-core.ts` (`politeFetch`, `retryDelay`, `fetchGmapsList`)
- **Design Intent**:
  - Simulates persistent HTTP 429 responses using fake timers; confirms the client performs exactly 4 retry attempts before throwing `RateLimitedError`.
  - Validates exponential backoff progression (`1000ms`, `2000ms`, `4000ms`) and respects `Retry-After` headers (capped at 10 seconds).
  - Confirms Google Maps browser context headers (`X-Maps-...`) and custom headers are preserved across outgoing requests.

---

### `gmaps-sync-plan.test.ts` — Shared Sync Planner & Custom Name Protection (2 tests)
- **Target Module**: `src/lib/gmaps-sync-plan.ts` (`planGmapsSync`)
- **Design Intent**:
  - Validates the 3-way merge logic: when upstream Google Maps lists update, custom names edited by users are strictly preserved while advancing the `gmapsName` baseline.
  - Confirms that places with unknown/empty baseline names default to preserving user-entered labels rather than guessing ownership.

---

### `location-filter.test.ts` — Pre-Spin Location Filtering & Formatting (6 tests)
- **Target Module**: `src/lib/location-filter.ts` (`filterByLocation`, `locationLabel`, `locationSuggestions`)
- **Design Intent**:
  - Verifies whitespace-only queries retain all candidate places.
  - Tests case-insensitive substring matching against city, province, and postal codes.
  - Confirms that places missing location metadata are excluded when an active location query is applied.
  - Tests formatted display strings (`locationLabel`) and unique suggestion extraction for chip buttons.

---

### `place-name.test.ts` — Place Name Extraction & Plus Code Formatting (3 tests)
- **Target Module**: `src/lib/restaurants.ts` (`formatPlaceName`, `nameFromGmapsUrl`)
- **Design Intent**:
  - Confirms Google Plus Codes (e.g., `QMPW+5WC`) are extracted from long address strings and moved to square brackets (`Restaurant [QMPW+5WC]`).
  - Verifies that address text is stripped when no Plus Code is present.
  - Tests URL decoding for raw place links with URL-encoded query parameters.

---

### `restaurant-visits.test.ts` — Visit Frequency & Historical Tracking (4 tests)
- **Target Module**: `src/lib/restaurants.ts` (`recentVisitCount`, `knownVisitDates`, `saveRestaurants`, `loadRestaurants`)
- **Design Intent**:
  - Ensures only visits occurring within the last 3 calendar months (inclusive) are counted toward recent frequency.
  - Verifies backward-compatibility for legacy data that only recorded cumulative `visits` and a single `lastVisitedAt`.
  - Confirms persistence round-trips to `localStorage`.
  - Tests edge-case date arithmetic across month-end boundaries (e.g. February 28 vs May 31).

---

### `tracked-sources.test.ts` — Group Isolation & Non-Destructive Source Removal (2 tests)
- **Target Module**: `src/lib/cloud-sync.ts` (`fetchTrackedSources`, `removeTrackedSources`)
- **Design Intent**:
  - Ensures group list code queries are normalized and strictly isolated, preventing cross-list data leaks.
  - Confirms removing a tracked Google Maps list deletes only the tracking reference row from `gmaps_list_sources` and never cascades or deletes imported restaurants from `restaurants`.

---

### `app-routing.test.tsx` — TanStack Route Architecture (1 test)
- **Target Module**: `src/routeTree.gen.ts`, `src/routes/`
- **Design Intent**:
  - Verifies that the TanStack Router matches the root `/` path to the instructional FAQ page rather than failing to the `NotFoundComponent`.

---

## 4. Standalone Executable Python Automation Scripts (`python-scripts/`)

Standalone Python scripts utilizing Playwright are placed in `python-scripts/` to execute real-browser verification that cannot run in jsdom:

- **Multi-Device Synchronization Test**:
  - Spawns two independent headless Chromium contexts to simulate two separate users/devices.
  - Imports a 17-place shared Google Maps list in Client A, triggers cloud upsert, and verifies that Client B sees the synchronized list, location data, and tracked sources in real time without manual reload.
- **Interactive Verification**:
  - Inspects live opening-hours badge states, location chip filtering in the DOM, and modal dialog behavior.
