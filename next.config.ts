import type { NextConfig } from "next";
import { withSentryConfig } from "@sentry/nextjs";

const nextConfig: NextConfig = {
  // Server Actions body limit. Default is 1MB, which crashes the
  // property-photo uploader the moment the broker drags in a normal
  // phone photo (often 2-6MB). The bucket itself caps at 10MB per file
  // (see supabase/migrations/00012_property_photos_bucket.sql); we set
  // 12MB here so the Storage layer is the one that rejects oversize
  // files with a clean error, instead of the framework swallowing the
  // request before our action runs.
  experimental: {
    serverActions: {
      bodySizeLimit: "12mb",
    },
  },
  // Force-include the woff fonts that @react-pdf/renderer needs at runtime.
  //
  // `lib/services/pdf/fonts.ts` resolves them with
  // `path.join(process.cwd(), "node_modules", ...)`, a path built from string
  // fragments. Next's build-time tracer cannot follow that, so without this
  // declaration Vercel ships a serverless function with no font files and the
  // render dies with ENOENT — **only in production**. Locally `node_modules`
  // is right there, so it always works on the machine where you test it.
  //
  // Which is exactly how this went unnoticed: until 2-sep-2026 the three keys
  // here were the three PAID-service routes, and `/p/[id]/ficha.pdf` — added
  // later, in la Fase 20 — never got one. The public listing PDF had been
  // returning 500 in production since the day it shipped, with a green build
  // and a working localhost. Se encontró al verificar producción después de
  // borrar los servicios pagos, que es lo que dejó las tres claves apuntando
  // a rutas inexistentes.
  //
  // Si se agrega otra ruta que genere un PDF, va acá también.
  outputFileTracingIncludes: {
    "/p/[id]/ficha.pdf": [
      "./node_modules/@fontsource/inter/files/inter-latin-400-normal.woff",
      "./node_modules/@fontsource/inter/files/inter-latin-700-normal.woff",
      "./node_modules/@fontsource/fraunces/files/fraunces-latin-400-normal.woff",
      "./node_modules/@fontsource/fraunces/files/fraunces-latin-700-normal.woff",
    ],
  },
  images: {
    // CDNs we scrape photos from. Adding a hostname here lets next/image
    // optimize and serve them through /_next/image; without it we'd be forced
    // to use plain <img> tags and lose lazy-loading + responsive sizing.
    remotePatterns: [
      // Tiles de mapa. Todas se piden desde el navegador (`unoptimized`):
      // OSM le contesta a un pedido de datacenter con su tile de "Access
      // blocked", así que el optimizador de Next no puede tocarlas. El
      // hostname sale de NEXT_PUBLIC_BASEMAP_URL — si se apunta a otro
      // proveedor, agregar el suyo acá.
      { protocol: "https", hostname: "tile.openstreetmap.org" },
      { protocol: "https", hostname: "basemaps.cartocdn.com" },
      { protocol: "https", hostname: "api.maptiler.com" },
      // Zonaprop + portales Navent (la empresa madre)
      { protocol: "https", hostname: "imgar.zonapropcdn.com" },
      { protocol: "https", hostname: "img10.naventcdn.com" },
      // Trezza Propiedades (usa staticbp como CDN, no su dominio propio)
      { protocol: "https", hostname: "staticbp.com" },
      { protocol: "https", hostname: "trezzapropiedades.com.ar" },
      { protocol: "https", hostname: "www.trezzapropiedades.com.ar" },
      // Supabase Storage — fotos propias subidas vía el cargador
      // (bucket `property-photos`, public read).
      {
        protocol: "https",
        hostname: "cjnaxxidigdylnwlpyab.supabase.co",
        pathname: "/storage/v1/object/public/property-photos/**",
      },
      // Placeholders del seed inicial — eliminar cuando se reemplacen
      { protocol: "https", hostname: "via.placeholder.com" },
    ],
  },
};

export default withSentryConfig(nextConfig, {
  // Only print logs for uploading source maps in CI
  silent: !process.env.CI,
  // Org/project read from SENTRY_ORG and SENTRY_PROJECT at build time (set on Vercel)
  org: process.env.SENTRY_ORG,
  project: process.env.SENTRY_PROJECT,
  // Auth token uploads source maps so stack traces deminify in Sentry.
  // Optional — without it, errors are still captured but stack traces show transpiled code.
  authToken: process.env.SENTRY_AUTH_TOKEN,
});
