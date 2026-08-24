# CLAUDE.md

> Configuration and rules for Claude Code working on this project.
> Read this file at the start of every session.

---

## Project identity

**Name:** Jotaeme — Inmobiliaria (personal real-estate agency website).

**One-liner:** Mi sitio de inmobiliaria personal. Catálogo curado de
**mis** propiedades, cargadas a mano. El scraping del upstream se
preserva para **inteligencia de mercado privada** (dashboard interno),
nunca para alimentar el catálogo público.

**Único usuario operativo:** vos (el martillero/corredor admin). No hay
registro público de usuarios — el sitio sirve dos audiencias:

- **Visitantes anónimos:** ven solo tus propiedades publicadas en el
  catálogo público.
- **Admin (vos):** entrás a `/admin`, cargás propiedades, mirás stats de
  mercado de las scrapeadas, gestionás el ciclo borrador → publicada →
  vendida.

**Modelo de negocio (nuevo):** no es B2C de compradores; es la web
operativa de **tu** inmobiliaria. Captás interesados sobre tu propio
inventario. Las scrapeadas viven en la base solo para que vos analices
el mercado.

---

## Origen del proyecto y pivote

Este repo (`Tomito-co54/JMInmobiliaria`) es un fork de
`Tomito-co54/Jotaeme`, un portal agregador buyer-facing que llegó a MVP
feature-complete (blocks 1–7) en la upstream. La sincronización inicial
trajo HEAD `e64b474` del upstream.

**Cambio conceptual al hacer el fork:**

- El catálogo público dejó de mostrar inventario agregado (zonaprop +
  trezza) y ahora **filtra** por `source IN ('owner_direct','agency')`
  AND `listing_status = 'publicada'`.
- El registro público fue eliminado (no `/register`, no Google OAuth, no
  CTAs "Crear cuenta" / "Empezar gratis"). Email + password por
  `/login` para que entres vos solamente.
- El scraping **NO se desactivó**. Los scrapers, ARBA WFS, geocoding,
  dedup, quality score — todo sigue funcionando. La data scrapeada queda
  en la misma tabla `properties` pero con `source != owner_direct/agency`
  y `listing_status = NULL`, lo que la excluye del catálogo público.
- Las propiedades propias se cargan desde `/admin/properties` mediante
  un cargador dedicado (cabeceada de partido + partida, ARBA WFS busca
  por `pda='...'` sin geocoding, fotos en bucket propio Supabase Storage).

---

## Current progress

**Status (24-ago-2026):** El sitio **está deployado y funcionando en
producción**, con auto-deploy desde `main` vía la integración GitHub de
Vercel. El login de admin está verificado. 216 tests passing, `npm run
build` verde.

Ya no hay un bloqueante técnico para lanzar. Los dos pendientes reales son
de **contenido y de datos**, no de código:

1. **El catálogo tiene 1 sola propiedad.** El cargador funciona desde
   mayo; simplemente no se usó. Es la razón de ser del sitio.
2. **El pipeline de scraping nunca corrió en este fork.** 90 runs, 0
   exitosos. Falla en `Verify required secrets are set` porque los forks
   de GitHub no heredan los secrets del repo original. La data de mercado
   quedó congelada el 29-jul-2026.

El segundo es urgente en un sentido que el primero no: la serie temporal
que el dashboard v2 necesita **no se puede recuperar retroactivamente**.
Cada día de pipeline caído es un día de historial perdido para siempre.

### Hitos (este fork)

| Fase | Qué entregó | Commit |
|---|---|---|
| Fork inicial | `e64b474` (sync con upstream Jotaeme) | `e64b474` |
| Fase 0 — Separación + Limpieza | Filtros públicos `source` + `listing_status`; baja del registro público; fix flujo reset password vía /auth/callback; SMTP de Supabase via Resend | `ab10631` `c8d6fe1` `361f471` `d189251` |
| Fase 1 — Cargador de propiedades | Migraciones 00011 (listing_status + tpa + CHECK constraint) + 00012 (bucket property-photos); ARBA por partida (getParcelByPartida + bridge); UI single-screen editor con fotos drag&drop; 28 tests nuevos | `434f015` `b2c20b0` `f68c6a1` `e86f735` |
| Fase 1.B — Polish del cargador | Filtros estado split (Gestión + Mercado + Origen); autosave silencioso por sección; inline validation de partida; "Re-consultar ARBA"; preview admin de borradores con banner | `927f50e` |
| Fase 2 — Rediseño de la home pública | Migración 00013 (`is_featured` + toggle ★ en admin, CHECK owner-only); `HomeHero` (cascade stagger 120ms, eyebrow dorado, Fraunces italic); `HomeProtagonist` (§2.6: rota 1/día entre `is_featured=true` publicadas, foto que sobresale del cuadrante, medallón de Quality Score); `HomeGuarantees` + `HomeGuaranteesClient` (Tono 1 ARBA sobrio con polígono que se dibuja; Tono 2 anillo Score + Match reactivo + secuencia de 3 pasos, hook propio `use-in-view.ts` sin librería); `HomeCatalog` + `PropertyPremiumCard` (cards editoriales grandes, foto flip izq/der, la destacada se excluye del catálogo). Rama `rediseno-home` mergeada a `main`. | `29609ad` `b93ab09` `ae16d81` `a61ab95` `56f6586` `36c39a3` (merge) |
| Fase 3 — Dashboard de mercado v1 | `/admin/mercado`: 5 módulos server-side (KPIs de inventario scrapeado, USD/m² por tipo con media/mediana/desvío, feed de cambios recientes desde `property_history`, distribución de Quality Score, tabla-explorador filtrable). Sin dependencias nuevas. | `781ae8f` `c025b72` (merge) |
| Fase 4 — Rediseño de `/p/[id]` | Layout editorial 2-col (panel de datos sticky scrolleable + foto full-bleed), fix `USD/m²` que usaba `surface_arba` en vez de la declarada. | `27ca7a3` `56569dc` `6877ab3` (merge) |
| Fase 5 — Dark mode + polish | Dark mode slate frío (no navy de marca — evita chillones); tintes claros arreglados en sheet de score y toast de favorito guardado; headline real "en construcción" reemplazado; polish general. | `54f9a27` `a52364f` `f601342` |
| Fase 6 — Animaciones scroll-triggered | Pasada de movimiento en la home (Reveal + cascades) — la home "se siente viva" sin librería de animación. | `79bbc31` `a300adf` (merge) |
| Fase 7 — Contacto / leads (canal principal) | `lib/brand/contact.ts` (`WHATSAPP_NUMBER`, `whatsappLink`, `propertyLeadMessage`); `WhatsAppButton` como CTA primario en `/p/[id]` panel desktop + barra sticky mobile con mensaje que nombra la dirección; `WhatsAppFloat` en toda la home con mensaje genérico. | `25cd9f2` `2088d0b` `2eb6629` `2cf1e41` (merges) |
| Fase 8 — Limpieza legacy en cara pública | "Esconder no borrar": se quitó CTA "Ver todas" (iba a `/buscar` viejo); se quitó "Guardar (próximamente)" del top bar de `/p/[id]`; `ShareButton` funcional (Web Share API + fallback a copiar link). Rutas legacy (`/buscar`, `/favoritos`, `/onboarding`, `/mis-servicios`, `/busquedas`) siguen vivas — Tomy puede usarlas como herramienta personal, no las ve el visitante anónimo. | `bfb53be` `873b744` (merge) |
| Fase 9 — Auth legible en producción | Diagnóstico del supuesto "SMTP roto" (ver más abajo — no lo estaba). `lib/auth/callback-errors.ts` + `/auth/callback` que propaga el `error_code` de Supabase en vez de aplanar todo a un redirect mudo; `AuthCallbackNotice` que lee el fragmento `#error=...` desde el cliente (el servidor no puede verlo). `lib/auth/password-reset-errors.ts`: el form de recuperación deja de anunciar "Email enviado" cuando Supabase devolvió 429. Rate limit de auth subido de 2 a 30 mails/hora vía Management API. 10 tests nuevos. | `8d1710a` `3c2a143` `e22fe6e` (merges) |

**Tests:** 216 passing (arrancamos en 176 al cierre de Fase 1.B; +30 por
las fases 2-8, +10 por la fase 9).

**Build:** `npm run build` verde. 34 rutas, First Load JS shared 183 kB.
3 warnings menores de `@typescript-eslint/no-unused-vars` que no bloquean
(vars `_omit`, `_req`, `ownerPropertyPublishSchema`).

**Live URLs:**
- Producción: **https://jm-inmobiliaria-d3pa.vercel.app** — deployada 12-ago-2026. Login de admin **verificado** el 24-ago. Auto-deploy desde `main`: un push llega a producción en ~60s.
- GitHub repo: https://github.com/Tomito-co54/JMInmobiliaria
- Supabase project: `https://cjnaxxidigdylnwlpyab.supabase.co` (**compartido con el proyecto original `jotaeme`** — decisión tomada: una única DB, el scraper alimenta la misma tabla).
- Sentry project: `jotaeme-web` (heredado del upstream).

**Project location:** `C:\dev\jotaeme-inmobiliaria` (hermano de `C:\dev\jotaeme` que es el original — este fork no toca al original).

**Contenido real (verificado 24-ago-2026):**

| Qué | Cuánto |
|---|---|
| Propiedades propias publicadas | **1** — `a33f1a22`, Belgrano 1285, Lomas de Zamora, `is_featured=true`, creada 28-may |
| Propiedades propias en borrador | 0 |
| Scrapeadas de Zonaprop | 274 |
| Scrapeadas de Trezza | 27 |
| `property_history` | 510 filas, sin crecer desde el 29-jul |

Cargar más propiedades antes de lanzar: el catálogo público muestra hoy
una sola ficha.

### Estado de email / auth (resuelto en Fase 9)

El `CLAUDE.md` v2.1 registraba "SMTP roto — no llegan emails de recovery".
**Era falso, y la causa real vale la pena documentarla porque el síntoma
engaña.**

- El SMTP custom está bien: `smtp.resend.com:465`, usuario `resend`.
  Los mails llegan al inbox, sin pasar por spam.
- El proyecto tenía `rate_limit_email_sent = 2/hora`. Probar el flujo de
  recuperación tres veces seguidas agotaba la cuota, y a partir de ahí
  Supabase devolvía 429 sin mandar nada.
- `requestPasswordReset()` devolvía `ok: true` **pase lo que pase** para
  evitar enumeración de emails, así que la pantalla seguía diciendo
  "Email enviado" mientras no salía nada. Ese silencio es lo que se
  interpretó como SMTP roto.
- Arreglado: el rate limit está en 30/hora (el default de Supabase cuando
  hay SMTP propio), y el 429 ahora se muestra. El resto de los errores
  sigue callado a propósito — el rate limit no revela si la cuenta
  existe, los demás sí.

**Pendiente relacionado, no urgente:** `smtp_admin_email` es
`onboarding@resend.dev`, el dominio sandbox de Resend, que solo entrega
al dueño de la cuenta. Hoy no bloquea nada porque el sitio no le manda
mails a terceros (no hay registro público, MercadoPago está apagado, y
los leads van por WhatsApp). Se vuelve bloqueante el día que se encienda
el informe ARBA pago; ahí hace falta dominio propio verificado en Resend.

### Estado del pipeline de scraping (roto)

```
91 runs desde el 26-may-2026.  Exitosos: 0.  Fallidos: 90.
Muere siempre en: "Verify required secrets are set"
```

Los forks de GitHub no heredan los secrets del repo original. El workflow
exige `NEXT_PUBLIC_SUPABASE_URL` y `SUPABASE_SERVICE_ROLE_KEY` y en
`Tomito-co54/JMInmobiliaria` nunca se cargaron. Los 302 registros de la
base los puso el repo original apuntando al mismo Supabase, y ese también
dejó de alimentarla el 29-jul.

Arreglo: cargar esos dos secrets en Settings → Secrets and variables →
Actions del repo. Es la tarea de menor esfuerzo y mayor efecto pendiente.

---

## Tech Stack — Fixed Decisions

Same as upstream — no se cambia stack sin confirmación explícita.

### Core
- **Frontend:** Next.js 15 (App Router) + React 19
- **Language:** TypeScript (strict mode)
- **Styling:** Tailwind CSS 4
- **UI Components:** shadcn/ui (Radix-based) — 13 componentes instalados
- **Backend / DB:** Supabase (PostgreSQL + Auth + Storage)
- **Hosting:** Vercel (deployado, auto-deploy desde `main`)
- **Forms:** React Hook Form + Zod validation
- **Tipografía:** Inter (body) + Fraunces (headings vía `font-heading`)

### Services
- **Payments:** Mercado Pago (legacy del upstream — servicios pagos)
- **Email:** Resend (SMTP de Supabase Auth + emails transaccionales)
- **Maps:** Leaflet + OpenStreetMap tiles (vista pública de propiedad)
- **Scraping:** Playwright (Zonaprop + Trezza, vivo, alimenta inteligencia de mercado)
- **Cadastral data:** ARBA WFS GeoServer (público sin auth)
- **Geocoding:** Nominatim / OSM (1 req/s, cacheado 90d)
- **Error tracking:** Sentry
- **Analytics:** Vercel Analytics

### Background Jobs
- **GitHub Actions** (`.github/workflows/pipeline.yml`): scrape diario
  de Zonaprop + Trezza → dedup → geocode → ARBA → quality score →
  alertas. Heredado del upstream. **Dispara todos los días a las 6 AM UTC
  pero falla desde el día uno del fork** — le faltan los secrets de
  Actions. Ver **Estado del pipeline de scraping** en Current progress.

---

## Architectural Principles

### 1. Mobile-first, radically
- Cada componente diseñado primero para viewport 375px (iPhone standard).
- Probar mobile **antes** de adaptar a desktop.
- Touch targets mínimo 44px.
- No hover-only para acciones críticas.

### 2. Server-first
- Default Server Components.
- `"use client"` solo cuando hace falta (state, effects, browser APIs).
- Data fetching server-side salvo interactividad real-time.

### 3. Type safety end-to-end
- TypeScript strict mode no-negociable.
- Zod schemas para todo input externo (forms, API, scraping outputs).
- Nunca `any`. Usar `unknown` y narrow, o definir tipos propios.

### 4. Separation of concerns
- `/app` → routing y páginas only
- `/components` → UI reutilizable
- `/lib` → business logic
- `/lib/db` → queries tipadas
- `/lib/services` → integraciones externas (ARBA, scrapers, MP, email, storage)
- `/lib/scoring` → quality score (puro, testeable)
- `/lib/matching` → match score (puro, testeable)
- `/lib/validators` → Zod schemas
- `/types` → tipos compartidos
- `/hooks` → hooks de cliente (ej. `useAutoSave`)

### 5. Security by default
- Row Level Security (RLS) habilitado en cada tabla Supabase.
- Service role keys nunca se exponen client-side.
- Validar inputs server-side aunque ya esté validado client-side.
- HTTPS only (Vercel se encarga).
- Nunca loguear passwords, tokens, datos de pago, ni DNI.
- Cumplir Ley 25.326 (Datos Personales Argentina).

### 5.1 Handling `SUPABASE_MANAGEMENT_TOKEN`

Vive en `.env.local` como `SUPABASE_MANAGEMENT_TOKEN`. Sirve para
Management API (config de auth, settings de proyecto). Reglas:

- **NUNCA** `cat .env.local`, `grep` el token, ni `echo $SUPABASE_MANAGEMENT_TOKEN`.
- **Solo vía sustitución de shell**: `curl -H "Authorization: Bearer
  $SUPABASE_MANAGEMENT_TOKEN" ...`. El comando contiene `$VAR` como
  literal; el shell sustituye al ejecutar y el valor va directo a curl.
- Para verificar que existe sin filtrarlo: `[ -n "$SUPABASE_MANAGEMENT_TOKEN" ] && echo OK`.
- Si el usuario lo pega en chat por accidente, tratarlo como
  comprometido: pedir revocación, generar uno nuevo, ponerlo en `.env.local`.

### 6. Performance budget
- Mobile First Contentful Paint < 1.5s en 4G.
- Largest Contentful Paint < 2.5s.
- Peso total < 500KB para páginas de listado.
- `next/image` para TODAS las imágenes (incluyendo fotos del bucket
  `property-photos` — `next.config.ts` whitelist incluye el hostname).
- Lazy-load below the fold.

---

## Project Structure

```
/
├── app/
│   ├── (auth)/                   # login, forgot-password, reset-password, verify-email
│   ├── (public)/                 # /, /p/[id], /p/[id]/servicios, /guia-de-compra
│   ├── (app)/                    # legacy del upstream — buscar, busquedas, favoritos, dashboard, perfil, alertas, mis-servicios
│   ├── admin/                    # ← panel principal de operación
│   │   ├── page.tsx              # dashboard de métricas
│   │   ├── properties/           # ← CARGADOR (nueva, listado, [id]/editar)
│   │   ├── mercado/              # ← Dashboard de inteligencia de mercado v1 (5 módulos)
│   │   ├── groups/               # dedup viewer (admin tool)
│   │   └── users/                # legacy
│   ├── api/                      # webhooks (MercadoPago, Sentry), admin fulfillment
│   ├── auth/callback/            # OAuth + email confirmation handler
│   ├── onboarding/               # legacy del upstream (search profiles)
│   ├── pago/                     # /exito, /pendiente, /error (MP returns)
│   └── layout.tsx
│
├── components/
│   ├── ui/                       # shadcn/ui base
│   ├── property/                 # PropertyHero, PropertyDataPanel, PropertyMobileBar, WhatsAppButton, ShareButton, PropertyMapSection, etc.
│   ├── scoring/                  # QualityScoreRing + Card + Sheet
│   ├── matching/                 # MatchScoreCard (legacy buyer feature)
│   ├── home/                     # HomeHero, HomeProtagonist, HomeGuarantees(+Client), HomeCatalog, PropertyPremiumCard, WhatsAppFloat
│   ├── shared/                   # BrandLogo, AdminSidebar, UserMenu, MetricCard, etc.
│   ├── education/                # BuyingProcessAdvisor (legacy)
│   └── search/                   # SearchProfileForm (legacy)
│
├── lib/
│   ├── db/                       # queries tipadas — properties, admin, favorites, etc.
│   │   └── property-sources.ts   # ← gate público (sources + listing_status)
│   ├── supabase/                 # clients (server, browser, middleware, admin)
│   ├── services/
│   │   ├── arba/                 # WFS client + getParcelByPartida + bridge
│   │   ├── scrapers/             # Zonaprop + Trezza (alimentan inteligencia de mercado)
│   │   ├── geocoding/            # Nominatim wrapper
│   │   ├── dedup/                # cross-source matching
│   │   ├── mercadopago/          # legacy upstream — checkout + webhook
│   │   ├── email/                # Resend wrappers
│   │   └── pdf/                  # @react-pdf renderer (informes ARBA)
│   ├── scoring/                  # quality.ts + subscores + comparables + bands
│   ├── matching/                 # match.ts (legacy buyer-side)
│   ├── validators/               # Zod schemas — auth, property, etc.
│   ├── auth/                     # ← copy de errores de auth (puro, testeable)
│   │                             #   callback-errors.ts + password-reset-errors.ts
│   ├── storage/                  # property-photos.ts (upload/delete helpers)
│   ├── zona-sur/                 # partidos + arbaCode mapping
│   ├── education/                # guía de compra contenido (legacy)
│   ├── brand/                    # tokens de marca
│   └── utils.ts
│
├── hooks/
│   ├── use-autosave.ts           # ← debounced autosave del cargador
│   └── use-in-view.ts            # ← IntersectionObserver + count-up rAF (Fase 2 bloque 4)
│
├── types/                        # tipos compartidos
├── public/brand/                 # logos navy/white, isotipo + full
├── supabase/
│   ├── migrations/               # 00001..00013 (00011+12+13 son del fork)
│   ├── seed.sql
│   └── reset.sql
├── scripts/                      # CLIs: scrape, dedup, geocode, ARBA, score, alerts, db-run
├── docs/                         # PLAN_MAESTRO, PLAYBOOK_PROMPTS, ARCHITECTURE, TESTING_BLOCK_7
└── CLAUDE.md
```

---

## Database Schema — Core Entities

### `properties` (la tabla central)

Columnas clave:

| Columna | Tipo | Nota |
|---|---|---|
| `id` | uuid PK | |
| `external_id` | text | ID en la fuente (zonaprop, trezza) — null para mías |
| `source` | enum | `owner_direct` / `agency` = MÍAS · `zonaprop` / `trezza` / etc. = scrapeadas |
| `url` | text | Link al listing original (solo scrapeadas) |
| `partido` | text | Nombre del partido (mapeado a `arbaCode` en `lib/zona-sur`) |
| `partida` | text | ARBA tax ID (9 dígitos, primeros 3 = código de partido) |
| `nomenclatura_catastral` | text | Desde ARBA |
| `address` | text | Dirección (obligatoria para publicar) |
| `lat`, `lng` | numeric | Geocoded (solo scrapeadas, mías no geocodean — entran por partida) |
| `property_type` | enum | casa / departamento / ph / lote / local |
| `operation_type` | enum | venta / alquiler |
| `price_amount`, `price_currency` | numeric / enum | |
| `surface_total`, `surface_covered`, `surface_arba` | numeric | Declaradas + ARBA real |
| `tpa` | text | **NEW**: Urbano / Rural (desde ARBA WFS) |
| `rooms`, `bedrooms`, `bathrooms`, `garages` | integer | |
| `description`, `photos` | text / jsonb | `photos` = array de URLs (primera = portada) |
| `first_seen_at`, `last_seen_at`, `is_active` | timestamps / bool | **Estado de mercado** — solo relevante a scrapeadas |
| `listing_status` | text | `borrador` / `publicada` / `vendida` — solo mías (CHECK constraint) |
| `is_featured` | boolean | Broker-curated flag para rotar la protagonista de la home. Solo owner sources (CHECK constraint, migración 00013). |
| `quality_score`, `quality_score_breakdown` | numeric / jsonb | |
| `created_at`, `updated_at` | timestamps | |

### Las **dos columnas de estado** son ortogonales

| Columna | Significado | Quién la setea | Aplica a |
|---|---|---|---|
| `is_active` | ¿El aviso sigue vivo en el portal de origen? | Scraper (auto baja al no verlo en el crawl) | Solo scrapeadas |
| `listing_status` | Workflow editorial del broker | Cargador `/admin` (manualmente) | Solo mías (CHECK constraint enforza) |

El **filtro público** combina ambas con AND:
```
source IN ('owner_direct','agency') AND listing_status = 'publicada'
```
Vive como constantes en `lib/db/property-sources.ts` y se aplica en 6
surfaces: home grid, home stats, `/p/[id]`, `/buscar`, `/favoritos`,
`/p/[id]/servicios` (action de checkout).

### Storage: bucket `property-photos`

- Migración 00012.
- Lectura pública (URLs servidas por Supabase CDN).
- Escritura admin-only (RLS via `public.is_admin()`).
- 10 MB por archivo, JPEG/PNG/WebP.
- Layout: `<propertyId>/<uuid>.<ext>`.
- Server Actions tienen body limit subido a 12 MB en `next.config.ts`.

### Otras tablas (legacy del upstream, siguen funcionando)

- `users` — perfiles de app extendiendo `auth.users`. Solo vos vas a estar acá.
- `search_profiles`, `favorites`, `alerts` — sistema de matching buyer-side del upstream. Sigue activo para que vos puedas usarlo "como comprador" si querés.
- `service_orders` — informes ARBA pagos via MercadoPago (Block 7 del upstream).
- `property_history` — audit log de cambios.
- `property_groups` — dedup cross-source.
- `geocoding_cache` — Nominatim TTL 90d.
- `arba_lookups` — ARBA WFS TTL 180d (con GeoJSON crudo).

---

## Build map

### Fases hechas (este fork)

1. **Fase 0 — Separación + Limpieza** ✅
2. **Fase 1 — Cargador de propiedades** ✅ (+ Polish B)
3. **Fase 2 — Rediseño de la home pública** ✅ (5 bloques, mergeado)
4. **Fase 3 — Dashboard de mercado v1** ✅ (`/admin/mercado`)
5. **Fase 4 — Rediseño de `/p/[id]`** ✅ (layout 2-col + fix USD/m²)
6. **Fase 5 — Dark mode slate + polish** ✅
7. **Fase 6 — Animaciones scroll-triggered** ✅
8. **Fase 7 — Contacto/leads (WhatsApp)** ✅ (CTA primario)
9. **Fase 8 — Limpieza legacy en cara pública** ✅ ("esconder no borrar")
10. **Deploy a producción (Vercel)** ✅ 12-ago-2026 — vinculado por la
    integración GitHub, auto-deploy desde `main`
11. **Fase 9 — Auth legible en producción** ✅ 24-ago-2026

Detalles de cada fase en **Current progress** más arriba.

### Próximo — ordenado por lo que más destraba

**1. Reparar el pipeline de scraping** ← empezar por acá

Dos secrets en GitHub (`NEXT_PUBLIC_SUPABASE_URL`,
`SUPABASE_SERVICE_ROLE_KEY`) en Settings → Secrets and variables →
Actions. Detalle del diagnóstico en **Current progress**.

Va primero por una razón de tiempo, no de importancia: el historial de
mercado no se puede reconstruir hacia atrás. Los avisos de Zonaprop de la
semana pasada ya no existen. Todo lo que el pipeline no capture hoy es
data que el dashboard v2 nunca va a tener.

**2. Cargar propiedades reales**

Vía `/admin/properties/nueva`. El catálogo público muestra 1 sola ficha.
Es la razón de ser del sitio y no depende de nada técnico.

**3. Dashboard de mercado v2** — bloqueado por (1) + semanas de espera

> **Área de interés declarada por Tomy (24-ago-2026):** quiere trabajar
> en este "centro de datos" — el dashboard privado que consume lo
> scrapeado. Es la mitad del producto que lo sirve a él y no al
> visitante, y la razón por la que el scraping se mantuvo vivo durante
> el pivote. Al retomar, arrancar mostrándole qué renderiza ya la v1 con
> los 302 registros adentro; puede no haberla visto con data real.

- Series temporales USD/m² (requiere meses de data)
- Listings rancios (>90, >180 días)
- Mapa de calor por zona
- Atribución por inmobiliaria publicadora — esta sí es código: extender el
  scraper y agregar columna `publisher_agency` a `properties`

Las tres primeras necesitan historial, no módulos nuevos. Construirlas
antes de que el pipeline acumule sería graficar una línea plana. La
cuarta (atribución por inmobiliaria) es la única que se puede hacer hoy
mismo: es código puro, no espera data.

**4. Dominio propio + verificación en Resend**

Necesario recién cuando se encienda el informe ARBA pago (ver **Estado de
email / auth**). Hoy no bloquea nada.

### Nice-to-haves post-lanzamiento

- Form de contacto por mail vía Resend para quien no usa WhatsApp
  (baja prioridad — el canal principal ya cubre el caso de uso).
- Galería fullscreen con swipe (espera múltiples fotos por propiedad).
- Eliminación total de surfaces legacy buyer-facing (`/buscar`,
  `/favoritos`, `/onboarding`, `/mis-servicios`, `/busquedas`) — hoy
  esconden sus CTAs públicos pero las rutas viven. Borrar solo si Tomy
  confirma que no las quiere como herramienta personal.

---

## Coding Conventions

### Naming
- **Files:** `kebab-case.tsx` para componentes, `camelCase.ts` para utils
- **Components:** `PascalCase`
- **Functions:** `camelCase`, verbos descriptivos (`getPropertyById`, no `property`)
- **Constants:** `SCREAMING_SNAKE_CASE` a nivel módulo
- **Types/Interfaces:** `PascalCase`, sin prefijo `I`
- **Database:** `snake_case` (convención Postgres)

### Component patterns
- Server Components por default. `"use client"` solo si hace falta.
- Co-locar lógica específica del componente.
- Props siempre tipadas con interface (no inline).

### Database access
- Cliente Supabase tipado.
- Todas las queries pasan por `/lib/db/`.
- Nunca SQL crudo en componentes ni API routes.
- Usar transacciones (`rpc`) para operaciones multi-paso.

### Error handling
- Throw typed errors.
- Server actions devuelven `{ ok: true, data } | { ok: false, error }`.
- Loguear errores a Sentry; nunca tragar silenciosamente.
- Mensajes user-friendly en español, no strings crudos de error.

### Testing
- Vitest para lógica pura (scoring, matching, validators, partidos).
- 176 tests passing al cierre de Fase 1.B.
- No buscar 100% cobertura. Cobertura de high-impact.

### Comments
- Código debe ser self-documenting por naming.
- Comentarios explican el **por qué**, no el qué.
- JSDoc en funciones públicas de `/lib`.

---

## Antes de tocar cualquier cosa visual

**Regla dura:** antes de modificar componentes visuales, layout, estilos,
tipografía, colores, spacing, copy de UI, o tomar cualquier decisión de
diseño — **leer `DIRECCION_DE_ARTE.md`** (vive en la raíz del repo).

Aplica a:
- Cambios en `app/page.tsx` (landing), `/p/[id]`, `/guia-de-compra`,
  o cualquier surface pública.
- Componentes de `components/property/`, `components/scoring/`,
  `components/home/`, `components/shared/`.
- Tokens en `lib/brand/`, `globals.css`, Tailwind config.
- Cualquier propuesta de "este botón se ve mejor así" / "movamos esto" /
  "cambiemos la jerarquía".

NO aplica a (lectura de DIRECCION_DE_ARTE no obligatoria):
- Cambios de lógica de negocio, queries, schemas, server actions sin
  impacto visual.
- Fixes de bugs que solo restauran comportamiento previo.
- Refactors internos sin cambio de UI.

Si la decisión que vas a tomar afecta cómo SE VE algo, leer el doc primero
y referenciar la sección relevante en el commit/explicación.

---

## What NOT to do

- ❌ No proponer nuevo stack sin confirmación explícita.
- ❌ No usar `any` en TypeScript.
- ❌ No acceder a la DB directo desde componentes — siempre por `/lib/db`.
- ❌ No guardar secretos en código (usar env vars + Vercel env config).
- ❌ No escribir lógica en API routes — extraer a `/lib` y llamar.
- ❌ No optimizar prematuramente. Hacelo andar, después acelerá.
- ❌ No usar fetching client-side en páginas SEO-críticas (Server Components).
- ❌ No romper el principio mobile-first por conveniencia desktop.
- ❌ **No filtrar `SUPABASE_MANAGEMENT_TOKEN`** — solo shell substitution.
- ❌ **No mostrar propiedades scrapeadas en surfaces públicas**. El filtro
  combinado (source + listing_status) en `lib/db/property-sources.ts` es la
  fuente de verdad. Cualquier query nueva que vaya al público tiene que
  honrarlo.
- ❌ **No escribir `listing_status` para propiedades scrapeadas**. La
  CHECK constraint en DB lo bloquea, pero el código no debería intentarlo
  tampoco.
- ❌ **No reactivar el registro público** — el modelo es admin único.

---

## Domain Glossary

Términos en español usados en el código y la UI:

| Term | English | Notes |
|---|---|---|
| Partida | Tax ID | ARBA's identifier for a parcel (9 dígitos, primeros 3 = partido) |
| Nomenclatura catastral | Cadastral nomenclature | Format: Partido-Circunscripción-Sección-Manzana-Parcela (43 chars) |
| Partido | District | División administrativa PBA |
| ARBA | Provincial tax agency | Buenos Aires province |
| SIC | Cadastral Info System | ARBA's public/professional system |
| WFS | Web Feature Service | Estándar OGC; geo.arba.gov.ar lo expone público |
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
| Borrador | Draft | `listing_status` inicial — no se publica |
| Publicada | Published | `listing_status` visible al público |
| Vendida | Sold | `listing_status` archivada — no se publica pero no se borra |

---

## Environment Variables

Vars requeridas (en `.env.local` para dev, Vercel env para prod).
`.env.example` etiqueta cada una con dónde tiene que estar seteada
(`[Vercel + local]`, `[Vercel only]`, `[Local only]`, `[Opcional]`) —
esa es la fuente de verdad, no esta lista.

Ojo con un malentendido recurrente: **`RESEND_API_KEY` no tiene nada que
ver con los emails de recuperación de contraseña.** Esos los manda
Supabase Auth con su propia config SMTP, que vive del lado de Supabase y
se toca por Management API o dashboard, no por env vars de la app. La
`RESEND_API_KEY` solo alimenta los emails transaccionales que manda el
código nuestro (`lib/services/email/`).

```
# Supabase
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
DATABASE_URL=                        # transaction pooler — para migrations via CLI
SUPABASE_MANAGEMENT_TOKEN=           # NEVER cat/echo — solo shell substitution

# Mercado Pago (legacy del upstream, sigue activo)
MERCADOPAGO_PUBLIC_KEY=
MERCADOPAGO_ACCESS_TOKEN=
MERCADOPAGO_WEBHOOK_SECRET=

# Resend
RESEND_API_KEY=
RESEND_FROM=                         # ej: 'Jotaeme <onboarding@resend.dev>'

# Sentry
NEXT_PUBLIC_SENTRY_DSN=
SENTRY_DSN=
SENTRY_ORG=
SENTRY_PROJECT=
SENTRY_AUTH_TOKEN=

# Scraping (para el pipeline diario — corre en GitHub Actions, no en Vercel)
SCRAPER_USER_AGENT=
SCRAPER_PROXY_URL=                   # opcional
GOOGLE_GEOCODING_API_KEY=            # solo scripts locales / Actions

# App
NEXT_PUBLIC_APP_URL=
INTERNAL_API_KEY=                    # cron auth
```

---

## Communication with User

- Vos sos hispanohablante. Comments y docs en inglés, contenido user-facing
  y conversación con vos en español argentino.
- Sos técnicamente engaged pero no developer profesional. Explicar
  decisiones técnicas en términos claros.
- Tenés Claude Code (plan 5x) y lo usás para ejecución.
- Tenés una conversación paralela con Claude (Anthropic chat) para
  planificación estratégica.
- Preferencias operativas declaradas en memoria:
  - **Actuar autónomamente**: ejecutar todo lo técnicamente posible (PS,
    push, PR, merge, install, dev server) sin delegar pasos manuales.
  - **Mergear PRs autónomamente** sin pedir confirmación cada vez.

Cuando pidas clarificación, priorizá el **por qué** detrás de las
decisiones, no solo el **cómo**.

---

## Version

| Version | Date | Changes |
|---|---|---|
| 2.2 | Aug 24, 2026 | **Sync con el estado real, tras reconstruir el entorno en una PC nueva.** Se corrigieron seis afirmaciones falsas de la v2.1: (1) el deploy a Vercel no estaba pendiente — está hecho desde el 12-ago y con integración GitHub, la nota "nunca vinculado, no hay `vercel.json` ni `.vercel`" apuntaba a la evidencia equivocada porque la integración Git no deja rastro en el repo; (2) el SMTP nunca estuvo roto — la causa era `rate_limit_email_sent = 2/hora` amplificado por un form que ocultaba el 429; (3) el pipeline no "sigue corriendo" — dispara pero falla desde el run #1 por secrets faltantes en el fork; (4) 206 tests → **216**; (5) 25 rutas → 34; (6) faltaba la Fase 9 entera. Build map reordenado por leverage: el pipeline va primero porque el historial de mercado no se puede reconstruir hacia atrás. Se agregó `lib/auth/` al Project Structure y dos secciones nuevas de estado (email/auth y pipeline). |
| 2.1 | Aug 12, 2026 | **Actualización pre-deploy.** El rediseño de home + `/p/[id]` + dashboard de mercado + WhatsApp + limpieza legacy están todos mergeados a `main` (HEAD `873b744`). Current progress reescrito como tabla de 8 fases (2-8 son nuevas). Build map colapsado: solo queda **Deploy a Vercel** como bloqueante. **206 tests passing** (+30 desde 2.0), `npm run build` verde (25 rutas). Se agregó `is_featured` al schema; `use-in-view.ts` a hooks; `mercado/` a admin; `WhatsAppButton` + `WhatsAppFloat` + `HomeHero/Protagonist/Guarantees/Catalog` + `PropertyPremiumCard` al Project Structure. |
| 2.0 | May 27, 2026 | **Fork inicializado.** Rewrite completo del CLAUDE.md para reflejar la identidad del proyecto (inmobiliaria personal, no portal buyer-facing). Conserva historia upstream como referencia. Listado de hitos del fork: separación + cargador + polish B. **176 tests passing** sobre la base de 146 del upstream. |
| 1.x | upstream | Las entradas anteriores (1.0 a 1.19) describen la construcción del portal buyer-facing original (`Tomito-co54/Jotaeme`). Preservadas como historia para entender por qué existen ciertas piezas (matching score, search profiles, /buscar, /favoritos, BuyingProcessAdvisor, MercadoPago + informe ARBA, etc.). |

### Upstream history (preservada como referencia)

| Version | Date | Changes |
|---|---|---|
| 1.19 | May 19, 2026 | Día de pulido + features post-MVP. MP real-fix end-to-end. Landing rica (catálogo + features + stats live). `/guia-de-compra`. Dark mode theme tokens. Buying-process advisor (migración 00010). PRs #6-#17 mergeados. |
| 1.18 | May 18, 2026 | **Block 7 cerrado (upstream MVP feature-complete).** Servicios automatizados pagos end-to-end (MercadoPago + informe ARBA en PDF). Migraciones 00008+00009. 146 tests. |
| 1.17 | May 18, 2026 | Tipografía: Geist → Inter + Fraunces. Bugfix `--font-sans: var(--font-sans)` auto-referenciado. |
| 1.16 | May 18, 2026 | **Block 6 cerrado.** Discovery + retención: `/buscar`, `/favoritos`, `<PropertyCard>` reusable, `<NotificationBell>`, `detect-alerts.ts` + Resend templates. 117 tests. |
| 1.15 | May 17, 2026 | **Block 5 cerrado.** Match score subjetivo. `lib/matching/` 7 sub-scores. Migración 00007. Onboarding + /busquedas CRUD. 104 tests. |
| 1.14 | May 17, 2026 | **Block 4 cerrado.** Vista pública `/p/[id]` mobile-first. Marca lockeada (navy + dorado). Mapa Leaflet + polígono ARBA. Tooltips educativos. Score visualization compartido entre admin y público. 66 tests. |
| 1.13 | May 17, 2026 | **Block 3 cerrado.** Quality Score: 5 sub-scores + renormalización por confianza + algoritmo `v1`. 34 tests. |
| 1.12 | May 17, 2026 | **Block 2 cerrado.** Property history helpers + admin UI enriquecida con días-en-mercado, diff de precio, clasificación de eventos. |
| 1.11 | May 17, 2026 | B2.5: GitHub Actions pipeline (pivot desde Vercel Cron por límite de 10s). |
| 1.10 | May 17, 2026 | B2.3: ARBA SIC via WFS GeoServer. `arba_lookups` cache 180d. INTERSECTS-then-DWITHIN(30m). |
| 1.9 | May 17, 2026 | B2.4: Nominatim geocoding + 90d cache + `ensurePropertyCoordinates`. |
| 1.8 | May 17, 2026 | B2.2: `property_groups` + fuzzy address matcher + `/admin/groups`. |
| 1.7 | May 17, 2026 | B2.1b: Trezza scraper (infinite scroll, JSON-LD prices). |
| 1.6 | May 16, 2026 | B2.1: Zonaprop scraper end-to-end (25 propiedades Lomas). |
| 1.5 | May 16, 2026 | **Block 1 cerrado.** Vercel + Sentry + Analytics. |
| 1.4 | May 16, 2026 | B1.5: Admin panel (dashboard + properties list+detail + users list). |
| 1.3 | May 16, 2026 | B1.4: Auth (email/password, OAuth pending). |
| 1.2 | May 16, 2026 | B1.3: Supabase schema + RLS + seed. |
| 1.1 | May 16, 2026 | B1.1 + B1.2. Proyecto: Jotaeme. |
| 1.0 | May 2026 | MVP scope locked, stack confirmado, build order set. |
