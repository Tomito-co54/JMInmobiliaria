# CLAUDE.md

> Configuration and rules for Claude Code working on this project.
> Read this file at the start of every session.

---

## Current Progress

**Status:** Block 1 — Technical Foundation (in progress)

| Step | Status | Commit |
|---|---|---|
| B1.1 — Next.js + TypeScript + Tailwind | ✅ Done | `cb5c815` |
| B1.2 — shadcn/ui + dark mode | ✅ Done | `b50d100` |
| B1.3 — Supabase schema + RLS | ✅ Done | `b7f378d` + `a667d26` |
| B1.4 — Authentication | ✅ Done | `4ec7ea8` + `8985f95` + `e9ea248` |
| B1.5 — Admin panel | ✅ Done | `42744ba` |
| B1.6 — Vercel deploy + Sentry + Analytics | ⬜ Next | — |

**Project location:** `C:\dev\jotaeme` (moved from OneDrive on May 16, 2026 — OneDrive sync conflicts with Next.js `.next` cache).

**Installed versions (locked):**
- Next.js 15.5.18
- React 19.2.6
- TypeScript 6.0.3
- Tailwind CSS 4.3.0
- shadcn/ui 4.7.0 (13 components: button, input, label, card, dialog, dropdown-menu, sonner, avatar, badge, separator, skeleton, sheet, tabs)
- react-hook-form + zod + @hookform/resolvers
- next-themes (dark mode)
- @supabase/supabase-js + @supabase/ssr (clients)
- pg + dotenv (devDeps, for `scripts/db-run.mjs`)

**Supabase project:**
- URL: `https://cjnaxxidigdylnwlpyab.supabase.co`
- All 7 tables created with RLS enabled
- Seed loaded (5 sample properties in Zona Sur GBA)
- Auth triggers active (auto-creates public.users row on signup)

**Env configured in `.env.local`:** Supabase URL + anon key + service_role key all set.

**SQL runner utility:** `node scripts/db-run.mjs <path-to-sql>` runs any SQL file against Supabase. Requires `DATABASE_URL` (Transaction pooler) in `.env.local` — not configured yet, only needed if running future migrations from CLI instead of Supabase SQL Editor.

**Pending accounts/keys for next steps:**
- Google OAuth → configure in Supabase dashboard for B1.4
- Sentry DSN + auth token → needed for B1.6
- MercadoPago credentials → needed for Block 7
- Resend API key → needed for Block 6

---

## Project Overview

**Name:** Jotaeme — Plataforma Inmobiliaria (Argentina — Zona Sur GBA)

**One-liner:** A mobile-first real estate platform that works for the buyer, providing verified data, transparent scoring, and automated services to shift the information asymmetry in favor of the person making the purchase decision.

**Target user (MVP):** Property buyers in Zona Sur GBA, Argentina (Lomas de Zamora, Banfield, Lanús, Avellaneda, Quilmes).

**Business model:** Free for buyers to browse; monetization through automated paid services (dominion reports, cadastral certificates, appraisals) and subscription tiers for real estate agencies.

For full business context, see `docs/PLAN_MAESTRO.md` (Spanish, comprehensive).

---

## Tech Stack — Fixed Decisions

These are settled. Do not propose changes without explicit user confirmation.

### Core
- **Frontend:** Next.js 15 (App Router) + React 19
- **Language:** TypeScript (strict mode)
- **Styling:** Tailwind CSS 4
- **UI Components:** shadcn/ui (Radix-based)
- **Backend / DB:** Supabase (PostgreSQL + Auth + Storage + Edge Functions)
- **Hosting:** Vercel
- **Forms:** React Hook Form + Zod validation

### Services
- **Payments:** Mercado Pago (Argentina standard)
- **Email:** Resend (transactional + alerts)
- **Maps:** Leaflet + OpenStreetMap tiles (free) or Mapbox (if needed)
- **Scraping:** Playwright (Chromium-based, handles dynamic content)
- **Error tracking:** Sentry
- **Analytics:** Vercel Analytics + Plausible

### Background Jobs
- **Scheduled tasks:** Vercel Cron Jobs (for scraping + alerts)
- **Heavy/long jobs:** Supabase Edge Functions

---

## Architectural Principles

### 1. Mobile-first, radically
- Every component is designed first for a 375px viewport (iPhone standard).
- Test mobile rendering BEFORE adapting to desktop.
- Touch targets minimum 44px.
- No hover-only interactions for critical actions.

### 2. Server-first
- Default to Server Components in Next.js App Router.
- Use Client Components ONLY when needed (state, effects, browser APIs, event handlers).
- Data fetching happens on the server unless real-time interaction is needed.

### 3. Type safety end-to-end
- TypeScript strict mode is non-negotiable.
- Use Zod schemas for all external inputs (forms, API, scraping outputs).
- Database types generated from Supabase schema (`supabase gen types`).
- Never use `any`. Use `unknown` and narrow, or define proper types.

### 4. Separation of concerns
- `/app` → routing and pages only
- `/components` → reusable UI components
- `/lib` → business logic, utilities, integrations
- `/lib/db` → database queries (typed)
- `/lib/services` → external service integrations (ARBA, scrapers, etc.)
- `/lib/scoring` → scoring algorithms (isolated, testable)
- `/types` → shared TypeScript types
- `/hooks` → custom React hooks (client-side only)

### 5. Security by default
- Row Level Security (RLS) enabled on every Supabase table.
- Never expose service role keys client-side.
- Validate all inputs server-side, even if validated client-side.
- HTTPS only (Vercel handles this).
- Sensitive data encrypted at rest where needed.
- Never log passwords, tokens, payment data, or personal IDs (DNI).
- Follow Argentina's Personal Data Protection Law (Ley 25.326).

### 6. Performance budget
- Mobile First Contentful Paint < 1.5s on 4G.
- Largest Contentful Paint < 2.5s.
- Total page weight < 500KB for property listing pages.
- Use Next.js Image component for ALL images.
- Lazy-load anything below the fold.

---

## Project Structure

```
/
├── app/                          # Next.js App Router pages
│   ├── (auth)/                   # Auth routes (login, register)
│   ├── (public)/                 # Public routes (home, property view)
│   ├── (app)/                    # Authenticated routes (dashboard, profile)
│   ├── admin/                    # Internal admin panel
│   ├── api/                      # API routes (webhooks, server actions)
│   └── layout.tsx
│
├── components/
│   ├── ui/                       # shadcn/ui components
│   ├── property/                 # Property-specific components
│   ├── scoring/                  # Score visualization components
│   ├── search/                   # Search and filter components
│   └── shared/                   # Shared layout components
│
├── lib/
│   ├── db/                       # Database queries (typed)
│   ├── supabase/                 # Supabase client setup
│   ├── services/
│   │   ├── arba/                 # ARBA SIC integration
│   │   ├── scrapers/             # Property scrapers
│   │   ├── mercadopago/          # Payment integration
│   │   └── resend/               # Email sending
│   ├── scoring/
│   │   ├── quality.ts            # Quality score algorithm
│   │   └── match.ts              # Match score algorithm
│   ├── validators/               # Zod schemas
│   └── utils/                    # Pure utility functions
│
├── types/                        # Shared TypeScript types
├── hooks/                        # Client-side hooks
├── public/                       # Static assets
├── supabase/
│   ├── migrations/               # SQL migrations
│   └── seed.sql                  # Seed data
├── docs/
│   ├── PLAN_MAESTRO.md           # Full strategic document
│   ├── PLAYBOOK_PROMPTS.md       # Construction prompts
│   └── ARCHITECTURE.md           # Technical decisions log
└── CLAUDE.md                     # This file
```

---

## Database Schema — Core Entities

These are the core entities. Full schema lives in `supabase/migrations/`.

### `properties`
The main entity. One row per unique property tracked in the platform.

Key fields:
- `id` (uuid, pk)
- `external_id` (text) — source platform ID (e.g., Zonaprop ID)
- `source` (enum: zonaprop, argenprop, mercadolibre, owner_direct, agency)
- `url` (text) — original listing URL
- `partido` (text) — ARBA partido code
- `partida` (text) — ARBA property tax ID
- `nomenclatura_catastral` (text)
- `address` (text)
- `lat`, `lng` (numeric)
- `property_type` (enum: casa, departamento, ph, lote, local)
- `operation_type` (enum: venta, alquiler)
- `price_amount` (numeric)
- `price_currency` (enum: USD, ARS)
- `surface_total` (numeric) — declared
- `surface_covered` (numeric) — declared
- `surface_arba` (numeric) — from ARBA SIC, nullable
- `rooms` (integer)
- `bedrooms` (integer)
- `bathrooms` (integer)
- `garages` (integer)
- `description` (text)
- `photos` (jsonb array)
- `first_seen_at` (timestamp) — when we first scraped it
- `last_seen_at` (timestamp) — last time we found it active
- `is_active` (boolean) — still listed?
- `quality_score` (numeric, nullable) — calculated, 0-100
- `created_at`, `updated_at`

### `property_history`
Tracks all changes to a property over time.

- `id` (uuid, pk)
- `property_id` (uuid, fk → properties)
- `changed_at` (timestamp)
- `field_changed` (text)
- `old_value` (text)
- `new_value` (text)

Use case: detect price drops, time on market, fake listings (years without changes).

### `users`
Buyers (and later, agencies).

- `id` (uuid, pk) — matches Supabase auth.users.id
- `email` (text, unique)
- `full_name` (text)
- `phone` (text, nullable)
- `role` (enum: buyer, agency, admin)
- `created_at`

### `search_profiles`
A user can have multiple search profiles.

- `id` (uuid, pk)
- `user_id` (uuid, fk → users)
- `name` (text) — e.g., "Casa familiar Lomas"
- `zones` (jsonb) — array of zones with priorities
- `price_min`, `price_max` (numeric)
- `price_currency` (enum)
- `property_types` (text array)
- `rooms_min` (integer)
- `surface_min` (numeric)
- `must_haves` (text array) — non-negotiables (cochera, patio, etc.)
- `personal_objectives` (jsonb) — family, work, hobbies (Phase 2)
- `created_at`, `updated_at`

### `favorites`
User's saved properties.

- `id` (uuid, pk)
- `user_id` (uuid, fk)
- `property_id` (uuid, fk)
- `notes` (text, nullable)
- `created_at`

### `service_orders`
Service contracts (dominion reports, etc.).

- `id` (uuid, pk)
- `user_id` (uuid, fk)
- `property_id` (uuid, fk, nullable)
- `service_type` (enum: dominion_report, cadastral_report, etc.)
- `status` (enum: pending_payment, paid, processing, delivered, refunded)
- `price` (numeric)
- `mercadopago_payment_id` (text)
- `result_file_url` (text, nullable)
- `created_at`, `updated_at`

### `alerts`
Notifications sent to users.

- `id` (uuid, pk)
- `user_id` (uuid, fk)
- `type` (enum: new_match, price_drop, score_change)
- `property_id` (uuid, fk)
- `sent_at` (timestamp)
- `read_at` (timestamp, nullable)

---

## Coding Conventions

### Naming
- **Files:** `kebab-case.tsx` for components, `camelCase.ts` for utilities
- **Components:** `PascalCase`
- **Functions:** `camelCase`, descriptive verbs (`getPropertyById`, not `property`)
- **Constants:** `SCREAMING_SNAKE_CASE` for module-level constants
- **Types/Interfaces:** `PascalCase`, no `I` prefix
- **Database:** `snake_case` for tables and columns (Postgres convention)

### Component patterns
- Server Components by default. Add `'use client'` only when needed.
- Co-locate component-specific logic (e.g., `PropertyCard.tsx` + `PropertyCard.types.ts`).
- Extract complex logic to custom hooks (`/hooks`).
- Props always typed with interface (never inline).

### Database access
- Use Supabase client typed with generated types.
- All queries go through `/lib/db/` modules.
- Never write raw SQL in components or API routes.
- Use transactions (`rpc`) for multi-step operations.

### Error handling
- Throw typed errors (`class PropertyNotFoundError extends Error`).
- Server actions return `{ ok: true, data } | { ok: false, error }` pattern.
- Log errors to Sentry; never swallow silently.
- Show user-friendly messages, not raw error strings.

### Testing
- Unit tests for scoring algorithms (Vitest).
- Integration tests for critical flows (Playwright).
- Don't aim for 100% coverage. Aim for high-impact coverage.

### Comments
- Code should be self-documenting through naming.
- Comments explain **why**, not **what**.
- Use JSDoc for public functions in `/lib`.

---

## Build Order — MVP

Follow this strict order. Do not skip ahead.

### Block 1 — Technical Foundation (Weeks 1-2) ← CURRENT
1. ✅ Project setup (Next.js + TypeScript + Tailwind + shadcn/ui)
2. ✅ Supabase project + schema + RLS policies
3. ✅ Authentication (email/password + Google OAuth pending Google config)
4. ✅ Basic admin panel (protected routes, user list, property list)
5. ⬜ Vercel deployment + environments (dev, staging, production) ← NEXT
6. ⬜ Sentry + Vercel Analytics integration

### Block 2 — Data Ingestion (Weeks 3-6)
1. Zonaprop scraper for Zona Sur GBA
2. Property deduplication logic
3. ARBA SIC integration (cadastral data fetching by address)
4. OpenStreetMap geocoding fallback
5. Vercel Cron job for periodic scraping
6. Property history tracking (price changes, listing status)

### Block 3 — Quality Score (Weeks 7-8)
1. Score algorithm (5 variables): price vs comparables, time on market, documentation, ARBA coherence, listing quality
2. Sub-scores breakdown
3. Score recalculation triggers
4. Admin tool to inspect/debug scores

### Block 4 — Property View (Weeks 9-11)
1. Mobile-first property page
2. Progressive content loading (info in layers)
3. Fullscreen photo gallery with swipe
4. Score visualization (big number + breakdown bars)
5. Verified data icons (✅⚠️🚨)
6. Cadastral plan embed
7. Map with exact location
8. Educational tooltips

### Block 5 — Search Profile + Match Score (Weeks 12-13)
1. Onboarding flow for first profile
2. Profile management (CRUD)
3. Match score algorithm
4. Match visualization in property cards
5. Match explanation (what fits, what doesn't)

### Block 6 — Lists and Alerts (Weeks 14-16)
1. Search page with filters
2. Mobile-optimized property list
3. Favorites system
4. Email alerts (new matches, price drops)
5. In-app notification center
6. User dashboard

### Block 7 — Automated Services (Weeks 17-18)
1. Service catalog component
2. Mercado Pago integration (checkout + webhooks)
3. Service order management
4. Cadastral report flow (ARBA-based)
5. Dominion report flow (post-matriculation)
6. Order status tracking
7. PDF generation and delivery
8. Basic invoicing system

---

## What NOT to do

- ❌ Do not propose new tech stack components without explicit confirmation.
- ❌ Do not skip the Block order (Foundation → Ingestion → ...).
- ❌ Do not use `any` in TypeScript.
- ❌ Do not access database directly from components — always through `/lib/db`.
- ❌ Do not store secrets in code (use environment variables + Vercel env config).
- ❌ Do not implement features marked as Phase 2 or later during MVP construction.
- ❌ Do not write logic in API routes — extract to `/lib` and call it.
- ❌ Do not optimize prematurely. Make it work, then make it fast.
- ❌ Do not use client-side data fetching for SEO-critical pages (use Server Components).
- ❌ Do not break the mobile-first principle for desktop convenience.
- ❌ Do not duplicate the user-facing buyer flow with an agency flow in MVP — agencies come in Phase 2.

---

## Out of Scope for MVP

These features are valid but explicitly deferred:

**Phase 2 (post-MVP):**
- Explorer Mode (Instagram-style feed)
- Property publishing by agencies/owners
- Agency tiers (Pro/Premium)
- Comparison tool
- Algorithmic appraisals
- WhatsApp alerts
- Price heatmaps
- Personal checklist
- Personal objectives in search profile

**Phase 3+:**
- Native iOS/Android apps (use PWA for now)
- Geographic expansion beyond Zona Sur
- Referral system
- Educational content
- Contextual advertising
- Mortgage origination
- Own financing

If a request relates to these, confirm with the user before implementing.

---

## Domain Glossary

Spanish terms used in the codebase and UI:

| Term | English | Notes |
|---|---|---|
| Partida | Tax ID | ARBA's identifier for a parcel |
| Nomenclatura catastral | Cadastral nomenclature | Format: Partido-Circunscripción-Sección-Manzana-Parcela |
| Partido | District | PBA administrative division |
| ARBA | Provincial tax agency | Buenos Aires province |
| SIC | Cadastral Info System | ARBA's public/professional system |
| Informe de dominio | Dominion report | Property ownership/encumbrance report |
| Cédula catastral | Cadastral certificate | Official property data document |
| Certificado catastral | Cadastral certificate (escrow-grade) | Required for property transfer |
| Estado parcelario | Parcel status | Survey of parcel (surveyor-issued) |
| Martillero / Corredor | Real estate broker | Licensed professional |
| Escritura | Deed | Legal property transfer document |
| Escribano | Notary | Required for property deeds |
| Boleto de compraventa | Sale agreement | Preliminary purchase contract |
| Inhibición | Personal restriction | Restriction on a person's property rights |
| Embargo | Lien | Legal claim against property |

---

## Environment Variables

Required variables (set in `.env.local` for dev, Vercel env for prod):

```
# Supabase
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=

# Mercado Pago
MERCADOPAGO_PUBLIC_KEY=
MERCADOPAGO_ACCESS_TOKEN=
MERCADOPAGO_WEBHOOK_SECRET=

# Resend
RESEND_API_KEY=

# Sentry
SENTRY_DSN=
SENTRY_AUTH_TOKEN=

# Scraping
SCRAPER_USER_AGENT=
SCRAPER_PROXY_URL=  # optional, for rotation

# App
NEXT_PUBLIC_APP_URL=
INTERNAL_API_KEY=  # for cron job authentication
```

---

## Communication with User

The user (project owner) is:
- A Spanish speaker. Code comments and docs in English, user-facing content and conversation with user in Spanish.
- Technically engaged but not a professional developer. Explain technical decisions in clear terms.
- Has access to Claude Code 5x plan and uses it for execution.
- Has a parallel strategic conversation with Claude (Anthropic chat) for high-level planning.

When the user asks for clarification, prioritize explaining the **why** behind decisions, not just the **how**.

---

## Version

| Version | Date | Changes |
|---|---|---|
| 1.0 | May 2026 | Initial — MVP scope locked, stack confirmed, build order set |
| 1.1 | May 16, 2026 | B1.1 + B1.2 completed. Project name: Jotaeme. Added progress tracking. |
| 1.2 | May 16, 2026 | B1.3 completed. Supabase schema applied, RLS policies active, seed loaded, service_role key set. |
| 1.3 | May 16, 2026 | B1.4 completed. Auth pages, Server Actions, route protection, profile editing. Project moved out of OneDrive to C:\dev\jotaeme. |
| 1.4 | May 16, 2026 | B1.5 completed. Admin panel: dashboard, properties list+detail, users list. is_admin() helper + admin RLS policies. |
