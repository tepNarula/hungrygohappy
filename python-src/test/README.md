# HungryGoHappy Flet Companion — Test Suite Documentation

This document describes the structure, testing principles, test suites, and execution instructions for verifying the correctness, reliability, and security of the **HungryGoHappy** Flet companion application (`/python-src/main.py`).

---

## 1. Directory Structure & Organization Policy

All unit and regression test suites for the Python companion application are maintained under `python-src/test/`:

```text
python-src/test/
├── README.md              # This documentation file
├── __init__.py            # Test package marker
├── test_models.py         # Schema parity with SCHEMA.md, JSON visit_dates, and null safety
├── test_resolver.py       # Unsigned 64-bit place ID wrapping and 60-character URL truncation
├── test_filter.py         # Case-insensitive location filtering and standardized location labeling
├── test_visits.py         # Rolling 3-calendar-month visit counts and legacy visit fallback
└── test_sync.py           # 3-way sync planner, custom name preservation, and formula injection protection
```

---

## 2. Running Automated Tests

All tests are built with Python's standard library **`unittest`** module and require no third-party test runners (e.g. pytest):

### Run All Tests
```bash
cd python-src
python3 -m unittest discover -s test -v
```

### Run an Individual Test Suite
```bash
cd python-src
python3 -m unittest test/test_models.py -v
python3 -m unittest test/test_resolver.py -v
python3 -m unittest test/test_filter.py -v
python3 -m unittest test/test_visits.py -v
python3 -m unittest test/test_sync.py -v
```

---

## 3. Test Suites & Coverage Breakdown

### `test_models.py` — Schema Parity & Defensive Parsing
- **Target**: `Restaurant` dataclass and `from_row()` factory constructor in `main.py`.
- **Parity Reference**: `SCHEMA.md` (`public.restaurants` table definition).
- **Test Cases**:
  - `test_default_values`: Confirms correct defaults (`list_code="default"`, `visits=0`, `visit_dates=[]`).
  - `test_from_row_with_json_string_visit_dates`: Validates defensive parsing when `visit_dates` arrives as a JSON-encoded string from PostgreSQL.
  - `test_from_row_with_list_visit_dates`: Validates parsing when `visit_dates` is already a native Python `list`.
  - `test_from_row_defensive_null_handling`: Validates resilience against `None` values and malformed JSON strings without unhandled exceptions.

### `test_resolver.py` — Place ID Normalization & Display Truncation
- **Target**: `to_canonical_place_id()`, `normalize_place_id()`, and `truncate_for_display()` in `main.py`.
- **Parity Reference**: `src/lib/gmaps-core.ts` and `src/lib/restaurants.ts`.
- **Test Cases**:
  - `test_to_canonical_place_id_bitwise_wrapping`: Verifies signed 64-bit decimal halves wrap via bitwise `& 0xFFFFFFFFFFFFFFFF` into canonical hex (`0x3102bf84957100fd:0xe4dffd4135acd87c`).
  - `test_normalize_place_id_legacy_signed_hex`: Verifies legacy signed hex strings (`...:0x-1b2002beca532784`) normalize cleanly without data migration.
  - `test_normalize_place_id_canonical_passthrough`: Confirms valid canonical IDs pass through unchanged.
  - `test_normalize_place_id_rejects_invalid`: Ensures non-ID strings and null values safely return `None`.
  - `test_truncate_for_display_*`: Validates 60-character threshold enforcement with trailing `...` ellipsis for compact UI display.

### `test_filter.py` — Location Filtering & Label Formatting
- **Target**: `filter_by_location()` and `location_label()` in `main.py`.
- **Parity Reference**: `src/lib/location-filter.ts`.
- **Test Cases**:
  - `test_empty_filter_keeps_all`: Empty or whitespace queries preserve all candidate restaurants.
  - `test_matches_province_case_insensitively`: Matches substring across location fields regardless of case (e.g. `"chiang"` matches `"Chiang Mai"`).
  - `test_matches_postal_code`: Accurately matches postal/zip code substrings (e.g. `"10120"`).
  - `test_excludes_places_without_location_metadata`: Places missing location metadata are excluded when an active query is applied.
  - `test_location_label_formatting`: Formats location tokens into standard `"{city}, {province} {postal_code}, {country}"`.

### `test_visits.py` — Rolling 3-Month Recency
- **Target**: `recent_visit_count()` in `main.py`.
- **Parity Reference**: `recentVisitCount()` in `src/lib/restaurants.ts`.
- **Test Cases**:
  - `test_recent_visit_count_within_3_months`: Filters ISO visit timestamps within trailing 3 calendar months, ignoring older timestamps.
  - `test_recent_visit_count_fallback_to_last_visited_at`: Safely falls back to `last_visited_at` when `visit_dates` array is unpopulated (legacy data migration).
  - `test_recent_visit_count_zero_when_no_visits`: Returns `0` when no visit history exists.

### `test_sync.py` — 3-Way Sync Planner & Security
- **Target**: `plan_gmaps_sync()` and `safe_spreadsheet_text()` in `main.py`.
- **Parity Reference**: `src/lib/gmaps-sync-plan.ts` and CSV export formula neutralization.
- **Test Cases**:
  - `test_preserves_custom_name_when_google_name_updates`: User-renamed places retain custom labels even when upstream Google Maps titles refresh.
  - `test_updates_name_if_user_never_customized_it`: Unedited place names advance to the newly fetched Google Maps title.
  - `test_safe_spreadsheet_text_neutralization`: Prepends a single quote (`'`) to strings starting with formula execution tokens (`=`, `+`, `-`, `@`, `\t`, `\r`) to neutralize spreadsheet formula injection vulnerabilities.

---

## 4. Design Invariants & Testing Principles

1. **Standard Library Only**: All tests use Python's built-in `unittest` module to allow running in lean environments without extra dependencies.
2. **Deterministic & Isolated**: Unit tests verify algorithmic correctness and data contracts purely in-memory with zero network or database dependencies.
3. **Strict Parity with Web App**: Every normalization rule, filter heuristic, and recency algorithm identically mirrors the TypeScript implementation in `/src/lib/`.
