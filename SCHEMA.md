# Database Schema & Data Architecture

This document provides a comprehensive technical reference for the HungryGoHappy database architecture, tables, columns, constraints, indices, Row-Level Security (RLS) policies, and data synchronization patterns.

---

## 1. Architectural Overview

### Open Group-Code Multi-Tenancy
HungryGoHappy uses an open, link-based collaboration model without mandatory user authentication walls:
- Every restaurant list is partitioned by a URL-safe **`list_code`** (e.g., `/lunch-club`, `/default`).
- Anyone with the link or group code can read, add, edit, spin, and delete places from that list.
- Data access is governed at the PostgreSQL database layer via Row-Level Security (RLS).

### Dual-Layer Storage & Offline Resilience
The application employs a hybrid local/cloud caching strategy:
1. **Local Cache (`localStorage`)**: Stores the list locally under the key `hungry_roulette_restaurants_${list_code}` (or legacy `hungry_roulette_restaurants` for `"default"`). Provides instant render times and offline availability.
2. **Cloud Source of Truth (`PostgreSQL`)**: Real-time cross-device persistence. On initial load, local data is uploaded/merged via `syncWithLocal()`, and real-time database changes are streamed via Supabase Realtime subscriptions.

---

## 2. Table: `public.restaurants`

Stores individual food and drink places associated with a group list.

### Schema Definition
```sql
CREATE TABLE public.restaurants (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  list_code text NOT NULL,
  google_maps_url text NOT NULL,
  name text,
  visits integer NOT NULL DEFAULT 0,
  last_visited_at timestamptz,
  visit_dates jsonb NOT NULL DEFAULT '[]'::jsonb,
  gmaps_name text,
  source_list_id text,
  city text,
  province text,
  postal_code text,
  country text,
  gmaps_place_id text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (list_code, google_maps_url)
);
```

### Column Specifications
| Column | Type | Constraints / Defaults | Purpose & Usage |
| :--- | :--- | :--- | :--- |
| `id` | `uuid` | `PRIMARY KEY DEFAULT gen_random_uuid()` | Unique record identifier. |
| `list_code` | `text` | `NOT NULL` | Group list identifier (e.g., `default`, `bangkok-eats`). Indexed for fast lookup. |
| `google_maps_url` | `text` | `NOT NULL` | Canonical Google Maps destination URL. Forms unique compound key with `list_code`. |
| `name` | `text` | Nullable | Current display name of the restaurant. Editable by users in the UI. |
| `visits` | `integer` | `NOT NULL DEFAULT 0` | Total cumulative visit count recorded via the "Let's Go!" spin result action. |
| `last_visited_at` | `timestamptz` | Nullable | Timestamp of the most recent recorded visit. Used for recency sorting. |
| `visit_dates` | `jsonb` | `NOT NULL DEFAULT '[]'::jsonb` | Array of ISO-8601 visit timestamps (e.g. `["2026-10-15T07:12:00Z"]`). Used to compute rolling 3-month visit frequencies. |
| `gmaps_name` | `text` | Nullable | Baseline official name extracted from Google Maps upon initial import. |
| `source_list_id` | `text` | Nullable | Foreign key identifier referencing `gmaps_list_sources.gmaps_list_id` if imported from a tracked list. |
| `city` | `text` | Nullable | City or district (e.g., `Bangkok`, `Watthana`) parsed from Google address. |
| `province` | `text` | Nullable | Administrative area or province (e.g., `Bangkok`, `Chon Buri`) for pre-spin filtering. |
| `postal_code` | `text` | Nullable | Postal/ZIP code (e.g., `10110`, `20150`) extracted from Google address. |
| `country` | `text` | Nullable | Country name or code (e.g., `Thailand`). |
| `gmaps_place_id` | `text` | Nullable | Canonical unsigned 64-bit pair identifier (`0x...:0x...`) used for fetching live opening hours. |
| `created_at` | `timestamptz` | `NOT NULL DEFAULT now()` | Record creation timestamp. |
| `updated_at` | `timestamptz` | `NOT NULL DEFAULT now()` | Record last modification timestamp. |

### Constraints & Indices
- **Compound Primary Uniqueness**: `UNIQUE (list_code, google_maps_url)` guarantees that a restaurant URL cannot be duplicated within the same list, while allowing multiple separate lists to include the same spot.
- **Index**: `CREATE INDEX restaurants_list_code_idx ON public.restaurants (list_code);` accelerates group list filtering and retrieval.
- **Realtime**: `ALTER PUBLICATION supabase_realtime ADD TABLE public.restaurants;` broadcasts insert, update, and delete events to all connected clients.

### Row-Level Security (RLS) Policies
RLS is enabled (`ALTER TABLE public.restaurants ENABLE ROW LEVEL SECURITY;`).

1. **SELECT (`"Group-code lists are readable"`)**:
   - `FOR SELECT TO anon, authenticated USING (true);`
   - *Design rationale*: Anyone with the list code can view restaurants on that list.
2. **INSERT (`"Group-code lists are insertable"`)**:
   - `FOR INSERT TO anon, authenticated WITH CHECK (length(list_code) BETWEEN 1 AND 64 AND length(google_maps_url) BETWEEN 1 AND 2048);`
   - *Design rationale*: Ensures URL and list code parameters conform to safe length boundaries before persisting.
3. **UPDATE (`"Group-code lists are updatable"`)**:
   - `FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (length(list_code) BETWEEN 1 AND 64 AND length(google_maps_url) BETWEEN 1 AND 2048);`
   - *Design rationale*: Allows users to rename restaurants, increment visit counts, and update visit history.
4. **DELETE (`"Group-code lists are deletable"`)**:
   - `FOR DELETE TO anon, authenticated USING (true);`
   - *Design rationale*: Allows list members to delete restaurants via the edit mode. *(See Security Considerations below regarding RLS scanner findings).*

---

## 3. Table: `public.gmaps_list_sources`

Tracks external Google Maps shared lists (saved lists) that have been imported into a HungryGoHappy group list.

### Schema Definition
```sql
CREATE TABLE public.gmaps_list_sources (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  list_code text NOT NULL,
  gmaps_list_id text NOT NULL,
  source_url text NOT NULL,
  title text,
  last_synced_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (list_code, gmaps_list_id)
);
```

### Column Specifications
| Column | Type | Constraints / Defaults | Purpose & Usage |
| :--- | :--- | :--- | :--- |
| `id` | `uuid` | `PRIMARY KEY DEFAULT gen_random_uuid()` | Unique record identifier. |
| `list_code` | `text` | `NOT NULL` | Group list code owning this tracked source. |
| `gmaps_list_id` | `text` | `NOT NULL` | Alphanumeric identifier extracted from Google Maps list URL (e.g. `1s123456...`). |
| `source_url` | `text` | `NOT NULL` | Original public share link pasted by user (shortlink or canonical). |
| `title` | `text` | Nullable | Title of the Google Maps list as extracted by the upstream parser. |
| `last_synced_at` | `timestamptz` | Nullable | Timestamp of the most recent sync (manual or cron). Null until initial sync. |
| `created_at` | `timestamptz` | `NOT NULL DEFAULT now()` | Record creation timestamp. |

### Constraints
- **Uniqueness**: `UNIQUE (list_code, gmaps_list_id)` prevents tracking the same Google Maps list multiple times within one group list.

### Row-Level Security (RLS) Policies
RLS is enabled (`ALTER TABLE public.gmaps_list_sources ENABLE ROW LEVEL SECURITY;`).

1. **SELECT (`"List sources readable"`)**:
   - `FOR SELECT TO anon, authenticated USING (true);`
2. **INSERT (`"List sources insertable"`)**:
   - `FOR INSERT TO anon, authenticated WITH CHECK (length(list_code) BETWEEN 1 AND 64 AND gmaps_list_id ~ '^[A-Za-z0-9_-]{8,128}$' AND length(source_url) <= 2048);`
   - *Design rationale*: Validates Google Maps list ID format using regex pattern and bounds URLs.
3. **UPDATE (`"List sources updatable"`)**:
   - `FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (length(list_code) BETWEEN 1 AND 64 AND gmaps_list_id ~ '^[A-Za-z0-9_-]{8,128}$' AND length(source_url) <= 2048);`
   - *Design rationale*: Allows updating sync timestamps and titles.
4. **DELETE (`"List sources deletable"`)**:
   - `FOR DELETE TO anon, authenticated USING (true);`
   - *Design rationale*: Allows users to remove tracked sources from the Tracked Lists Dialog without deleting previously imported restaurants.

---

## 4. Synchronization Logic & Sync Planner (`planGmapsSync`)

When a tracked list is refreshed (either manually via the UI or by the daily 03:00 Bangkok cron job), `planGmapsSync` applies a 3-way reconciliation algorithm:

1. **New Place Detection**: Places in the Google Maps list whose canonical URL is not yet in `restaurants` are flagged as `added`.
2. **Custom Name Protection**:
   - If `current.name === current.gmapsName`: The user never edited the place name. If Google Maps updated the official name, the place is flagged as `renamed` and updated.
   - If `current.name !== current.gmapsName`: The user customized the place name. The user's custom name is strictly **preserved**, while `gmaps_name` is updated to reflect the new Google baseline.
   - If `current.gmapsName` is unset (legacy imports): The system assumes the current name is user-chosen and will not overwrite it.

---

## 5. Security Architecture & Documented Decisions

### Open Deletion Exposure (`RLS_EXPOSURE`)
The automated security scanner flags open DELETE policies on both `restaurants` and `gmaps_list_sources` as `Critical` and `Warning`.
- **Accepted Product Decision (2026-11-03)**: Because HungryGoHappy is built around lightweight, friction-free group links with no individual user authentication wall, any collaborator on a list is permitted to delete places or untrack sources.
- **Mitigations**:
  - URLs and list codes are validated via regex and length checks.
  - CSV export downloads neutralize spreadsheet formulas (`safeSpreadsheetText` prepending `'` to prevent CSV formula injection).
  - Removing a tracked source never deletes the places or visit history already imported.
