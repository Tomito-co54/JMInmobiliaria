# 📋 Playbook de Prompts para Claude Code

> **Cómo usar este documento:**
>
> 1. Abrí Claude Code en la carpeta de tu proyecto
> 2. Buscá el bloque/paso en el que estás trabajando
> 3. Copiá el prompt que está dentro del recuadro `---PROMPT---`
> 4. Pegalo en Claude Code
> 5. Cuando termine, pasá al siguiente prompt
>
> **Recordá:** Claude Code lee automáticamente el `CLAUDE.md` de la raíz del proyecto. No hace falta repetirle el contexto general en cada prompt.

---

## 🗺️ Índice rápido

### 🏁 Preparación
- [P0.1 — Setup inicial del repositorio](#p01--setup-inicial-del-repositorio)

### 🧱 Bloque 1 — Fundación técnica
- [B1.1 — Inicializar Next.js + TypeScript + Tailwind](#b11--inicializar-nextjs--typescript--tailwind)
- [B1.2 — Instalar y configurar shadcn/ui](#b12--instalar-y-configurar-shadcnui)
- [B1.3 — Configurar Supabase y schema inicial](#b13--configurar-supabase-y-schema-inicial)
- [B1.4 — Implementar autenticación](#b14--implementar-autenticación)
- [B1.5 — Panel de administración básico](#b15--panel-de-administración-básico)
- [B1.6 — Deploy a Vercel + Sentry + Analytics](#b16--deploy-a-vercel--sentry--analytics)

### 🧱 Bloque 2 — Ingesta de datos
- [B2.1 — Scraper de Zonaprop](#b21--scraper-de-zonaprop)
- [B2.2 — Sistema de deduplicación](#b22--sistema-de-deduplicación)
- [B2.3 — Integración con ARBA SIC](#b23--integración-con-arba-sic)
- [B2.4 — Geocodificación con OpenStreetMap](#b24--geocodificación-con-openstreetmap)
- [B2.5 — Cron jobs de scraping](#b25--cron-jobs-de-scraping)
- [B2.6 — Histórico de cambios](#b26--histórico-de-cambios)

### 🧱 Bloque 3 — Score de calidad
- [B3.1 — Algoritmo de score con 5 variables](#b31--algoritmo-de-score-con-5-variables)
- [B3.2 — Sub-scores y trigger de recálculo](#b32--sub-scores-y-trigger-de-recálculo)
- [B3.3 — Herramienta admin para debug de scores](#b33--herramienta-admin-para-debug-de-scores)

### 🧱 Bloque 4 — Vista de propiedad
- [B4.1 — Página de propiedad mobile-first](#b41--página-de-propiedad-mobile-first)
- [B4.2 — Galería fullscreen con swipe](#b42--galería-fullscreen-con-swipe)
- [B4.3 — Visualización del score](#b43--visualización-del-score)
- [B4.4 — Datos verificados con íconos](#b44--datos-verificados-con-íconos)
- [B4.5 — Plano catastral y mapa](#b45--plano-catastral-y-mapa)

### 🧱 Bloque 5 — Perfil y match score
- [B5.1 — Onboarding del perfil de búsqueda](#b51--onboarding-del-perfil-de-búsqueda)
- [B5.2 — CRUD de perfiles](#b52--crud-de-perfiles)
- [B5.3 — Algoritmo de match score](#b53--algoritmo-de-match-score)
- [B5.4 — Visualización y explicación del match](#b54--visualización-y-explicación-del-match)

### 🧱 Bloque 6 — Listas y alertas
- [B6.1 — Buscador con filtros](#b61--buscador-con-filtros)
- [B6.2 — Sistema de favoritas](#b62--sistema-de-favoritas)
- [B6.3 — Alertas por email](#b63--alertas-por-email)
- [B6.4 — Centro de notificaciones in-app](#b64--centro-de-notificaciones-in-app)

### 🧱 Bloque 7 — Servicios automatizados
- [B7.1 — Catálogo de servicios](#b71--catálogo-de-servicios)
- [B7.2 — Integración Mercado Pago](#b72--integración-mercado-pago)
- [B7.3 — Flujo de informe catastral](#b73--flujo-de-informe-catastral)
- [B7.4 — Flujo de informe de dominio](#b74--flujo-de-informe-de-dominio)
- [B7.5 — Generación de PDFs y entrega](#b75--generación-de-pdfs-y-entrega)

### 🛠️ Utilidades transversales
- [U.1 — Refactor de un módulo existente](#u1--refactor-de-un-módulo-existente)
- [U.2 — Resolver un bug](#u2--resolver-un-bug)
- [U.3 — Agregar tests a un módulo](#u3--agregar-tests-a-un-módulo)
- [U.4 — Optimizar performance de una página](#u4--optimizar-performance-de-una-página)
- [U.5 — Code review de cambios recientes](#u5--code-review-de-cambios-recientes)

---

## 🎯 Cómo escribir mejores prompts

Antes de los prompts en sí, algunos principios para que entiendas qué hace que un prompt sea bueno:

### Principios

1. **Contexto al inicio, acción al final** — primero qué hay/qué se asume, después qué hacer
2. **Específico sobre lo que NO querés** — "no agregues animaciones todavía", "no crees tests aún"
3. **Pedir validación antes de cambios grandes** — "muéstrame el plan antes de tocar archivos"
4. **Referenciar archivos existentes** — Claude Code los lee solo si vos los nombrás
5. **Pedir output verificable** — "al terminar, hacé un `npm run build` y mostrame el resultado"

### Truco útil

Al final de cualquier prompt, podés agregar esto y suele mejorar el resultado:

> *Antes de hacer cambios, mostrame tu plan paso a paso. Si algo no está claro, preguntame en lugar de asumir.*

---

## 🏁 Preparación

### P0.1 — Setup inicial del repositorio

**Cuándo usarlo:** ANTES de cualquier prompt de construcción. Esto crea la base del proyecto.

**Pre-requisito:** tener `CLAUDE.md` y `PLAN_MAESTRO.md` en una carpeta nueva y vacía donde vas a construir el proyecto.

---PROMPT---

Estoy iniciando un proyecto nuevo. En esta carpeta tengo dos archivos de referencia:

- `CLAUDE.md` — reglas técnicas y arquitectónicas del proyecto
- `PLAN_MAESTRO.md` — documento estratégico completo (en español)

Por favor:

1. Leé el `CLAUDE.md` completo antes de hacer cualquier cosa
2. Confirmame en 5-7 puntos los aspectos clave que entendiste del proyecto
3. NO crees ningún archivo ni instales nada todavía
4. Decime qué vas a necesitar de mi lado (cuentas, API keys, etc.) antes de poder arrancar

---FIN PROMPT---

---

## 🧱 Bloque 1 — Fundación técnica

### B1.1 — Inicializar Next.js + TypeScript + Tailwind

**Cuándo:** después del P0.1 confirmado.

**Tiempo estimado:** 30-60 minutos.

---PROMPT---

Vamos a inicializar el proyecto siguiendo las reglas del `CLAUDE.md`.

Acciones a realizar:

1. Inicializar un proyecto Next.js 15 con TypeScript (strict mode), Tailwind CSS 4, ESLint, App Router, sin `src/` directory
2. Configurar la estructura de carpetas según lo especificado en `CLAUDE.md` → "Project Structure"
3. Crear archivos vacíos `.gitkeep` en las carpetas vacías para que git las preserve
4. Configurar `tsconfig.json` con strict mode y los paths para imports absolutos (`@/components`, `@/lib`, etc.)
5. Crear un `.env.example` con todas las variables listadas en `CLAUDE.md` → "Environment Variables", sin valores
6. Crear un `README.md` corto que explique cómo arrancar el proyecto localmente
7. Inicializar git y hacer el primer commit con mensaje "chore: initial project setup"

Antes de empezar, mostrame el plan exacto de comandos que vas a correr. Si algo no está claro respecto al `CLAUDE.md`, preguntame.

Al terminar, corré `npm run dev` y confirmame que la app inicia correctamente.

---FIN PROMPT---

---

### B1.2 — Instalar y configurar shadcn/ui

**Cuándo:** después de B1.1.

**Tiempo estimado:** 30 minutos.

---PROMPT---

Vamos a instalar shadcn/ui en el proyecto.

Acciones:

1. Inicializar shadcn/ui con la configuración predeterminada (zinc, CSS variables, etc.)
2. Instalar estos componentes que vamos a necesitar pronto: button, input, label, form, card, dialog, dropdown-menu, toast, sonner, avatar, badge, separator, skeleton, sheet, tabs
3. Crear un archivo `app/page.tsx` que muestre brevemente cada uno de estos componentes en un formato simple, solo para verificar que están funcionando (lo borramos después)
4. Configurar el theme provider con soporte para light/dark mode (next-themes)

Al terminar:
- Mostrame el listado final de archivos creados
- Corré `npm run dev` y confirmame que la página de prueba carga sin errores

---FIN PROMPT---

---

### B1.3 — Configurar Supabase y schema inicial

**Cuándo:** después de B1.2.

**Pre-requisito:** tener una cuenta en Supabase y un proyecto creado. Tener las credenciales a mano.

**Tiempo estimado:** 2-3 horas.

---PROMPT---

Vamos a configurar Supabase como backend del proyecto.

Pre-requisito: tengo el proyecto creado en Supabase. Te voy a pasar las credenciales para que las sumes al `.env.local`.

Acciones:

1. Instalar `@supabase/supabase-js` y `@supabase/ssr`
2. Crear los archivos de cliente Supabase según patrón oficial para Next.js App Router:
   - `lib/supabase/client.ts` (browser client)
   - `lib/supabase/server.ts` (server client)
   - `lib/supabase/middleware.ts` (para refrescar sesión)
3. Configurar middleware de Next.js (`middleware.ts` en raíz) para manejar sesión
4. Crear migrations SQL en `supabase/migrations/` para las entidades core descritas en el `CLAUDE.md` → "Database Schema":
   - `properties`
   - `property_history`
   - `users` (extendiendo auth.users con metadata)
   - `search_profiles`
   - `favorites`
   - `service_orders`
   - `alerts`
5. Configurar Row Level Security (RLS) en cada tabla con políticas básicas:
   - `users`, `search_profiles`, `favorites`, `service_orders`, `alerts`: cada usuario ve solo sus propios datos
   - `properties`, `property_history`: lectura pública, escritura solo admin
6. Crear las funciones helper en `lib/db/` para queries tipadas básicas
7. Generar los tipos TypeScript desde el schema con `supabase gen types`
8. Crear seed file básico en `supabase/seed.sql` con datos de prueba (3-5 propiedades de ejemplo)

Antes de ejecutar las migrations en mi proyecto Supabase, mostrame el SQL completo para que lo revise.

Al terminar, hacé un commit con mensaje "feat: supabase setup and core schema".

---FIN PROMPT---

---

### B1.4 — Implementar autenticación

**Cuándo:** después de B1.3.

**Tiempo estimado:** 3-4 horas.

---PROMPT---

Vamos a implementar el sistema de autenticación.

Funcionalidad requerida:

1. **Registro** con email + contraseña, con email de confirmación
2. **Login** con email + contraseña
3. **Login con Google OAuth** (necesito instrucciones para configurar el provider en Supabase)
4. **Logout**
5. **Recuperación de contraseña** por email
6. **Página de perfil básica** donde el usuario puede editar su nombre y teléfono

Páginas a crear (en `app/(auth)/`):
- `/login`
- `/register`
- `/forgot-password`
- `/reset-password`
- `/verify-email` (para confirmar email post-registro)

Reglas técnicas:
- Server Components donde sea posible
- Server Actions para los formularios (no API routes)
- Validación con Zod
- Mensajes de error en español, claros y útiles
- Diseño mobile-first siguiendo `CLAUDE.md`
- Usar componentes de shadcn/ui ya instalados
- Después del login exitoso, redirigir a `/dashboard` (creá un placeholder simple)

Al terminar:
- Mostrame las páginas funcionando (capturas o instrucciones para probarlas)
- Decime qué configuraciones necesito hacer en Supabase (URLs de redirect, etc.)

---FIN PROMPT---

---

### B1.5 — Panel de administración básico

**Cuándo:** después de B1.4.

**Tiempo estimado:** 2-3 horas.

---PROMPT---

Vamos a crear un panel de administración básico para mí (admin) en `app/admin/`.

Funcionalidad:

1. **Acceso protegido**: solo usuarios con role `admin` pueden entrar. Si no, redirige a home.
2. **Layout admin** con sidebar de navegación
3. **Dashboard de overview** con métricas básicas:
   - Cantidad total de propiedades en base
   - Cantidad de propiedades activas vs inactivas
   - Cantidad de usuarios registrados
   - Cantidad de favoritos creados (último mes)
   - Cantidad de servicios contratados (último mes)
4. **Lista de propiedades** con buscador, filtros básicos (zona, tipo, activo/inactivo), y paginación
5. **Detalle de propiedad** con todos los datos crudos (para debug)
6. **Lista de usuarios** con buscador

No incluir todavía:
- Edición de propiedades desde el admin
- Aprobaciones manuales
- Gestión de roles

Crear primero un script SQL o función para que pueda asignarme manualmente el role `admin` a mi cuenta.

---FIN PROMPT---

---

### B1.6 — Deploy a Vercel + Sentry + Analytics

**Cuándo:** después de B1.5.

**Pre-requisito:** cuenta en Vercel, cuenta en Sentry.

**Tiempo estimado:** 1-2 horas.

---PROMPT---

Vamos a poner el proyecto en producción y agregar observabilidad.

Acciones:

1. **Vercel deploy**:
   - Decime exactamente qué tengo que hacer en Vercel (no podés hacerlo vos)
   - Asegurate de que el proyecto buildea localmente sin errores antes
   - Configurar todas las variables de entorno (decime qué setear)
   - Configurar dos environments: production (main branch) y preview (otras branches)

2. **Sentry**:
   - Instalar `@sentry/nextjs`
   - Configurar para capturar errores client + server + edge
   - No reportar errores en desarrollo local
   - Filtrar datos sensibles (passwords, tokens) antes de enviar

3. **Vercel Analytics**:
   - Instalar `@vercel/analytics`
   - Agregar al layout root

4. **Plausible Analytics** (opcional, privacy-friendly):
   - Si te parece bueno, sugerime cómo agregarlo
   - Si no, decime por qué

Al terminar:
- Confirmar que el deploy funciona
- Generar un error de prueba para confirmar que Sentry lo captura
- Hacer commit y push final del bloque 1

---FIN PROMPT---

---

## 🧱 Bloque 2 — Ingesta de datos

> **Nota importante:** este bloque es el más complejo técnicamente. Tomate tu tiempo, hacelo bien. Si algo falla, es preferible iterar despacio que apurar.

### B2.1 — Scraper de Zonaprop

**Cuándo:** después de B1.6 con todo funcionando en producción.

**Tiempo estimado:** 4-6 horas (incluyendo testing).

---PROMPT---

Vamos a construir el scraper de Zonaprop para Zona Sur GBA.

**Importante sobre legalidad y buenas prácticas:**
- Respetar robots.txt de Zonaprop
- Implementar rate limiting (no más de 1 request cada 3-5 segundos)
- Usar un user agent identificable (no fingir ser un navegador normal)
- No redistribuir el contenido textual tal cual — solo extraer datos estructurados

Acciones:

1. Instalar Playwright (con Chromium)
2. Crear estructura en `lib/services/scrapers/zonaprop/`:
   - `index.ts` — interfaz pública
   - `client.ts` — config de Playwright
   - `parser.ts` — extracción de datos del HTML
   - `types.ts` — tipos del scraper
3. Implementar el flujo:
   - **List scraper**: dado un partido (Lomas, Banfield, Lanús, Avellaneda, Quilmes), obtener todas las URLs de propiedades en venta
   - **Detail scraper**: dada una URL de propiedad, extraer: título, precio, moneda, dirección, partido, ambientes, m² total, m² cubiertos, descripción, fotos (URLs), tipo, fecha de publicación si aparece, ID externo de Zonaprop
4. Implementar persistencia:
   - Si la propiedad NO existe en DB (por URL o external_id), crear nuevo registro en `properties`
   - Si la propiedad EXISTE: detectar cambios y actualizar; registrar el cambio en `property_history`
   - Si la propiedad ya no aparece en la lista pero existe en DB: marcar `is_active = false`
5. Manejo de errores robusto:
   - Si una propiedad falla, loguear y continuar con la siguiente
   - Reintentos con backoff exponencial para errores de red
   - Sentry para errores no esperados
6. Crear un script CLI temporal en `scripts/scrape-zonaprop.ts` para correrlo manualmente y testear

Al terminar:
- Correr el scraper para Lomas de Zamora (solo 50 propiedades para testing)
- Mostrarme un sample de 5 propiedades cargadas en la DB
- Verificar que la detección de cambios funciona (correlo dos veces y revisar)

---FIN PROMPT---

---

### B2.2 — Sistema de deduplicación

**Cuándo:** después de B2.1.

**Tiempo estimado:** 2-3 horas.

---PROMPT---

Vamos a implementar deduplicación de propiedades. Una misma propiedad puede estar publicada en Zonaprop, Argenprop y MercadoLibre con distintos IDs externos, y queremos contarla una sola vez.

Estrategia:

1. Crear tabla `property_groups` que agrupe múltiples listings que se refieren a la misma propiedad física
2. Algoritmo de matching:
   - Match exacto por partida ARBA si la tenemos en ambos
   - Match fuzzy por dirección (calle + número + partido), tolerando variaciones
   - Match por coordenadas geo (radio < 20 metros)
   - Cualquiera de las tres condiciones positiva = misma propiedad
3. Cuando se hace match:
   - Crear o asignar `property_group_id` en ambos `properties`
   - El listing más reciente o más completo se considera "primary"
4. Implementar como función SQL o stored procedure para que sea rápida con muchos registros
5. Función `mergePropertiesIfMatch(newPropertyId, candidatePropertyIds)` que se llama después de cada scrape

Al terminar:
- Crear un test que inserte 3 propiedades artificialmente "duplicadas" y verifique que se agrupan
- Correr el matcher sobre la base existente y mostrar cuántos grupos detectó

---FIN PROMPT---

---

### B2.3 — Integración con ARBA SIC

**Cuándo:** después de B2.2.

**Tiempo estimado:** 4-6 horas (esto es exploratorio, puede requerir ajustes).

---PROMPT---

Vamos a integrar datos de ARBA SIC (Sistema de Información Catastral) para enriquecer las propiedades.

**Contexto importante:** ARBA tiene un visualizador público llamado CARTO (`carto.arba.gov.ar`) que permite consultar datos catastrales. La consulta es uno-a-uno por dirección, partida o nomenclatura. NO hay API oficial documentada, así que vamos a hacer scraping respetuoso.

Acciones:

1. Crear estructura en `lib/services/arba/`:
   - `index.ts` — interfaz pública (`getCadastralData(address)`)
   - `client.ts` — config Playwright para CARTO
   - `parser.ts` — extracción de datos
   - `types.ts` — tipos
2. Implementar dos modos de consulta:
   - Por dirección (calle + número + partido)
   - Por partida si ya la tenemos
3. Datos a extraer:
   - Partido, Circunscripción, Sección, Manzana, Parcela (nomenclatura catastral)
   - Partida inmobiliaria
   - Superficie total del terreno (la oficial)
   - Coordenadas exactas (lat, lng)
   - Medidas perimetrales del lote
   - URLs de descarga de plancheta catastral y DXF
4. Crear función `enrichPropertyWithARBA(propertyId)` que:
   - Toma una propiedad existente
   - Hace la consulta a ARBA
   - Actualiza la propiedad con los datos catastrales
   - Si la superficie de ARBA difiere de la declarada > 10%, marca un flag `has_surface_discrepancy = true`
5. Rate limiting estricto: 1 request cada 5-10 segundos a CARTO
6. Cache local: si ya consultamos una partida en los últimos 30 días, usar el cache

Al terminar:
- Tomar 10 propiedades de la DB, enriquecerlas con ARBA, y mostrar el resultado
- Identificar cuáles tienen discrepancias de superficie

---FIN PROMPT---

---

### B2.4 — Geocodificación con OpenStreetMap

**Cuándo:** después de B2.3.

**Tiempo estimado:** 1-2 horas.

---PROMPT---

Necesitamos un fallback de geocodificación cuando ARBA no nos da las coordenadas (puede pasar con direcciones nuevas o con datos incompletos).

Acciones:

1. Crear `lib/services/geocoding/index.ts`
2. Usar Nominatim (OpenStreetMap) como geocoder primario:
   - API gratuita pero con rate limit estricto: 1 request/segundo
   - Setear user agent identificable
3. Función `geocodeAddress(address: string): Promise<{ lat, lng } | null>`
4. Cache de resultados en una nueva tabla `geocoding_cache` (address → lat/lng + fecha)
5. Cache TTL: 90 días
6. Función `ensurePropertyCoordinates(propertyId)`:
   - Si ya tiene coordenadas válidas, no hace nada
   - Si no, intenta primero ARBA; si falla, intenta Nominatim

Al terminar:
- Correr sobre propiedades sin coordenadas y verificar tasa de éxito

---FIN PROMPT---

---

### B2.5 — Cron jobs de scraping

**Cuándo:** después de B2.4.

**Tiempo estimado:** 2-3 horas.

---PROMPT---

Vamos a automatizar la ejecución del scraping con cron jobs de Vercel.

Acciones:

1. Crear API routes en `app/api/cron/` para los jobs:
   - `app/api/cron/scrape-zonaprop/route.ts` — corre el scraper de Zonaprop
   - `app/api/cron/enrich-arba/route.ts` — enriquece propiedades pendientes con ARBA
   - `app/api/cron/dedupe/route.ts` — corre el matcher de deduplicación
2. Cada uno debe:
   - Verificar header de autenticación de Vercel Cron (`CRON_SECRET`)
   - Loguear inicio y fin (cuántas propiedades procesadas, errores, duración)
   - Manejar timeouts (Vercel limita ejecución; si se acerca al límite, terminar prolijamente)
3. Configurar en `vercel.json`:
   - Scrape Zonaprop: cada día a las 4 AM ART
   - Enrich ARBA: cada hora (procesa lote de 50 propiedades pendientes)
   - Dedupe: cada día a las 5 AM ART
4. Generar el secret aleatorio para `CRON_SECRET` y decirme cómo configurarlo en Vercel
5. Implementar en el admin una página `/admin/jobs` que muestre:
   - Última ejecución de cada job
   - Estado (éxito/error)
   - Métricas (cuántas propiedades procesó, etc.)

Al terminar:
- Probar disparar cada job manualmente desde el admin
- Confirmar que los logs se guardan correctamente

---FIN PROMPT---

---

### B2.6 — Histórico de cambios

**Cuándo:** después de B2.5.

**Tiempo estimado:** 1-2 horas.

---PROMPT---

Ya tenemos la tabla `property_history` y el scraper la actualiza. Ahora vamos a hacer que sea consultable.

Acciones:

1. Función `getPropertyHistory(propertyId)` que devuelva el historial ordenado cronológicamente
2. Función `getDaysOnMarket(propertyId)`: días desde `first_seen_at` hasta ahora (si activa) o hasta `last_seen_at` (si inactiva)
3. Función `getPriceChanges(propertyId)`: array de cambios de precio con fechas
4. Función `getRecentPriceDrops(daysBack: number)`: propiedades que bajaron de precio recientemente (usado para alertas)
5. Vista admin: en el detalle de propiedad, mostrar timeline visual del histórico

Al terminar:
- Tener data lista para usar en los siguientes bloques (score, alertas)

---FIN PROMPT---

---

## 🧱 Bloque 3 — Score de calidad

### B3.1 — Algoritmo de score con 5 variables

**Cuándo:** después de B2.6 con al menos 500 propiedades scrapeadas y enriquecidas con ARBA.

**Tiempo estimado:** 3-4 horas.

---PROMPT---

Vamos a implementar el algoritmo de score de calidad de propiedades.

**Importante:** este algoritmo va a ir mejorando con el tiempo. Esta es la v1 — debe ser claro, transparente, fácil de iterar.

Crear módulo `lib/scoring/quality.ts` con la siguiente lógica:

**5 variables que componen el score (cada una 0-100):**

1. **Score de precio (peso 30%)**
   - Comparar precio/m² de la propiedad con el promedio de las últimas 90 días en su partido + similar tipo + similar cantidad de ambientes
   - 100 = en el promedio o más barato
   - 0 = más de 30% por encima del promedio
   - Si no hay suficientes comparables (< 5), score = null y no se incluye

2. **Score de tiempo en mercado (peso 20%)**
   - Calculado sobre días en venta
   - 100 = menos de 30 días
   - 0 = más de 365 días
   - Curva lineal entre esos extremos

3. **Score de coherencia ARBA (peso 25%)**
   - 100 = sin discrepancias entre datos declarados y ARBA
   - 70 = discrepancia menor (< 10% en superficie)
   - 30 = discrepancia significativa (10-25%)
   - 0 = discrepancia grave (> 25%) o no tiene datos ARBA

4. **Score de completitud de información (peso 15%)**
   - Bonifica propiedades con: descripción larga, muchas fotos, todos los datos básicos completos
   - Penaliza propiedades con: pocas fotos (< 5), descripción genérica, datos faltantes

5. **Score de actividad (peso 10%)**
   - Tiene que haber pocos cambios negativos (subidas de precio, desactivaciones cortas seguidas de reactivaciones, etc.)
   - Una propiedad estable o con pocos cambios = mejor score

**Score final** = suma ponderada de las 5 variables.

Implementación:

1. Cada variable es una función pura: `(property, comparables) => number | null`
2. Función orquestadora `calculateQualityScore(propertyId): Promise<ScoreResult>` que devuelve:
   ```ts
   {
     total: number;
     breakdown: {
       price: { score: number | null; weight: number; explanation: string };
       timeOnMarket: {...};
       arbaCoherence: {...};
       informationCompleteness: {...};
       activity: {...};
     };
     calculatedAt: Date;
   }
   ```
3. Guardar el score y el breakdown en la tabla `properties` (campos `quality_score` y `quality_score_breakdown` JSONB)
4. Crear tabla `score_history` para guardar la evolución del score por propiedad

Al terminar:
- Calcular score para 100 propiedades de muestra
- Mostrar distribución de scores (histograma)
- Verificar que los pesos suman 100%

---FIN PROMPT---

---

### B3.2 — Sub-scores y trigger de recálculo

**Cuándo:** después de B3.1.

**Tiempo estimado:** 1-2 horas.

---PROMPT---

Necesitamos que los scores se recalculen automáticamente cuando cambian los datos relevantes.

Acciones:

1. Trigger automático: cuando cambia precio, superficie ARBA, o se desactiva una propiedad → recalcular score
2. Recálculo masivo programado: cron diario que recalcula scores de propiedades cuyos comparables cambiaron mucho
3. Función `recalculatePropertyScore(propertyId, reason: string)` que:
   - Recalcula
   - Guarda en `score_history` con razón
4. Si hay cambio significativo de score (> 5 puntos), marcar para futura notificación a usuarios que tienen la propiedad guardada

Al terminar:
- Verificar que un cambio de precio dispara el recálculo automáticamente

---FIN PROMPT---

---

### B3.3 — Herramienta admin para debug de scores

**Cuándo:** después de B3.2.

**Tiempo estimado:** 1-2 horas.

---PROMPT---

Necesito una herramienta en el admin para inspeccionar y debuggear scores.

Acciones en `/admin/scoring/`:

1. **Vista por propiedad**:
   - Buscar propiedad por dirección o ID
   - Mostrar el breakdown completo del score
   - Mostrar los comparables usados para el cálculo de precio
   - Mostrar el histórico de scores de esa propiedad
2. **Vista de tunning**:
   - Probar el algoritmo con distintos pesos
   - Ver cómo cambia la distribución de scores
   - NO guarda los cambios — solo simulación
3. **Vista de distribución**:
   - Histograma de scores actuales
   - Promedio por zona
   - Detectar outliers (scores muy altos o muy bajos sospechosos)

---FIN PROMPT---

---

## 🧱 Bloque 4 — Vista de propiedad

### B4.1 — Página de propiedad mobile-first

**Cuándo:** después de Bloque 3 completo.

**Tiempo estimado:** 4-5 horas.

---PROMPT---

Vamos a construir LA pantalla más importante del producto: la vista de propiedad.

**Principio rector:** mobile-first radical. Diseñar primero para 375px. Cada decisión visual se prueba primero en celular.

Ruta: `app/(public)/propiedad/[id]/page.tsx`

Estructura por capas (de arriba hacia abajo, scrolleando):

**Capa 1 — Hero (visible sin scroll)**
- Foto principal a pantalla completa (con overlay sutil abajo)
- Sobre la foto: precio grande + score de calidad con color
- 3 datos clave: ambientes, m², zona
- Botón de "Guardar" flotante

**Capa 2 — Galería**
- Grid de fotos thumbnails
- Tap abre la galería fullscreen (lo hacemos en B4.2)

**Capa 3 — Match Score** (si el usuario tiene perfil)
- Score grande de match con explicación
- "X% para vos" + qué cumple y qué no

**Capa 4 — Datos verificados**
- Lista de datos con íconos ✅⚠️🚨
- Cada dato declarado vs verificado
- Tooltip al tocar cada ícono

**Capa 5 — Score detallado**
- Breakdown del quality score
- Barras visuales por cada componente
- Explicación en lenguaje común

**Capa 6 — Mapa + plano catastral**
- Mapa con ubicación exacta
- Botón para ver plancheta catastral

**Capa 7 — Descripción y características**
- Descripción del aviso
- Características declaradas

**Capa 8 — CTAs de acción**
- Pedir informe de dominio
- Pedir informe catastral
- Contactar publicante
- Compartir propiedad

Reglas:
- Server Component principal, Client Components solo donde necesario (galería, mapa, tooltips)
- Cargar datos verificados de ARBA solo si están disponibles
- Si falta data, mostrar placeholder elegante, no error
- Performance: lazy load todo lo que esté debajo del fold

Al terminar:
- Tomar 3 propiedades distintas (una con todos los datos, una con datos parciales, una con discrepancias) y mostrar cómo se ve cada una
- Verificar performance con Lighthouse en mobile

---FIN PROMPT---

---

### B4.2 — Galería fullscreen con swipe

**Cuándo:** después de B4.1.

**Tiempo estimado:** 2 horas.

---PROMPT---

Implementar la galería fullscreen de fotos.

Comportamiento:
- Tap en cualquier foto abre overlay fullscreen
- Swipe horizontal para navegar entre fotos
- Botón X arriba a la derecha para cerrar
- Indicador de "foto N de M" abajo
- Pinch to zoom en mobile
- Tecla ESC y flechas en desktop
- Performance: precargar siguiente y anterior, no todas

Usar una librería madura para esto (yet-another-react-lightbox, swiper, etc.). Sugerirme la mejor opción según mantenimiento y peso.

Al terminar:
- Verificar que funciona en mobile real (no solo emulado)

---FIN PROMPT---

---

### B4.3 — Visualización del score

**Cuándo:** después de B4.2.

**Tiempo estimado:** 2-3 horas.

---PROMPT---

Implementar la visualización del score de calidad de forma intuitiva y atractiva.

Componente: `components/scoring/QualityScoreCard.tsx`

Diseño:

1. **Display principal del score**:
   - Número grande (ej. "87")
   - Color según rango: verde (>75), amarillo (50-75), rojo (<50)
   - Texto descriptivo corto: "Propiedad sólida" / "Promedio" / "Con dudas"

2. **Breakdown expandible**:
   - Tap/clic expande las 5 sub-categorías
   - Cada sub-categoría con:
     - Nombre claro (no técnico)
     - Barra de progreso con color
     - Explicación en lenguaje común
     - Tooltip "Cómo se calcula esto"

3. **Lenguaje del usuario** (no técnico):
   - "Score de precio" → "Precio vs el mercado"
   - "Score de tiempo en mercado" → "Cuánto hace que está en venta"
   - "Score de coherencia ARBA" → "Datos verificados"
   - "Score de completitud" → "Información disponible"
   - "Score de actividad" → "Estabilidad de la publicación"

Reglas técnicas:
- Animaciones sutiles al expandir (no abusar)
- Accesible (aria-labels, contrast ratio)
- Funciona perfecto en mobile

---FIN PROMPT---

---

### B4.4 — Datos verificados con íconos

**Cuándo:** después de B4.3.

**Tiempo estimado:** 2 horas.

---PROMPT---

Implementar la visualización de "datos verificados" en la propiedad.

Componente: `components/property/VerifiedDataList.tsx`

Comportamiento:

Para cada dato relevante, mostrar:
- Etiqueta (ej. "Superficie total")
- Valor declarado
- Valor verificado (si existe)
- Icono de estado:
  - ✅ verde = coincide o no requiere verificación
  - ⚠️ amarillo = discrepancia menor o no verificable
  - 🚨 rojo = discrepancia significativa

Datos a mostrar:
- Superficie total (declarada vs ARBA)
- Superficie cubierta
- Dirección (declarada vs georreferenciada)
- Partido (declarado vs ARBA)
- Tipo de propiedad
- Coordenadas (si las tenemos exactas)

Reglas:
- Cada item es tappable para ver más detalle
- Tooltip al tocar el ícono explica el estado
- Si no hay verificación, mostrar "No verificado" con explicación de por qué (datos no disponibles, fuera de PBA, etc.)

---FIN PROMPT---

---

### B4.5 — Plano catastral y mapa

**Cuándo:** después de B4.4.

**Tiempo estimado:** 3 horas.

---PROMPT---

Implementar la visualización del mapa y plano catastral.

Componentes:
- `components/property/PropertyMap.tsx` — mapa interactivo
- `components/property/CadastralPlan.tsx` — visualización de la plancheta

**Mapa:**
- Usar Leaflet con tiles de OpenStreetMap (gratis) o Mapbox (si la calidad lo amerita)
- Marcador en las coordenadas exactas
- Zoom configurable
- Dragable y zoomable
- Botón para abrir en Google Maps
- Mostrar puntos de interés cercanos opcionalmente (escuelas, transporte) — si la API lo permite gratis

**Plano catastral:**
- Si tenemos el DXF descargado, mostrar preview
- Botón para descargar la plancheta oficial
- Si no tenemos plano, mostrar mensaje "Datos catastrales no disponibles para esta propiedad"

Performance:
- Lazy load del mapa (no cargar hasta que se scrollee a esa altura)
- Imágenes del plano optimizadas

---FIN PROMPT---

---

## 🧱 Bloque 5 — Perfil y match score

### B5.1 — Onboarding del perfil de búsqueda

**Cuándo:** después de Bloque 4 completo.

**Tiempo estimado:** 3-4 horas.

---PROMPT---

Vamos a construir el flujo de onboarding para que el usuario cree su primer perfil de búsqueda.

**Importante:** este es un momento crítico de conversión. La UX tiene que ser excelente. Pocos pasos, claros, con valor visible en cada paso.

Ruta: `app/(app)/onboarding/page.tsx`

Flujo de 4 pasos (cada uno en una pantalla):

**Paso 1 — Bienvenida**
- Mensaje corto: "Hola! Te ayudo a encontrar la propiedad que estás buscando."
- "En 2 minutos vamos a entender qué necesitás."
- Botón "Empezar"

**Paso 2 — Zona y tipo**
- "¿En qué zonas estás buscando?" (multiselect con chips: Lomas, Banfield, Lanús, Avellaneda, Quilmes, etc.)
- "¿Qué tipo de propiedad?" (casa, depto, PH, lote — selección múltiple)

**Paso 3 — Espacio y precio**
- "¿Cuántos ambientes mínimo necesitás?"
- "¿Qué rango de precio?" (slider USD)
- "¿Cuántos m² mínimo?"

**Paso 4 — Lo no negociable**
- "¿Qué necesitás SÍ o SÍ?" (chips: cochera, patio/jardín, parrilla, etc.)
- Botón "Listo"

Después del último paso → mostrar resultados que matchean.

Reglas:
- Mobile-first total
- Progress bar visible
- Botón "atrás" en cada paso
- Animaciones suaves entre pasos
- Validación amigable (no errores agresivos)
- Datos guardan a medida que avanza (no se pierde si cierra y vuelve)

Al terminar el onboarding, mostrar:
- "X propiedades coinciden con vos"
- CTA "Ver propiedades"
- Opción de ajustar el perfil

---FIN PROMPT---

---

### B5.2 — CRUD de perfiles

**Cuándo:** después de B5.1.

**Tiempo estimado:** 2 horas.

---PROMPT---

Implementar gestión completa de perfiles de búsqueda.

Ruta: `app/(app)/perfiles/`

Funcionalidad:
- Lista de perfiles del usuario
- Crear nuevo perfil (reusar el flujo de onboarding pero como modal o página)
- Editar perfil existente
- Eliminar perfil
- Marcar perfil como "principal" (el activo)
- Renombrar perfil

Cada usuario puede tener hasta 5 perfiles (límite simple para evitar abuso).

---FIN PROMPT---

---

### B5.3 — Algoritmo de match score

**Cuándo:** después de B5.2.

**Tiempo estimado:** 3-4 horas.

---PROMPT---

Implementar el algoritmo de match score que mide qué tan bien una propiedad calza con un perfil de búsqueda.

Crear `lib/scoring/match.ts`.

Función principal:
```ts
calculateMatchScore(propertyId: string, profileId: string): Promise<MatchResult>
```

Donde `MatchResult` es:
```ts
{
  total: number;  // 0-100
  fits: string[];  // qué cumple
  misses: string[];  // qué no cumple
  hardFails: string[];  // no-negociables incumplidos (si hay alguno, total = 0)
  breakdown: {...};
}
```

Lógica:

1. **Hard fails** (no-negociables): si la propiedad no cumple alguno → match = 0
   - Zona no está en la lista del perfil
   - Precio fuera del rango
   - Tipo de propiedad no incluido
   - Faltan no-negociables específicos (cochera, etc.)

2. **Soft criteria** (suma puntos):
   - Cumple ambientes mínimos: +20
   - Cumple m² mínimos: +20
   - Precio en la franja media-baja del rango: +15 (vs solo cumplir el máximo)
   - Zona "preferida" vs "aceptable" (cuando lo implementemos): +10
   - Coincidencias con objetivos personales (Fase 2): +X

3. **Quality bonus**:
   - Si quality_score > 80: +10
   - Si quality_score > 90: +5 adicional

4. Total se calibra para llegar a 100 cuando todo encaja bien.

Persistencia:
- NO guardar el match en DB para todas las combinaciones (sería explosivo)
- Calcular on-demand cuando el usuario ve una propiedad
- Cachear con SWR / React Query del lado del cliente

Al terminar:
- Tomar 5 propiedades y 3 perfiles distintos, mostrar matrix de scores

---FIN PROMPT---

---

### B5.4 — Visualización y explicación del match

**Cuándo:** después de B5.3.

**Tiempo estimado:** 2 horas.

---PROMPT---

Implementar la visualización del match score en la página de propiedad y en las listas.

Componentes:
- `components/scoring/MatchScoreCard.tsx` (versión completa para detalle)
- `components/scoring/MatchScoreBadge.tsx` (versión compacta para listas)

**Match Score Card (en página de propiedad):**

- Score grande con texto: "X% para vos"
- Color según rango (verde >70, amarillo 40-70, rojo <40)
- Lista de "Lo que cumple": ✅ con texto humano
- Lista de "Lo que no cumple": ⚠️ con texto humano
- Si hay hard fails: 🚨 destacado con explicación

**Match Score Badge (en listas):**

- Diseño compacto: ícono + número
- Color según rango
- Tap muestra mini explicación

Si el usuario NO tiene perfil:
- Mostrar CTA: "Creá tu perfil de búsqueda para ver qué tan bien te calza esta propiedad"

---FIN PROMPT---

---

## 🧱 Bloque 6 — Listas y alertas

### B6.1 — Buscador con filtros

**Cuándo:** después de Bloque 5 completo.

**Tiempo estimado:** 4 horas.

---PROMPT---

Implementar el buscador principal con filtros.

Ruta: `app/(public)/buscar/page.tsx`

Funcionalidad:

**Filtros principales (URL params para shareable links):**
- Zonas (multiselect)
- Tipo de propiedad
- Rango de precio
- Ambientes
- m² mínimos
- Solo activas / incluir inactivas
- Solo con datos verificados

**Ordenamiento:**
- Más relevantes (match score si hay perfil, sino quality score)
- Más nuevas
- Más baratas / más caras
- Menos tiempo en venta

**Visualización:**
- Grid de cards mobile-first
- Cada card: foto, precio, score, datos básicos, badge de match
- Paginación o scroll infinito (recomendá lo mejor)
- Skeleton loaders mientras carga

**Estado vacío:**
- Si no hay resultados con esos filtros, mensaje claro + sugerencias de relajar filtros

Performance:
- Server Component con Suspense
- Resultados paginados (20 por página)
- Cache de queries comunes

---FIN PROMPT---

---

### B6.2 — Sistema de favoritas

**Cuándo:** después de B6.1.

**Tiempo estimado:** 2 horas.

---PROMPT---

Implementar el sistema de propiedades favoritas.

Funcionalidad:

1. Botón de favorito en página de propiedad y en cards
2. Tap → guarda/desguarda con animación
3. Si no logueado → modal "Iniciá sesión para guardar"
4. Página `/favoritas` con listado de propiedades guardadas
5. Notas privadas opcionales en cada favorita
6. Posibilidad de organizar favoritas en "colecciones" (después de Fase 2 — por ahora, solo lista plana)

Performance:
- Estado optimista (UI responde inmediato, sincroniza atrás)
- Server Action para persistir

---FIN PROMPT---

---

### B6.3 — Alertas por email

**Cuándo:** después de B6.2.

**Tiempo estimado:** 4-5 horas.

---PROMPT---

Implementar sistema de alertas por email.

**Tipos de alertas:**

1. **Nuevas propiedades que matchean** (semanal o diaria, configurable)
2. **Bajas de precio** en propiedades guardadas (inmediato)
3. **Cambios significativos de score** en propiedades guardadas (semanal)

**Implementación:**

1. Configurar Resend en `lib/services/resend/`
2. Templates de email con React Email:
   - `emails/new-matches.tsx`
   - `emails/price-drop.tsx`
   - `emails/score-change.tsx`
3. Cron jobs:
   - `/api/cron/alerts/new-matches` — diario, mañana
   - `/api/cron/alerts/price-drops` — cada hora (chequea cambios recientes)
   - `/api/cron/alerts/score-changes` — semanal
4. Settings de usuario:
   - Página `/configuracion/notificaciones`
   - Toggle para cada tipo de alerta
   - Frecuencia para "nuevas matches": diaria, semanal, ninguna
5. Unsubscribe link en cada email (legal y UX)

Reglas:
- Nunca enviar más de 1 email por día por usuario para cada tipo
- Agrupar (no mandar 1 email por cada propiedad nueva)
- Logging de envíos en DB

Al terminar:
- Triggerar manualmente cada tipo de alerta y verificar que llegan correctamente

---FIN PROMPT---

---

### B6.4 — Centro de notificaciones in-app

**Cuándo:** después de B6.3.

**Tiempo estimado:** 2 horas.

---PROMPT---

Implementar centro de notificaciones dentro de la app (campana).

Funcionalidad:

1. Icono de campana en el header con badge si hay no leídas
2. Click abre dropdown con lista de notificaciones recientes
3. Cada notificación: icono según tipo, mensaje corto, link a propiedad, hace cuánto
4. Marcar como leída al hacer click
5. Página `/notificaciones` con histórico completo

Mismas notificaciones que las de email pero también in-app.

---FIN PROMPT---

---

## 🧱 Bloque 7 — Servicios automatizados

### B7.1 — Catálogo de servicios

**Cuándo:** después de Bloque 6 completo.

**Tiempo estimado:** 2 horas.

---PROMPT---

Implementar el catálogo de servicios.

Servicios a incluir en MVP (Fase 1):
1. Informe catastral ARBA — $7.900
2. Informe de dominio simple — $29.900

Servicios para incluir en Fase 2 (dejar la estructura preparada):
3. Cédula catastral — $11.900
4. Certificado catastral — $9.900
5. Informe de dominio urgente — $74.900
6. Informe de inhibiciones — $29.900
7. Tasación de mercado — $14.900

Componentes:
- `components/services/ServiceCatalog.tsx` — listado de servicios disponibles
- `components/services/ServiceCard.tsx` — card individual con precio, descripción, tiempo

Mostrar en:
- Página de propiedad (capa 8 de CTAs)
- Página dedicada `/servicios`
- Después del onboarding como sugerencia

Cada servicio tiene:
- Nombre claro
- Precio destacado
- Tiempo estimado de entrega
- Qué incluye (puntos bullet)
- Botón "Contratar"

---FIN PROMPT---

---

### B7.2 — Integración Mercado Pago

**Cuándo:** después de B7.1.

**Tiempo estimado:** 4-5 horas.

**Pre-requisito:** cuenta de Mercado Pago configurada, credenciales en `.env.local`.

---PROMPT---

Integrar Mercado Pago para pagos.

Acciones:

1. Instalar SDK oficial de Mercado Pago
2. Crear `lib/services/mercadopago/`:
   - `client.ts` — cliente configurado
   - `checkout.ts` — generación de preference y checkout
   - `webhook.ts` — handler de notificaciones
3. Flujo de pago:
   - Usuario clic en "Contratar" → server action crea `service_order` con status `pending_payment`
   - Genera preference de MP con metadata (orderId)
   - Redirige a checkout de MP
   - Usuario paga
   - MP redirige a `/pago/success` o `/pago/failure`
4. Webhook handler en `/api/webhooks/mercadopago`:
   - Verificar firma del webhook (importante de seguridad)
   - Actualizar `service_order.status` según estado
   - Si pago aprobado → status = `paid`, disparar siguiente paso (envío del servicio)
5. Páginas de retorno:
   - `/pago/success` — muestra confirmación
   - `/pago/failure` — muestra error con opción de reintentar
   - `/pago/pending` — si el pago está pendiente
6. Logging detallado de toda la transacción (para soporte)

Seguridad:
- Nunca confiar en parámetros del client — verificar siempre con MP via webhook
- Nunca exponer access_token client-side
- Validar firma del webhook

Testing:
- MP tiene cuentas de testing (sandbox)
- Probar todos los flujos: éxito, falla, pendiente, webhook recibido fuera de orden

---FIN PROMPT---

---

### B7.3 — Flujo de informe catastral

**Cuándo:** después de B7.2.

**Tiempo estimado:** 3-4 horas.

---PROMPT---

Implementar el flujo completo del servicio "Informe catastral".

Flujo:

1. Usuario contrata desde una propiedad
2. Sistema crea `service_order` y procesa el pago (B7.2)
3. Una vez pagado, el sistema:
   - Genera la solicitud automáticamente con los datos catastrales que ya tenemos de ARBA
   - Si tenemos toda la data, genera un PDF profesional con la info catastral
   - Si falta data, marca para gestión manual y notifica al admin

PDF a generar:
- Header con logo del proyecto
- Datos del usuario que contrató
- Datos catastrales completos (nomenclatura, partida, superficies, medidas)
- Plancheta catastral embedded
- Coordenadas
- Fecha de emisión
- Disclaimer legal

Tecnología sugerida: `@react-pdf/renderer` o `puppeteer` para generar PDFs server-side.

Después de generar:
- Subir PDF a Supabase Storage
- Actualizar `service_order.result_file_url`
- Enviar email al usuario con el PDF adjunto + link
- Actualizar status a `delivered`

Página del usuario:
- `/mis-servicios` — listado de servicios contratados
- Detalle de cada uno con status y descarga del resultado

Importante: el "informe catastral oficial" emitido por ARBA requiere matrícula. Lo que estamos generando es un "informe consolidado" basado en datos públicos, claramente identificado como tal. Cuando Tomy esté matriculado, podemos ofrecer también la versión oficial firmada digitalmente.

---FIN PROMPT---

---

### B7.4 — Flujo de informe de dominio

**Cuándo:** después de B7.3 y después de tener matrícula de martillero activa.

**Tiempo estimado:** 3-4 horas.

---PROMPT---

Implementar el flujo del servicio "Informe de dominio".

**Pre-requisito:** Tomy debe estar matriculado en el Colegio de Martilleros para poder solicitar oficialmente este informe.

Flujo:

1. Usuario contrata desde una propiedad
2. Pago procesado
3. Sistema NO automatiza el pedido completamente (requiere intervención de Tomy):
   - Crea ticket en `/admin/orders` para Tomy
   - Tomy entra al sistema del Registro de la Propiedad con su matrícula
   - Solicita el informe
   - Sube el PDF resultante al sistema
4. Sistema notifica al usuario y entrega el PDF

UI Admin:
- Cola de pedidos pendientes en `/admin/orders`
- Cada pedido muestra: usuario, propiedad, fecha de pago, datos catastrales necesarios
- Botón "Marcar como completado" + upload del PDF

Fase futura (cuando haya volumen):
- Automatización completa via API del Registro (si existe) o RPA

---FIN PROMPT---

---

### B7.5 — Generación de PDFs y entrega

**Cuándo:** después de B7.4.

**Tiempo estimado:** 2-3 horas.

---PROMPT---

Mejorar el sistema de generación y entrega de PDFs.

Acciones:

1. **Templates de PDF profesionales**:
   - Crear sistema de templates con `@react-pdf/renderer`
   - Diseño consistente con la marca del proyecto
   - Multi-página si es necesario
   - Embed de imágenes y planchetas

2. **Storage seguro**:
   - PDFs en bucket privado de Supabase Storage
   - URLs firmadas con expiración (24-48 horas)
   - Usuario descarga via URL firmada, no acceso directo

3. **Email de entrega**:
   - Template: `emails/service-delivered.tsx`
   - PDF adjunto + link directo
   - Instrucciones de qué hacer con el documento

4. **Página de descarga**:
   - `/mis-servicios/[orderId]` — vista detallada con preview del PDF
   - Botón de descarga
   - Posibilidad de re-enviar por email

5. **Facturación básica**:
   - Generar comprobante de pago automático
   - Numeración secuencial
   - Datos fiscales del usuario (si los tenemos)
   - Disclaimer: "Este no es una factura electrónica AFIP — para facturación oficial, contactar al admin"

Fase futura: integración con facturación electrónica AFIP.

---FIN PROMPT---

---

## 🛠️ Utilidades transversales

Estas son plantillas para situaciones que aparecen frecuentemente, no para un bloque específico.

### U.1 — Refactor de un módulo existente

---PROMPT---

Necesito refactorizar `[archivo o carpeta]` porque [razón concreta — ej. "está creciendo y mezclando responsabilidades", "tiene muchas funciones duplicadas", "no sigue las convenciones del proyecto"].

Antes de tocar código:

1. Leé el archivo/carpeta y mostrame un análisis:
   - Qué hace actualmente
   - Qué problemas tiene
   - Qué cambiaría y por qué
2. Proponé un plan de refactor paso a paso (en qué orden, qué archivos toca)
3. Identificá riesgos (qué podría romperse)

Después de mi aprobación:
- Implementá el refactor
- No agregues funcionalidad nueva — solo refactor
- Si encontrás bugs en el camino, marcalos pero no los corrijas (los hago aparte)
- Asegurate de que el build sigue pasando
- Asegurate de que los tests existentes siguen pasando

---FIN PROMPT---

---

### U.2 — Resolver un bug

---PROMPT---

Tengo un bug en `[descripción del bug]`.

**Cómo se reproduce:**
[Pasos exactos para reproducir]

**Lo que esperaba:**
[Comportamiento esperado]

**Lo que pasa:**
[Comportamiento actual]

**Logs/errores relevantes:**
[Pegá logs si tenés]

Pasos:

1. Antes de hacer cambios, identificá la causa raíz
2. Decime cuál es el problema concreto y dónde
3. Proponé la solución más simple posible
4. Si hay alternativas, mostrámelas
5. Después de mi aprobación, implementá
6. Agregá un test que prevenga regresión

---FIN PROMPT---

---

### U.3 — Agregar tests a un módulo

---PROMPT---

Quiero agregar tests al módulo `[ruta del archivo]`.

Prioridades de testing:
- Funciones puras de lógica (alta prioridad)
- Edge cases (alta)
- Happy path (media)
- Integration tests para flujos críticos (media)

Pedidos:

1. Identificá qué tests son más valiosos para este módulo
2. Proponé la estructura de tests antes de escribirlos
3. Usá Vitest para unit tests
4. Coverage objetivo: tests donde aporten valor, no por porcentaje
5. Tests deben ser independientes entre sí
6. Mocks para dependencias externas (DB, APIs)

Al terminar:
- Corré los tests y mostrame el resultado
- Reportame el coverage del módulo

---FIN PROMPT---

---

### U.4 — Optimizar performance de una página

---PROMPT---

La página `[ruta]` está lenta. Quiero optimizarla.

Antes de hacer cambios:

1. Hacé un análisis con:
   - Lighthouse en mobile y desktop
   - Análisis del bundle (qué pesa de más)
   - Identificación de queries lentas si hay DB
   - Análisis de re-renders innecesarios si hay React state
2. Mostrame el top 5 de cosas a mejorar, ordenadas por impacto

Después de mi aprobación:
- Implementar cambios uno por uno (no batch)
- Medir después de cada cambio
- Si algo no mejora, revertir y probar otra cosa
- Asegurar que la funcionalidad no se rompe

Objetivos:
- Mobile FCP < 1.5s
- Mobile LCP < 2.5s
- Bundle reducido al máximo

---FIN PROMPT---

---

### U.5 — Code review de cambios recientes

---PROMPT---

Hacé un code review de los cambios recientes en `[branch o últimos N commits]`.

Buscá:
- Bugs potenciales
- Problemas de seguridad
- Performance issues
- Violaciones a las reglas del `CLAUDE.md`
- Código que se podría simplificar
- Tests que faltan
- Documentación que falta

Devolvémelo en formato:
- 🔴 Críticos (hay que arreglar antes de mergear)
- 🟡 Importantes (deberían arreglarse pero no bloquean)
- 🟢 Sugerencias (mejoras opcionales)

No hagas cambios — solo análisis.

---FIN PROMPT---

---

## 📌 Notas finales

### Cómo iterar con Claude Code

1. **Un prompt = un bloque/paso** — no metas múltiples cosas en un mismo prompt
2. **Revisá lo que hace** — Claude Code es bueno pero no infalible, leé el código que produce
3. **Ejecutá tests/build después de cada prompt** — para detectar problemas temprano
4. **Hacé commits frecuentes** — uno por prompt completado y verificado
5. **Si algo falla, no insistas** — pedile que muestre su análisis del error antes de proponer otro fix

### Cuando NO usar un prompt de este playbook

Estos prompts son guías, no scripts rígidos. Adaptalos cuando:
- El estado del proyecto sea distinto al asumido
- Querés probar algo experimental
- Necesitás algo que no está cubierto

En esos casos, escribí el prompt vos, pero seguí los principios de "Cómo escribir mejores prompts" del inicio.

### Cuándo volver al Plan Maestro

Cuando dudes:
- "¿Esto va para acá realmente?"
- "¿Mi decisión rompe algún principio?"
- "¿Esto es MVP o Fase 2?"

Abrí `PLAN_MAESTRO.md` y respondé en las secciones 8 (MVP), 12 (trampas) o 13 (principios rectores).

---

*Playbook de Prompts — Plataforma Inmobiliaria Zona Sur GBA*
*Tomy — 2026*
