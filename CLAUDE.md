# CLAUDE.md

> Configuration and rules for Claude Code working on this project.
> Read this file at the start of every session.

---

## Current Progress

**Status:** Block 1 ✅ + Block 2 ✅ + Block 3 ✅ + Block 4 ✅ + Block 5 ✅ + Block 6 ✅ + Block 7 — Servicios automatizados ✅ COMPLETED. MVP feature-complete; ready for the production cutover (Vercel env + MP prod credentials + matriculación + AFIP).

| Step | Status | Commit |
|---|---|---|
| B1.1 — Next.js + TypeScript + Tailwind | ✅ Done | `cb5c815` |
| B1.2 — shadcn/ui + dark mode | ✅ Done | `b50d100` |
| B1.3 — Supabase schema + RLS | ✅ Done | `b7f378d` + `a667d26` |
| B1.4 — Authentication | ✅ Done | `4ec7ea8` + `8985f95` + `e9ea248` |
| B1.5 — Admin panel | ✅ Done | `42744ba` |
| B1.6 — Vercel deploy + Sentry + Analytics | ✅ Done | `6033210` |

**Live URLs:**
- Production: https://jotaeme-beryl.vercel.app
- GitHub repo: https://github.com/Tomito-co54/Jotaeme
- Supabase project: https://cjnaxxidigdylnwlpyab.supabase.co
- Sentry project: jotaeme-web

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
- **Tipografía:** Inter (body) + Fraunces (headings vía `font-heading`), ambas vía `next/font/google`. Antes era Geist pero por un bug en `globals.css` (`--font-sans: var(--font-sans)` auto-referenciado) Geist nunca rendereó — la app entera caía a Times New Roman.

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

### Block 1 — Technical Foundation (Weeks 1-2) ✅ COMPLETE
1. ✅ Project setup (Next.js + TypeScript + Tailwind + shadcn/ui)
2. ✅ Supabase project + schema + RLS policies
3. ✅ Authentication (email/password; Google OAuth pending provider config)
4. ✅ Basic admin panel (protected routes, user list, property list)
5. ✅ Vercel deployment (production + preview)
6. ✅ Sentry + Vercel Analytics integration

### Block 2 — Data Ingestion (Weeks 3-6) ✅ COMPLETE
- ✅ B2.1: Zonaprop scraper (Playwright, list pages, persistence, history tracking)
- ✅ B2.1b: Trezza Propiedades scraper (local agency, infinite scroll, JSON-LD prices)
- ✅ B2.2: Property deduplication (fuzzy address matching, extensible to ARBA/geo)
- ✅ B2.4: OpenStreetMap geocoding (Nominatim client + 90d cache + ensurePropertyCoordinates)
- ✅ B2.3: ARBA SIC integration (WFS GeoServer + INTERSECTS/DWITHIN + 180d cache)
- ✅ B2.5: GitHub Actions cron pipeline (scrape → dedup → geocode → ARBA, daily 06:00 UTC)
- ✅ B2.6: History tracking helpers (lib/db/property-history.ts + admin UI: días en mercado, diff de precio, clasificación de eventos)

**Bloque 2 — Data Ingestion COMPLETO ✅**
1. Zonaprop scraper for Zona Sur GBA
2. Property deduplication logic
3. ARBA SIC integration (cadastral data fetching by address)
4. OpenStreetMap geocoding fallback
5. Vercel Cron job for periodic scraping
6. Property history tracking (price changes, listing status)

### Block 3 — Quality Score (Weeks 7-8) ✅ COMPLETE
- ✅ B3.1: `lib/scoring/` module — types, `gatherScoringInputs`, `computeQualityScore` (pure), `recomputeQualityScore` (I/O)
- ✅ B3.2: Sub-score Calidad del aviso (description + photos + field completeness + "consultar precio" penalty)
- ✅ B3.3: Sub-score Documentación (extensible component model — ready for Fase 2 owner-uploaded docs)
- ✅ B3.4: Sub-score Coherencia ARBA (declared vs ARBA surface diff bands)
- ✅ B3.5: Sub-score Tiempo en mercado (days-tracked curve + price-drop bonus + confidence ramp)
- ✅ B3.6: Sub-score Precio vs comparables (per-cluster median price/m² with sample-size confidence)
- ✅ B3.7: Persistence + `algorithm_version` + insufficient_data flag + `effective_weight_ratio`
- ✅ B3.8: `scripts/score-properties.ts` CLI with `ComparablesCache` batch warmup
- ✅ B3.9: Vitest setup + 34 unit tests (sub-scores + aggregation + renormalization)
- ✅ B3.10: GH Actions pipeline step (scrape → dedup → geocode → ARBA → score)
- ⏭ Admin UI for inspecting scores → deferred to Block 4 (junto con vista comprador)

**Bloque 3 — Quality Score COMPLETO ✅**

### Block 4 — Property View (Weeks 9-11) ✅ COMPLETE
- ✅ B4.1: Ruta pública `/p/[id]` + `getPropertyForPublicView` helper
- ✅ B4.2: Componentes base (PropertyTopBar con logo, PropertyCover, PropertyPriceBlock)
- ✅ B4.3: Sistema de tooltips educativos (`TermDefinition` + `lib/glossary.ts`)
- ✅ B4.4: Score visualization (anillo SVG con gradiente continuo + barras + sheet de desglose, compartido entre admin y público)
- ✅ B4.5: Sección "Datos oficiales" con íconos ✅⚠️🚨 derivados de los datos ARBA
- ✅ B4.6: Mapa Leaflet con marker + polígono ARBA (GeoJSON desde `arba_lookups.raw_response`)
- ✅ B4.7: Descripción con toggle "ver más" + sección Historial con timeline visual
- ✅ B4.8: CTAs Guardar/Contactar (placeholders B6/B7) + link al listing original
- ✅ B4.9: Link "Ver como comprador" desde admin a la vista pública
- ✅ B4.10: Tests + docs
- ⏭ Galería fullscreen con swipe → diferido hasta que scraper traiga fotos múltiples (hoy solo portada)
- ⏭ Plano catastral PDF (cédula) → entra en Block 7 (servicios pagos)

**Bloque 4 — Property View COMPLETO ✅**

### Block 5 — Search Profile + Match Score (Weeks 12-13) ✅ COMPLETE
- ✅ B5.0: Brand consistency en home/(app)/admin layouts (logo en vez de texto)
- ✅ B5.1: Algoritmo `lib/matching/match.ts` con 7 sub-scores (zone, price, type, operation, rooms, surface, must_haves) + bandas (No encaja / Encaja parcialmente / Buen match / Match perfecto) + interpolación de color compartida con quality. Sin hard-zero cliffs. 38 tests.
- ✅ B5.2: Migración `00007_search_profile_operation_type.sql` aplicada. `lib/db/search-profiles.ts` con CRUD completo + límite hardcodeado 2 perfiles (free tier).
- ✅ B5.3: Onboarding `/onboarding` con `SearchProfileForm` reusable. Redirige a `/dashboard` si ya tiene perfil.
- ✅ B5.4: `/busquedas` (lista + nueva + editar). Server actions con Zod validation. Soft-disable del CTA cuando se llega al límite.
- ✅ B5.5: `MatchScoreCard` en `/p/[id]` cuando el usuario está logueado y tiene perfil primario. Sheet lateral con desglose por sub-score + verdict icons (✅⚠️❌).
- ✅ B5.6: Dashboard redirige a `/onboarding` si el user no tiene perfiles (catch-all para nuevos signups + usuarios pre-existentes).
- ✅ B5.7: Dashboard con resumen del perfil primario (zonas, precio, mínimos, no-negociables) + cards más chicas de otras búsquedas + atajos a administrar/nueva.
- ✅ B5.8: 104 tests passing (66 anteriores + 38 nuevos de match)

**Bloque 5 — Search Profile + Match Score COMPLETO ✅**

### Block 6 — Lists and Alerts (Weeks 14-16) ✅ COMPLETE
- ✅ B6.1: `lib/db/matched-properties.ts` con `getMatchedProperties(profile, filters)` — sort por match desc, drop "No encaja" (<26), push de filtros básicos al DB
- ✅ B6.2: Ruta `/buscar` con chips de filtros (tipo, ambientes), toggle entre perfiles, empty state amable
- ✅ B6.3: `<PropertyCard>` reusable (foto + precio + meta + Match+Quality badges + heart) con click → /p/[id]
- ✅ B6.4: Sistema de favoritos: `getFavoritedPropertyIds` batch, `toggleFavoriteAction` con optimistic UI + rollback, cableado del corazón en `/p/[id]`, página `/favoritos`
- ✅ B6.5: Alertas in-app: `<NotificationBell>` en header con badge de unread + sheet con timeline (✨ new_match / ⬇ price_drop) + marcar leída individual o todas
- ✅ B6.6: `scripts/detect-alerts.ts` con detección new_match (match ≥70 en últimas 24h) + price_drop (en favoritos del user, en últimas 24h) + dedup por ventana de 14d. Step nuevo en GH Actions pipeline
- ✅ B6.7: `lib/services/email/` con Resend SDK. Templates HTML+texto plano hechos a mano (sin React Email/MJML — solo 2 templates). Brand-aligned (header navy, dorado highlights en price drops, CTA navy). Gracefully off si faltan RESEND_API_KEY o RESEND_FROM
- ✅ B6.8: 13 tests nuevos sobre email templates (escape XSS, recipiente sin nombre, cover opcional, etc.). **117 tests passing**

**Bloque 6 — Listas y Alertas COMPLETO ✅**

### Block 7 — Automated Services (Weeks 17-18) ✅ COMPLETE
- ✅ B7.1: Migración 00008 — service_orders extendido (currency, mp_preference_id, paid_at, delivered_at, metadata)
- ✅ B7.2: `lib/services/mercadopago/` (client, preferences, payments, webhook signature) + 8 tests
- ✅ B7.3: `lib/services/catalog.ts` (10 services, MVP solo informe_arba) + `createServiceOrderAction` + extensión de `lib/db/service-orders.ts`
- ✅ B7.4: Webhook `/api/mercadopago/webhook` con signature verification, idempotency, payment fetch contra MP API
- ✅ B7.5: PDF generator con `@react-pdf/renderer` — `lib/services/pdf/` (theme + fonts + geometry helpers + ArbaReportDocument). Fonts Inter + Fraunces vía `@fontsource/*` woff
- ✅ B7.6: Migración 00009 — bucket `service-deliverables` con RLS por orden + `uploadDeliverable()` + email `sendServiceDeliveryEmail` + cableado de `fulfillment.ts`
- ✅ B7.7: UI — `/p/[id]/servicios` (catálogo) + `/mis-servicios` (lista con status pills) + `<ServiceCard>` cliente + PropertyCTAs "Contactar" → "Servicios" + user menu links
- ✅ B7.8: Return URLs `/pago/exito` `/pago/pendiente` `/pago/error` con `<PaymentReturnLayout>` compartido
- ✅ B7.9: 12 tests nuevos (catalog + delivery email template + XSS escape) — **146 tests passing total** — más `docs/TESTING_BLOCK_7.md` con flujo manual e2e con tarjetas de prueba MP
- ⏭ B7.10: Vercel env + deploy + verify webhook + MP webhook config en panel (queda como follow-up del owner para activar prod)

**Pendientes externos al código (para pasar a producción real):**
- Configurar webhook en el panel MP (URL `https://jotaeme-beryl.vercel.app/api/mercadopago/webhook`, evento `payment`)
- Obtener `MERCADOPAGO_WEBHOOK_SECRET` del panel y setearlo en Vercel
- Agregar `MERCADOPAGO_PUBLIC_KEY` + `MERCADOPAGO_ACCESS_TOKEN` (TEST primero, PROD después) a Vercel
- Matriculación con contador + AFIP para factura electrónica formal

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
| 1.5 | May 16, 2026 | B1.6 + ENTIRE BLOCK 1 completed. Deployed to Vercel (jotaeme-beryl.vercel.app), Sentry capturing errors in production, Vercel Analytics live. GitHub repo at Tomito-co54/Jotaeme. |
| 1.6 | May 16, 2026 | B2.1 done. Zonaprop scraper working end-to-end: list pages, parsed cards (price, location, features, type), upsert with change detection, history tracking, deactivation of stale listings. Tested with Lomas de Zamora — 25 real properties scraped + persisted. |
| 1.7 | May 17, 2026 | B2.1b done. Trezza Propiedades scraper added (local agency, infinite scroll, JSON-LD prices). 52 active properties in Lomas across 2 sources. Next up: B2.2 (cross-source dedup). |
| 1.8 | May 17, 2026 | B2.2 done. property_groups table + fuzzy address matcher + /admin/groups view. Skip departamentos (same address = different units). Extensible for ARBA/geo. Next up: B2.3 (ARBA SIC). |
| 1.9 | May 17, 2026 | B2.4 done. Nominatim geocoding client (1 req/s, countrycodes=ar) + geocoding_cache table with 90-day TTL + ensurePropertyCoordinates(id) + CLI scripts/geocode-properties.ts. Backfilled all 54 active properties: 47 geocoded, 7 negative-cached (ambiguous addresses). Next up: B2.3 (ARBA SIC, now unblocked since we have coords). |
| 1.10 | May 17, 2026 | B2.3 done. Discovered ARBA exposes a public unauthenticated GeoServer WFS at geo.arba.gov.ar/geoserver/idera/wfs (no API key, no captcha). Built `lib/services/arba/` with WFS client, INTERSECTS-then-DWITHIN(30m) strategy + closest-by-centroid tiebreaker, `arba_lookups` table with 180-day TTL, and `ensurePropertyCadastral(id)`. Backfilled 47 geocoded properties: 46/47 enriched with partida + nomenclatura_catastral + surface_arba (15 INTERSECTS, 31 DWITHIN, 1 negative-cached). Next up: B2.5 (Vercel Cron — orchestrate scrape→dedup→geocode→ARBA pipeline). |
| 1.11 | May 17, 2026 | B2.5 done. Pivoted from Vercel Cron to GitHub Actions because Vercel Hobby caps cron invocations at 10s and our scrapers (Playwright) need minutes. `.github/workflows/pipeline.yml` runs the full chain (scrape Zonaprop + Trezza → dedup → geocode → ARBA) daily at 06:00 UTC and on-demand via `workflow_dispatch`. Each step has continue-on-error so a transient block doesn't stop the rest, but the workflow fails at the end if any step failed (alerting). Secrets `NEXT_PUBLIC_SUPABASE_URL` + `SUPABASE_SERVICE_ROLE_KEY` configured in repo. First successful end-to-end run: 14m30s. Caveat: setting GH secrets via PowerShell stdin pipes can inject a UTF-8 BOM into the value — use `gh secret set --env-file` with a `[System.Text.UTF8Encoding]::new($false)` written file instead. Next up: B2.6 (history tracking helpers). |
| 1.12 | May 17, 2026 | B2.6 done. **Bloque 2 cerrado.** `lib/db/property-history.ts` con helpers reusables: getPropertyHistory, lastPriceChange, computeDaysOnMarket, classifyHistoryEvent. Admin detail page enriquecida: badges con días-en-mercado y último diff de precio (con flecha + %), tabla de historial con clasificación visual de eventos (Cambio de precio / Listado dado de baja / Reactivado / etc.) + render rico de precio con colores (verde si bajó, rojo si subió). Próximo bloque: Block 3 — Quality Score. |
| 1.13 | May 17, 2026 | **Bloque 3 cerrado.** `lib/scoring/` con 5 sub-scores (Documentación, Precio vs comparables, Calidad del aviso, Tiempo en mercado, Coherencia ARBA), `computeQualityScore` puro + `recomputeQualityScore` I/O. Renormalización por confianza: sub-scores sin data se skipean en lugar de penalizar; `effective_weight_ratio < 0.30` ⇒ `insufficient_data: true` y score=null. Documentación modelada como **lista extensible de componentes** lista para Fase 2 (escritura subida, plano, dominio reciente, titular verificado). Versionado del algoritmo (`v1`) en cada breakdown. Persistencia en columnas `quality_score` + `quality_score_breakdown` (ya existían). `scripts/score-properties.ts` con `ComparablesCache.warmUp()` que pre-carga medianas por (partido, tipo) y evita N+1. Vitest setup como primer test runner del proyecto: **34 tests passing** cubriendo cada sub-score (high/low/skip), agregación, renormalización, y `insufficient_data`. Step `Recompute quality scores` agregado al final del pipeline en GH Actions. **Primera corrida sobre 54 propiedades activas**: 11 verdes (70+), 37 amarillos (40-69), 6 rojos (<40), 0 insufficient. La mayoría con `effective_weight_ratio` 54-90% porque (a) muchas no tienen `surface_total` declarado → Coherencia ARBA cae a confianza 0.3, (b) clusters chicos (Avellaneda casa n=1, Lanús ph n=1) hacen que Precio-vs-comparables se skipee. Ambos mejoran solos con más data. Próximo: Block 4 — Property View (incluye UI del score). |
| 1.14 | May 17, 2026 | **Bloque 4 cerrado.** Vista pública mobile-first `/p/[id]` con carga progresiva en capas. **Marca lockeada**: navy `#1A1B5C` + dorado `#D4A24C` (slogan: "Oportunidades Inmobiliarias"). Logo + isotipo en `public/brand/` (4 variantes: PNG + SVG x navy + white). Bandas del score (`Insuficiente / Mejorable / Aceptable / Bueno / Muy bueno / Excepcional`) con gradiente continuo rojo→verde de 0-94 y dorado hard-step en 95+. **Componentes compartidos** entre admin y público: `QualityScoreRing` (SVG con interpolación de color), `SubScoresList`, `ScoreBreakdownSheet`, `VerifiedDataList` (✅⚠️🚨 derivados del breakdown). **Mapa Leaflet** client-side con marker + polígono ARBA dibujado en navy semi-transparente desde `arba_lookups.raw_response`. **Tooltips educativos** (`<TermDefinition>` con popover) sobre términos catastrales — diccionario centralizado en `lib/glossary.ts`. **Descripción** con toggle "ver más" colapsado a 450ch (avg 806ch en data). **Historial visual** reusando helpers de B2.6 (`classifyHistoryEvent`, `computeDaysOnMarket`, render rico de price-transition con flechas + colores). **CTAs** Guardar/Contactar como placeholders (se cablean en B6/B7). Link "Ver como comprador" desde `/admin/properties/[id]`. Dark mode CSS vars ajustadas para que el navy quede legible. 21 tests nuevos sobre `bands.ts` + 11 nuevos sobre `verified-data.ts` (**66 tests passing**). Pendientes anotados: galería fullscreen con swipe (espera que el scraper traiga fotos múltiples — hoy solo portada) y plano catastral PDF (servicio pago, entra en Block 7). Próximo: Block 5 — Perfil de búsqueda + Match Score. |
| 1.15 | May 17, 2026 | **Bloque 5 cerrado.** Match score subjetivo por usuario, complementa al quality score objetivo. `lib/matching/` con 7 sub-scores (zone con 3 niveles preferido/aceptable/descarte, price con cliff, type, operation, rooms, surface, must_haves con detección por regex + sinónimos). Sin hard-zero cliffs — los mismatches caen al 5-10 pero se muestran en escala. Bandas de match: No encaja / Encaja parcialmente / Buen match / Match perfecto. Color de anillo reusa interpolación de quality. Migración 00007 agrega `operation_type` a `search_profiles` (aplicada vía `node scripts/db-run.mjs`). `lib/db/search-profiles.ts` con CRUD completo + límite hardcoded de 2 perfiles para free tier (`SearchProfileLimitError` para bumpearlo en B7 cuando salgan suscripciones). Form único reusable `<SearchProfileForm>` con `initialValues` opcional + `action` prop — sirve tanto a `/onboarding` (primer perfil) como a `/busquedas/nueva` y `/busquedas/[id]/editar`. Server actions con Zod, soft-disable del CTA "nueva" cuando se llega al límite. `MatchScoreCard` en `/p/[id]` sólo cuando hay sesión + perfil primario (anónimos no lo ven). Border lateral coloreado + badge con banda + sheet con desglose por sub-score (✅⚠️❌). Dashboard reformeado: redirige a `/onboarding` si no hay perfiles (catch-all post-signup), muestra perfil primario destacado + otras búsquedas + atajos. B5.0 housekeeping: brand consistency — todos los layouts (home, app, admin) ahora muestran el isotipo Jotaeme en vez de texto plano. 38 tests nuevos sobre match algorithm (**104 tests passing**). Próximo: Block 6 — Listas + Alertas (la vista filtrable de matches, favoritos, alertas por email). |
| 1.19 | May 19, 2026 | **Día de pulido + features post-MVP.** Owner declaró estrategia "construir profundo antes de comercializar" — MP queda en TEST, no se empuja AFIP/beta-testing. (a) **MP real-fix:** webhook configurado en panel MP, secret + access tokens en Vercel env, admin endpoint `/api/admin/orders/[id]/fulfill` + `outputFileTracingIncludes` para bundlear las fonts woff en los serverless. Primer fulfillment end-to-end real (PDF generado, upload a Storage, email Resend → inbox). `RESEND_FROM` a `onboarding@resend.dev` mientras no hay dominio. (b) **UX fixes:** logo del header → `/buscar` (no dashboard), texto "Jotaeme" redundante al lado del isotipo eliminado, bug edit-perfil (PGRST116 por scope cross-user de admins). (c) **Landing rica:** catálogo de 12 propiedades inline en home, sección de features con stats live + 4 cards animadas con `tw-animate-css`, grid 2-col en desktop, sort por proximidad a `ZONA_SUR_CENTER` para anónimos. (d) **`/guia-de-compra`:** 6 etapas + 10 documentos + glosario de 21 términos, contenido data-driven en `lib/education/buying-process.ts`. (e) **Dark mode theme tokens:** `--brand-heading`, `--brand-icon-bg`, `--brand-circle-bg`, etc. swap automático light/dark — antes navy headings desaparecían sobre el navy bg. (f) **Buying-process advisor:** migración 00010 agrega `current_stage` a `search_profiles`, form trae card "¿En qué etapa estás?", `lib/education/advisor.ts` mapea stage → main action, `<BuyingProcessAdvisor>` en `/p/[id]` con progress bar + docs típicos + CTA contextual (en due-diligence linkea al Informe Catastral). PRs #6-#17 mergeados. Google Geocoder setup iniciado pero pausado esperando prepago — la próxima sesión testea + migra Nominatim → Google. |
| 1.18 | May 18, 2026 | **Bloque 7 cerrado (MVP feature-complete).** Servicios automatizados pagos end-to-end. Migración 00008 (`service_orders` + currency/preference_id/paid_at/delivered_at/metadata) + 00009 (bucket `service-deliverables` con RLS por orden, 10MB cap, solo PDFs). `lib/services/mercadopago/` con client lazy, preferences (binary_mode, statement_descriptor, auto_return), payments fetch (nunca confiar en el webhook body) y signature HMAC-SHA256 con timingSafeEqual + 8 tests. `lib/services/catalog.ts` modela 10 servicios — MVP habilita solo `cadastral_report` ($8.000 ARS placeholder), el resto queda definido para enable progresivo. Server action `createServiceOrderAction` valida auth + propiedad + servicio disponible, crea orden en `pending_payment`, llama a MP, persiste `mp_preference_id`, devuelve `init_point`. Webhook `/api/mercadopago/webhook` con flow: signature → fetch payment real de MP → match por `external_reference` → sanity check de amount/currency → `markOrderPaid` idempotente (conditional UPDATE) → `fulfillServiceOrder` detached. PDF con `@react-pdf/renderer` + fonts Inter/Fraunces self-hosted desde `@fontsource/*` woff. Layout brand-aligned (navy header, dorado en folio, polígono ARBA renderizado como SVG con bbox + proyección cos(lat)-corregida). Upload a Supabase Storage con signed URL 30d. Email `sendServiceDeliveryEmail` brand-aligned con folio + property address + CTA "Descargar PDF" + 7 tests (XSS escape + recipient sin nombre). UI: `/p/[id]/servicios` (catálogo + trust signal MP) con `<ServiceCard>` cliente que llama action y redirige al init_point; `/mis-servicios` con status pills (pending_payment / paid / processing / delivered / refunded) + descarga directa + retry CTA; `/pago/{exito,pendiente,error}` con `<PaymentReturnLayout>` compartido. PropertyCTAs: "Contactar" → "Servicios". UserMenu sumó links a Buscar / Favoritos / Mis servicios. Endpoint dev `/api/dev/test-arba-pdf` (auto-404 en prod) para iteración del PDF sin pagar. `docs/TESTING_BLOCK_7.md` con cards de prueba MP, flujo APRO/CONT/OTHE, opciones de webhook local (ngrok vs trigger manual), edge cases (duplicados, sin ARBA), cutover a prod. 146 tests passing (134 + 12 nuevos). Pendiente B7.10 (Vercel env + webhook config en panel MP + prod credentials) queda como follow-up del owner. |
| 1.17 | May 18, 2026 | **Tipografía + bugfix.** Reemplazo de Geist por **Inter (body) + Fraunces (headings)** vía `next/font/google`. Las dos elegidas tras comparar Inter+Fraunces vs General Sans en una preview `/dev/fonts` borrada al cerrar. Inter da legibilidad de manual en precios/badges/m²/ambientes; Fraunces aporta el contraste editorial inmobiliario en Card/Dialog/Sheet titles (vía utility `font-heading`). **Bugfix crítico descubierto en el camino:** `globals.css:9` tenía `--font-sans: var(--font-sans)` (auto-referencia), así que `font-sans` resolvía a vacío y el browser caía a Times New Roman — Geist nunca rendereó desde B1.1. Arreglado: `--font-sans: var(--font-inter), ui-sans-serif, ...` y `--font-heading: var(--font-fraunces), Georgia, ...`. Además, variables CSS de `next/font` movidas de `<body>` a `<html>` porque `globals.css:152` aplica `font-sans` sobre `html` y necesita las vars en ese scope. `.claude/launch.json` gitignored. Próximo: Block 7. |
| 1.16 | May 18, 2026 | **Bloque 6 cerrado.** Discovery + retención: `/buscar` (matches del perfil primario ordenados por match desc, drop de "No encaja" <26, chips de filtros que estrechan no ensanchan), `/favoritos` con cards reusables, `<PropertyCard>` mobile-first con badges Match+Quality iguales en prominencia (o solo Quality cuando no hay perfil), corazón con optimistic UI y rollback. `<NotificationBell>` en el header `(app)`: campana con badge de unread + sheet con timeline + marcar leída individual o todas. `scripts/detect-alerts.ts` corre como step nuevo en el pipeline diario: detecta new_match (≥70 + first_seen <24h) y price_drop (en favoritos del user, en últimas 24h), dedup vía `hasRecentAlert` en ventana 14d. Envío de emails con Resend (`lib/services/email/`): templates HTML+texto hechos a mano, brand-aligned (header navy, dorado en price drops, CTA navy), gracefully off si faltan `RESEND_API_KEY` o `RESEND_FROM`. Pipeline.yml pasa las 3 env vars (key + from + APP_URL). 13 tests nuevos sobre email templates incluyendo escape XSS (**117 tests passing**). Theme fixes paralelos: BrandLogo ahora swap automático navy/white según tema; dark mode usa brand navy como background en vez del charcoal genérico de shadcn; meta theme-color + html bg para que mobile no muestre negro en el bounce area. Próximo: Block 7 — Servicios automatizados (MercadoPago + informes ARBA/dominio + PDFs). |
