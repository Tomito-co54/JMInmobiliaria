# Jotaeme — Inmobiliaria

Sitio de una inmobiliaria personal en Zona Sur GBA, Argentina.

Dos caras sobre la misma base de datos:

- **Pública** — catálogo curado de las propiedades del martillero, cargadas
  a mano y verificadas contra el catastro de ARBA. Los leads entran por
  WhatsApp.
- **`/admin`** — donde se opera: cargador de propiedades y un centro de
  datos privado que analiza el inventario scrapeado de Zonaprop y Trezza.
  Ese inventario **nunca** aparece en la cara pública.

Es un fork de [`Tomito-co54/Jotaeme`](https://github.com/Tomito-co54/Jotaeme),
que era un portal agregador para compradores. El pivote cambió a quién
sirve el sitio; el scraping se conservó, pero como inteligencia de mercado
en vez de como catálogo.

## Stack

- **Frontend:** Next.js 15 (App Router) + React 19 + TypeScript
- **Styling:** Tailwind CSS 4 + shadcn/ui
- **Backend:** Supabase (PostgreSQL + Auth + Storage)
- **Mapas:** Leaflet + OpenStreetMap · **Catastro:** ARBA WFS
- **Scraping:** Playwright · **Hosting:** Vercel

## Desarrollo local

```bash
npm install
cp .env.example .env.local   # completar credenciales
npm run dev
```

Abrir [http://localhost:3000](http://localhost:3000).

```bash
npm test          # 300 tests (Vitest, lógica pura)
npm run build
```

## El pipeline de datos

```bash
npm run pipeline
```

Encadena scraping, deduplicación, geocoding, ARBA y quality score. Entre
2 y 8 minutos según cuántos avisos nuevos haya.

**Corre en la máquina del owner, a mano.** No es una comodidad: Zonaprop
bloquea las IPs de datacenter, así que las corridas desde GitHub Actions
vuelven vacías. El workflow sigue en el repo, pero lo que trae data es el
comando local.

Cada corrida acumula historial de mercado que **no se puede reconstruir
después** — los avisos de la semana pasada ya no están en el portal.

## Documentación

- `CLAUDE.md` — estado del proyecto, arquitectura y reglas. Es la fuente
  de verdad; se lee al empezar cualquier sesión.
- `DIRECCION_DE_ARTE.md` — base conceptual de diseño. Obligatorio antes de
  tocar cualquier cosa visual.
- `docs/` — plan maestro y playbooks heredados del upstream.
