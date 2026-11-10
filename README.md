# HungryGoHappy

**Live app**: https://hungrygohappy.lovable.app

Took https://hungry-roulette.lovable.app/ as a starting point and built on it further.

Built with [Lovable](https://lovable.dev).

___[Development Roadmap & Releases History](./ROADMAP.md)___

___[Database Schema](./SCHEMA.md)___

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
- **Vitest** (v4.1.10) — Fast unit and integration test runner (24 automated tests across 8 suites)
- **Testing Library** (`@testing-library/react` v16.0) — Component rendering and behavior tests
- **Playwright** — Multi-device end-to-end browser automation
- **Drizzle ORM & Kit** (`drizzle-kit`, `drizzle-orm`) — Migration management
- **Vite 8** (`vite` v8.1.5) — Bundler and dev server
