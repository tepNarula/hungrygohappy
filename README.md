# HungryGoHappy

**Live app**: https://hungrygohappy.lovable.app

Took https://hungry-roulette.lovable.app/ as a starting point and built on it further.

Built with [Lovable](https://lovable.dev).

___[Development Roadmap & Releases History](./ROADMAP.md)___

___[Database Schema Documentation](./SCHEMA.md)___

___[Flet Companion Application Documentation](./python-src/README.md)___

___[Web Test Suite Documentation](./src/test/README.md)___

___[Development Logs & Test Reports Documentation](./dev-logs/README.md)___

---
## Architecture & Technology Stack

### Application & Frontend
- **React 19** (`react`, `react-dom` v19.2.0)
- **TanStack Start** (`@tanstack/react-start` v1.168) — Full-stack framework with SSR and type-safe server functions (`createServerFn`)
- **TanStack Router** (`@tanstack/react-router` v1.170) — Client-side and server-rendered type-safe file routing
- **TanStack Query** (`@tanstack/react-query` v5.101) — Asynchronous state management and caching
- **Tailwind CSS v4** (`@tailwindcss/vite` v4.2.1) — Modern CSS `@theme` tokens and OKLCH color palettes
- **Radix UI Primitives** — Accessible unstyled dialog, accordion, radio-group, and popover components
- **Lucide Icons** (`lucide-react` v0.575) — UI icons
- **Sonner** (`sonner` v2.0.7) — Toast feedback

### Cross-Platform Companion (Android / Desktop / Web)
- **Python 3.10+ / Flet (1.1.x & 0.x)** — Native Android release APK, desktop, and web companion client located under `/python-src/`
- **Multi-Target Packaging** — Automated `Makefile` supporting Wheel (`.whl`), Debian (`.deb`), and Android APK builds
- **Automated Regression Suite** — 22 standard-library unit tests under `/python-src/test/` with headless CI/CD stubs

### Cloud Backend & Services
- **Lovable Cloud (PostgreSQL)**:
  - Managed PostgreSQL instance with Row-Level Security (RLS)
  - Supabase client (`@supabase/supabase-js` v2.118)
  - Realtime publication for instant multi-device synchronization
- **Automated Cron Jobs**:
  - Daily 03:00 Bangkok automated refresh job hitting `/api/public/jobs/refresh-gmaps-lists`
- **Google Maps Data Integration**:
  - Upstream place details, address parser, and shared-list resolver via server functions (`src/lib/gmaps-core.ts`)

### Testing & Development
- **Vitest** (v4.1.10+) — Fast unit and integration test runner (28 automated tests across 8 suites)
- **Testing Library** (`@testing-library/react` v16.0) — Component rendering and behavior tests
- **Playwright** — Multi-device end-to-end browser automation
- **Drizzle ORM & Kit** (`drizzle-kit`, `drizzle-orm`) — Migration management
- **Vite 8** (`vite` v8.1.5) — Bundler and dev server

---
## Getting Started

### Web Application
```bash
# Install dependencies
bun install

# Start local development server (http://localhost:8080)
bun dev

# Run unit and integration tests
bun test

# Build production bundle
bun run build
```

### Python Companion Application
```bash
# Set up Python virtual environment and dependencies
cd python-src
pip install -r requirements.txt

# Run Python regression test suite
make test

# Launch companion application locally
make run
```
