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

**Status (28-ago-2026):** Deployado y funcionando en producción, con
auto-deploy desde `main`. **304 tests passing**, `npm run build` verde,
37 rutas.

Los mapas quedaron cerrados: el bloque de cobertura de la home dejó de
pelearse con su basemap y el sitio pasó a tener **proveedor de tiles
propio** (MapTiler). Lo que queda es de contenido:

1. **El catálogo tiene 2 propiedades publicadas.** El cargador funciona;
   es la razón de ser del sitio y no depende de nada técnico.
2. **El scraping corre a mano, no automático.** Zonaprop bloquea los
   runners de GitHub Actions, así que el pipeline vive en la PC de Tomy:
   `npm run pipeline`, entre 2 y 8 minutos. Automatizarlo con el
   programador de tareas de Windows quedó diferido a propósito.

**Recordarle correr el pipeline** cada vez que retome trabajo. Cada día
sin correr es historial de mercado que no se puede reconstruir después —
los avisos de la semana pasada ya no están en el portal.

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
| Fase 10 — Pipeline revivido | Diagnóstico de 90 corridas fallidas (los forks no heredan secrets de Actions). Cargados los dos secrets, el pipeline pasó la barrera pero seguía trayendo cero: Zonaprop sirve la **primera** navegación de una sesión de navegador y rechaza la segunda, sea cual sea la URL. Una sesión nueva por página → de 25 a **251 avisos por corrida**, sin proxy ni costo. `npm run pipeline` encadena los seis pasos. | `f957013` `caf8703` |
| Fase 11 — Integridad de la data de mercado | `crawl-completeness.ts`: la desactivación exige crawl exhaustivo — el tope de 50 "(testing)" daba por muertos a los que nunca miró, y había cientos de bajas inventadas. Limpieza de 317 bajas demostrablemente falsas (backup previo). Las reactivaciones se registran: el historial tenía 477 bajas y **cero** altas, así que `classifyChange` tenía una rama `relisted` que nunca podía dispararse. Migración 00014: precio al momento del cambio. | `8b0dd2e` `77d641f` `0c9fb47` |
| Fase 12 — El USD/m² dice la verdad | `effectiveSurface` prefería `surface_arba`, que es la superficie del **terreno**: para un departamento, el lote del edificio entero. Mediana de departamentos: 487 con parcela, **2.024** con superficie declarada. Y peor que el nivel era la mezcla — filas con dato catastral valuadas por m² de terreno y el resto por m² de propiedad, promediadas juntas. Filtro de plausibilidad 10–100.000 m². Mismo arreglo que `/p/[id]` recibió en junio (`56569dc`); este módulo era anterior. | `983badd` |
| Fase 13 — El centro de datos crece | `/admin/mercado/cambios`: los 231 eventos con filtros y orden por mayor baja, más media y mediana del movimiento porcentual recalculadas sobre lo visible. `/admin/mercado/mapa`: los 324 avisos geolocalizados, coloreados contra la mediana de su tipo, con selección de área por arrastre. Columnas USD/m² y antigüedad con escala de color en `/admin/properties`. | `67ac417` `6f58fb4` `d81046f` `3746c32` |
| Fase 14 — El mapa muestra la parcela | El polígono de ARBA no se dibujó **nunca**, por tres fallas encadenadas: `arba_lookups` es admin-read y la página pública lee con clave anónima; la vía por partida traía la geometría y la descartaba; y la página buscaba el lookup solo por lat/lng, clave que las propiedades propias nunca tienen. Migración 00015 + `arba/geometry.ts` (centro de parcela, que además da coordenadas más precisas que geocodificar). | `af8bb69` |
| Fase 15 — Navegación y tema | Toggle claro/oscuro en las seis cabeceras. No había forma de llegar a `/admin` clickeando: el CTA de la home iba a `/dashboard` y el menú listaba rutas legacy del portal de compradores. Dos logos que no volvían a la landing. | `0ef4681` `fe2ac1c` |
| Fase 16 — Mapas de verdad | El bloque de verificación de la home dibujaba un hexágono **inventado** (`"a believable parcel"`) al lado de un texto que promete "el polígono exacto de la parcela". Se reemplazó por la **zona de cobertura** sobre tiles reales de OSM: Lanús · Banfield · Lomas · Temperley, con los nombres de las localidades haciendo de etiqueta. `lib/map/tiles.ts` hace la aritmética de tiles sin Leaflet (~45 kB que no se pagan en la landing) y `projectToView` garantiza que polígono y mapa compartan proyección — en una versión intermedia no la compartían y la parcela aparecía cruzando una avenida. `lib/zona-sur/coverage.ts` + tests que verifican que el hexágono realmente contenga las localidades que nombra. | `086a284` `c651888` `8488028` `d92c899` |
| Fase 17 — El mapa tiene proveedor | Dos basemaps elegidos y descartados en un día, los dos por el mismo motivo: **devuelven HTTP 200 con la imagen de rechazo adentro**. CARTO estampa "API KEY REQUIRED" en diagonal; OSM, "Access blocked". Ninguna falla — las dos entregan un PNG del tamaño esperado, y solo se ven mirando los píxeles. Lo de OSM además era inevitable: sus servidores son de voluntarios y su política prohíbe exactamente esto, y no era solo la home (`/p/[id]` y `/admin/mercado/mapa` le pegaban directo). Ahora el basemap sale de `NEXT_PUBLIC_BASEMAP_URL` — MapTiler, estilo `landscape`, key con origins cerrados — y la atribución se deduce de la URL, que es un término de licencia y no un pie de foto. Aparecieron además dos bugs que los efectos visuales tapaban: **el mapa pintaba encima del polígono** (`absolute` sobre estático gana sin importar el DOM — todas las rondas anteriores de "el basemap le gana al hexágono" peleaban contra esto), y el marco cubría también el caption. Heptágono de 7 vértices, bordes nítidos con esquinas apenas redondeadas, match al 100 en azul de marca. | `45f9deb` `989be65` `ea712d5` (merge) |

**Tests:** 304 passing (176 al cierre de Fase 1.B → 216 tras la fase 9 →
275 tras las fases 10-15 → 300 tras la 16 → 304 tras la 17).

**Build:** `npm run build` verde. 37 rutas, First Load JS shared 183 kB.
3 warnings menores de `@typescript-eslint/no-unused-vars` que no bloquean
(vars `_omit`, `_req`, `ownerPropertyPublishSchema`).

**Live URLs:**
- Producción: **https://jm-inmobiliaria-d3pa.vercel.app** — deployada 12-ago-2026. Login de admin **verificado** el 24-ago. Auto-deploy desde `main`: un push llega a producción en ~60s.
- GitHub repo: https://github.com/Tomito-co54/JMInmobiliaria
- Supabase project: `https://cjnaxxidigdylnwlpyab.supabase.co` (**compartido con el proyecto original `jotaeme`** — decisión tomada: una única DB, el scraper alimenta la misma tabla).
- Sentry project: `jotaeme-web` (heredado del upstream).

**Project location:** `C:\dev\jotaeme-inmobiliaria` (hermano de `C:\dev\jotaeme` que es el original — este fork no toca al original).

**Contenido real (verificado 27-ago-2026):**

| Qué | Cuánto |
|---|---|
| Propiedades propias publicadas | **2** — Belgrano 1285 y 1287, Lomas de Zamora |
| Scrapeadas | 458 (431 Zonaprop · 27 Trezza) · 297 activas · **324 geolocalizadas** |
| `property_history` | 231 eventos — 160 bajas, 28 de precio, 31 descripciones |
| Total en la tabla | 460 |

El catálogo público muestra dos fichas. Cargar más es lo único que separa
al sitio de estar listo.

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

### Estado del pipeline de scraping (vivo, a mano)

```bash
npm run pipeline    # los seis pasos encadenados, 2-8 minutos
```

Corre **desde la PC de Tomy**, no en la nube, y eso no es una comodidad:
es la única forma en que funciona. Dos bloqueos distintos, descubiertos en
ese orden:

1. **Los forks de GitHub no heredan secrets.** 90 corridas murieron en
   `Verify required secrets are set` desde el día uno del fork. Resuelto
   cargando `NEXT_PUBLIC_SUPABASE_URL` y `SUPABASE_SERVICE_ROLE_KEY` en
   Settings → Secrets and variables → Actions.
2. **Zonaprop bloquea a los runners de Actions** (IPs de datacenter), y
   además rechaza el **segundo pedido de cada sesión de navegador**, sea
   cual sea la URL. Lo segundo se resuelve abriendo un navegador nuevo por
   página; lo primero, no. De ahí que corra localmente.

Techo conocido: la página 10 devuelve 403. Después de ~9 pedidos aparece
un límite acumulativo por IP. El crawl queda marcado como truncado y la
guarda de `crawl-completeness` saltea la desactivación, que es lo
correcto — no sabemos nada de las páginas que no abrimos.

Automatizarlo con el programador de tareas de Windows está **diferido a
propósito**. Mientras tanto, recordarle correr el comando.

### Integridad de la data de mercado

Tres cosas que parecían features y eran bugs. Anotadas porque el síntoma
en los tres casos era un número creíble, no un error:

- **La desactivación inventaba bajas.** `deactivateStale()` marca como
  inactivo todo lo que el crawl no vio, pero el crawl tenía un tope de 50
  documentado como *"(testing)"* que nunca se sacó. Cada corrida daba por
  muertos a los 250 restantes. Se limpiaron 317 bajas demostrablemente
  falsas; quedan 160 que no se pueden desmentir. Hoy la desactivación
  exige crawl exhaustivo (`lib/market/crawl-completeness.ts`).
- **El historial era asimétrico.** 477 bajas, cero altas — no porque
  ningún aviso volviera, sino porque `is_active` no está en
  `TRACKED_FIELDS` y la reactivación pasaba en silencio. `classifyChange`
  tenía una rama `relisted` imposible de disparar.
- **El USD/m² dividía por el terreno.** `effectiveSurface` prefería
  `surface_arba`, la superficie de la parcela catastral, que para un
  departamento es el lote del edificio entero. Mediana de departamentos:
  487 así, **2.024** con la superficie declarada.

### El basemap tiene dueño (y contesta 200 cuando dice que no)

Los tres mapas del sitio —bloque de cobertura de la home, `/p/[id]`,
`/admin/mercado/mapa`— toman sus tiles de **una sola** variable:
`NEXT_PUBLIC_BASEMAP_URL`. Hoy apunta a **MapTiler**, estilo `landscape`,
con la key restringida por origin a `localhost` y al dominio de producción.

Lo que hay que saber antes de tocarlo:

- **Un proveedor que te rechaza igual te devuelve 200.** CARTO estampa
  "API KEY REQUIRED" en diagonal sobre la tile; OSM devuelve una que dice
  "Access blocked". Las dos son PNG del tamaño esperado. **Verificar un
  cambio de basemap mirando el status o el peso no sirve: hay que mirar
  los píxeles.**
- **Los servidores de OSM no son una opción para este sitio.** Son de
  voluntarios y su política de uso prohíbe exactamente esto — repartirle
  sus tiles a los visitantes. Siguen como fallback si la variable no está
  seteada, para que los mapas dibujen algo en dev, no como plan.
- **La key es pública a propósito.** Viaja en la URL de cada tile, en el
  navegador de cada visitante. No se puede ocultar; lo único que protege
  la cuota es la lista de origins en el panel de MapTiler. Los deploys de
  **preview** de Vercel usan subdominios distintos y por eso salen sin
  mapas — es esperable, no un bug.
- **La atribución se deduce de la URL** (`attributionFor`), así que cambiar
  de proveedor no puede dejar el crédito equivocado abajo del mapa. Es un
  término de licencia, no un pie de foto.
- **Si se cambia de proveedor**, agregar su hostname a
  `images.remotePatterns` en `next.config.ts`, y revisar
  `nativeTilePixelsFor()`: MapTiler sirve tiles de 512px por el mismo
  terreno que los 256 de todos los demás, y de eso depende si hace falta
  el supersample (ver `BASEMAP_SUPERSAMPLE`).

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
- **Maps:** Leaflet (`/p/[id]`, mapa de mercado) + aritmética de tiles propia
  (`lib/map/tiles.ts`, bloque de la home). Las tiles las sirve **MapTiler**
  vía `NEXT_PUBLIC_BASEMAP_URL` — ver **El basemap tiene dueño** en Current
  progress
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
│   │   ├── mercado/              # ← Centro de datos (3 pantallas)
│   │   │   ├── page.tsx          #     dashboard: 5 módulos agregados
│   │   │   ├── cambios/          #     registro completo, filtros + media %
│   │   │   └── mapa/             #     mapa con selección por área
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
│   ├── map/                      # ← AreaMap (+.inner) — mapa multi-propiedad
│   │                             #   con selección por arrastre. Agnóstico:
│   │                             #   recibe puntos ya coloreados. Lo comparten
│   │                             #   el mapa de mercado y (a futuro) el público
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
│   │   │                         #   + geometry.ts (centro de parcela)
│   │   ├── scrapers/             # Zonaprop + Trezza (alimentan inteligencia de mercado)
│   │   ├── geocoding/            # Nominatim wrapper
│   │   ├── dedup/                # cross-source matching
│   │   ├── mercadopago/          # legacy upstream — checkout + webhook
│   │   ├── email/                # Resend wrappers
│   │   └── pdf/                  # @react-pdf renderer (informes ARBA)
│   ├── market/                   # ← lógica del centro de datos (pura, testeable)
│   │                             #   stats.ts · geo.ts (áreas) · listing-bands.ts
│   │                             #   (color) · crawl-completeness.ts
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
│   ├── migrations/               # 00001..00015 (00011+ son del fork)
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
- `property_history` — audit log de cambios. Migración 00014 sumó
  `price_at_change` + `price_currency_at_change`: una baja sin el precio al
  que se cayó contesta cuándo, no a cuánto, y el precio de la fila se pisa
  apenas el aviso vuelve — que es el caso interesante.
- `property_groups` — dedup cross-source.
- `geocoding_cache` — Nominatim TTL 90d.
- `arba_lookups` — ARBA WFS TTL 180d (con GeoJSON crudo). **Admin-read
  por RLS**: tiene una fila por cada aviso scrapeado, o sea el rastro del
  crawl. `/p/[id]` la lee con el admin client del lado del servidor,
  acotado a una propiedad que ya pasó el filtro público. Migración 00015
  agregó `by_partida` al enum de estrategias (las propiedades propias se
  cachean bajo el centro de su parcela, no bajo coordenadas geocodificadas).

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
12. **Fase 10 — Pipeline revivido** ✅ 27-ago (25 → 251 avisos/corrida)
13. **Fase 11 — Integridad de la data de mercado** ✅ 27-ago
14. **Fase 12 — El USD/m² dice la verdad** ✅ 27-ago
15. **Fase 13 — El centro de datos crece** ✅ 27-ago (cambios + mapa)
16. **Fase 14 — El mapa muestra la parcela** ✅ 27-ago
17. **Fase 15 — Navegación y tema** ✅ 27-ago
18. **Fase 16 — Mapas de verdad** ✅ 27-ago (zona de cobertura sobre tiles)
19. **Fase 17 — El mapa tiene proveedor** ✅ 28-ago (MapTiler + 2 bugs de pintado)

Detalles de cada fase en **Current progress** más arriba.

### Próximo

**1. Cargar propiedades reales** ← lo único que separa al sitio de lanzar

Vía `/admin/properties/nueva`. Hay 2 publicadas. No depende de nada
técnico: el cargador funciona, ARBA responde, el mapa dibuja la parcela.

**2. Correr `npm run pipeline` seguido**

Cada corrida acumula historial que no se puede reconstruir después.
Además, dos features del centro de datos están construidas y **esperando
datos** para tener algo que mostrar:

- **Republicaciones** — un aviso que se da de baja y vuelve más barato.
  Los cimientos están (las reactivaciones se registran, con precio), pero
  hasta que no pase una de verdad **con los arreglos puestos**, no hay
  nada que detectar.
- **Series temporales de USD/m²** — necesitan meses.

**3. Mapa de búsqueda público**

`components/map/AreaMap` ya es agnóstico y está probado con 324 puntos.
El público es una capa fina encima: cambian de dónde salen los puntos y
qué hace la selección. Esperando inventario — con 2 fichas no se puede
evaluar si está bien resuelto.

**4. Superficie cubierta en el scraper**

El USD/m² de casas mide el lote, no lo construido, porque Zonaprop
publica "superficie total". Los avisos **sí** muestran cubiertos y
descubiertos, pero en la **ficha individual**, no en el listado. Sacarlo
son 251 pedidos extra por corrida contra un techo de ~9. Bloqueado por
el mismo límite que el scraping, no por falta de código.

**5. Dominio propio + verificación en Resend**

Necesario recién cuando se encienda el informe ARBA pago. Hoy no bloquea.

**6. Automatizar el pipeline**

Tarea programada de Windows. Diferido a propósito por Tomy.

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

# Mapas
NEXT_PUBLIC_BASEMAP_URL=              # template de tiles; sin esto cae a OSM,
                                      # que devuelve "Access blocked" con 200

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
| 2.5 | Aug 28, 2026 | **El mapa ya no es prestado, y tres bugs salieron de atrás de los efectos.** El bloque de cobertura cambió de basemap dos veces en un día y las dos fueron descartadas por el mismo motivo, que vale documentar: **CARTO y OSM devuelven HTTP 200 con la imagen de rechazo adentro** —"API KEY REQUIRED" estampada en diagonal, "Access blocked"— así que verificar por status o por peso no alcanza; hay que mirar los píxeles. Lo de OSM era además inevitable: son servidores de voluntarios cuya política prohíbe justamente esto, y no era solo la home, `/p/[id]` y el mapa de mercado le pegaban directo. Ahora hay proveedor propio (MapTiler, `landscape`, origins cerrados) detrás de `NEXT_PUBLIC_BASEMAP_URL`, una variable para los tres mapas, con la atribución deducida de la URL. Y apareció lo que probablemente explicaba **todas** las rondas anteriores de "el basemap le gana al hexágono": **el mapa pintaba encima del polígono** —`absolute` sobre estático gana sin importar el orden del DOM— y el marco cubría también el caption. El difuminado de bordes, que era otra curita del mismo problema, se reemplazó por esquinas apenas redondeadas. Heptágono de 7 vértices y match al 100 en azul de marca, vía un token propio y **sin** tocar el dorado del Quality Score, que comparten diez surfaces. **300 → 304 tests.** |
| 2.4 | Aug 27, 2026 | **Mapas.** El bloque de verificación de la home dibujaba un hexágono inventado —el código lo llamaba `"a believable parcel"`— junto a un párrafo que promete el polígono exacto. Ahora muestra la zona de cobertura sobre tiles reales, con Lanús, Banfield y Temperley legibles debajo. Se escribió la aritmética de tiles a mano para no cargar Leaflet en la landing (~45 kB por un recuadro estático), y `projectToView` para que polígono y mapa compartan proyección: en una versión intermedia no la compartían y la parcela se dibujaba cruzando la Avenida Hipólito Yrigoyen. **275 → 300 tests.** Queda sin resolver el equilibrio visual entre el mapa y el hexágono — ver punto 3 del Build map. |
| 2.3 | Aug 27, 2026 | **Seis fases en un día, y todas empezaron como un bug que parecía un dato.** El pipeline llevaba 90 corridas muertas (los forks no heredan secrets) y, una vez arreglado eso, seguía trayendo cero: Zonaprop rechaza el segundo pedido de cada sesión de navegador. Una sesión por página lo llevó de 25 a **251 avisos por corrida**. Después salieron a la luz tres números que mentían con cara de precisos: la desactivación inventaba bajas por un tope "(testing)" de 50 que nunca se sacó (317 falsas, limpiadas); el historial registraba bajas y no altas, dejando la detección de republicaciones ciega desde la base; y el USD/m² dividía por la superficie del **terreno** — 487 contra 2.024 en departamentos. El centro de datos pasó de un dashboard a tres pantallas (dashboard, cambios, mapa con selección por área). Y el polígono de ARBA, que es la evidencia visual de todo el pitch del sitio, **no se había dibujado nunca**: tres fallas encadenadas, la raíz una política de RLS. **216 → 275 tests**, 34 → 37 rutas, migraciones 00014 y 00015. |
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
