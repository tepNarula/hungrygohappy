# HungryGoHappy — Flet Companion Application

A cross-platform Python companion application for **HungryGoHappy**, built with [Flet](https://flet.dev) (powered by Flutter). It runs natively on **Android**, **Desktop** (macOS, Windows, Linux), and the **Web**, interoperating seamlessly with the primary TanStack Start web application and the shared Lovable Cloud database.

---

## 1. Software Architecture

### System Topology & Interoperability
```text
┌─────────────────────────────────┐       ┌─────────────────────────────────┐
│     Web App (TanStack Start)    │       │     Android App (Flet / APK)    │
│  - React 19 / Tailwind CSS      │       │  - Python 3.10+ / Flutter UI    │
│  - localStorage offline cache   │       │  - Multi-tier persistent cache  │
└────────────────┬────────────────┘       └────────────────┬────────────────┘
                 │                                         │
                 │   Shared Group-Code Data & RLS          │
                 ▼                                         ▼
   ┌───────────────────────────────────────────────────────────────────────┐
   │                       Lovable Cloud (PostgreSQL)                      │
   │  - Table: public.restaurants                                          │
   │  - Table: public.gmaps_list_sources                                   │
   │  - Open Row-Level Security (RLS) for anon/authenticated clients       │
   └───────────────────────────────────┬───────────────────────────────────┘
                                       │
                                       │ 03:00 Bangkok Cron Job
                                       ▼
                     [ /api/public/jobs/refresh-gmaps-lists ]
```

### Key Architectural Layers
1. **User Interface (`main.py`)**:
   - Built using Flet controls (`ft.Container`, `ft.Button`/`ft.FilledButton`, `ft.Row`, `ft.TextField`) compatible with Flet 1.1.x and Flet 0.x.
   - Implements Material 3 theming with HungryGoHappy's signature warm palette (`#EA580C` burnt orange) and full Dark/Light theme switching.
   - Smooth roulette slot-machine rolling animation with configurable location filtering.
2. **Data & Synchronization Layer**:
   - Connects directly to the PostgreSQL database via `supabase-py` using the anon publishable key.
   - Multi-tier caching: loads instant offline state from device storage (`client_storage`, `session.store`, or memory fallback) before fetching live changes from the cloud.
   - Strictly conforms to the data contracts defined in the project's root `SCHEMA.md`.
3. **Upstream Link Resolution**:
   - Uses asynchronous `httpx` to follow Google Maps 302 shortlinks (`maps.app.goo.gl`) and extract place names without browser CORS proxy restrictions.
   - Converts Google's signed 64-bit integer halves into canonical unsigned hexadecimal identifiers (`BigInt.asUintN` equivalent in Python: `val & 0xFFFFFFFFFFFFFFFF`).
4. **Native Android Intents & Navigation**:
   - Tapping "Let's Go!" records the visit timestamp in PostgreSQL and triggers URL launch via Android Intent or web browser for real-time turn-by-turn navigation.

---

## 2. Prerequisites

### For Running Locally (Desktop / Development)
- **Python**: Version `3.10` or higher
- **Package Manager**: `pip` (or `uv` / `poetry`)

### For Building the Android APK
- **Flutter SDK**: `3.16.0` or higher
- **Android SDK & Build Tools**: API level 33 or 34
- **Java Development Kit (JDK)**: OpenJDK 17
- Configured `ANDROID_HOME` environment variable

---

## 3. Dependency Inventory

### Runtime Dependencies
| Package | Version Spec | Purpose |
| :--- | :--- | :--- |
| **`flet`** | `>=1.1.0,<1.2.0` | Cross-platform UI framework and Flutter runtime engine (Flet 1.1.x) |
| **`supabase`** | `>=2.10.0` | PostgreSQL client for Lovable Cloud data access and mutations |
| **`httpx`** | `>=0.27.0` | Asynchronous HTTP client for Google Maps shortlink resolution |

### Testing & Tooling (Built-in standard library)
- **`unittest`**: Built-in test runner with automated headless CI stubs in `test/__init__.py`
- **`unittest.mock`**: Mocking HTTP redirects and upstream network responses
- **`asyncio`**: Asynchronous coroutine orchestration for UI animations and sync

---

## 4. Build & Execution Instructions

### A. Quick Commands via Makefile
```bash
cd python-src

# Show all available build targets
make help

# Run all 22 unit and regression tests
make test

# Launch local desktop application
make run

# Build Wheel (.whl) and source distribution (.tar.gz)
make pip

# Build standard Debian (.deb) binary package
make deb

# Build native Android release APK
make apk

# Clean all temporary build directories and caches
make clean
```

### B. Manual Dependency Installation
```bash
cd python-src
pip install -r requirements.txt
```

### C. Run Desktop App Manually
```bash
# Run standalone with hot-reloading
flet run main.py
```

### D. Build Native Android APK Manually
```bash
# Generate release APK (Flet 1.1.x)
flet build apk --project "hungrygohappy" --product "HungryGoHappy" --org "app.lovable.hungrygohappy"

# The resulting binary is located at:
# build/apk/app-release.apk
```

To install directly to a connected Android phone via USB debugging:
```bash
adb install build/apk/app-release.apk
```

### E. Run or Build for Web
```bash
# Run local web server on port 8550
flet run main.py --web --port 8550

# Compile static web assets
flet build web
```

---

## 5. Automated Test Suite

All 22 unit and regression tests are organized under `python-src/test/` and run without external test runners:

```bash
# Run via Makefile
make test

# Or run directly via Python unittest (specifying top-level directory -t .)
python3 -m unittest discover -s test -t . -v
```

### Test Suites Breakdown (22 tests total):
- **`test_models.py` (4 tests)**: Verifies schema parity with `SCHEMA.md`, nullable fields, and JSON `visit_dates` parsing.
- **`test_resolver.py` (7 tests)**: Validates 302 shortlink redirection, Plus Code parsing, 64-bit unsigned place ID bitwise wrapping, and 60-character URL truncation.
- **`test_filter.py` (5 tests)**: Tests case-insensitive location filtering across city, province, and postal codes.
- **`test_visits.py` (3 tests)**: Validates visit counter increments and rolling 3-month recency calculations.
- **`test_sync.py` (3 tests)**: Tests 3-way merge logic ensuring user-customized place names are never overwritten by upstream Google refreshes, and formula injection neutralization.
