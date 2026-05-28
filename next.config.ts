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
  // Force-include the woff fonts used by @react-pdf/renderer for the
  // service deliverable PDFs. The fonts.ts module resolves them with
  // path.join(process.cwd(), "node_modules", ...) which Next.js's
  // build-time tracer can't follow, so without this declaration Vercel
  // ships a serverless function without the font files and PDF
  // generation fails at runtime with ENOENT.
  outputFileTracingIncludes: {
    "/api/admin/orders/[id]/fulfill": [
      "./node_modules/@fontsource/inter/files/inter-latin-400-normal.woff",
      "./node_modules/@fontsource/inter/files/inter-latin-700-normal.woff",
      "./node_modules/@fontsource/fraunces/files/fraunces-latin-400-normal.woff",
      "./node_modules/@fontsource/fraunces/files/fraunces-latin-700-normal.woff",
    ],
    "/api/mercadopago/webhook": [
      "./node_modules/@fontsource/inter/files/inter-latin-400-normal.woff",
      "./node_modules/@fontsource/inter/files/inter-latin-700-normal.woff",
      "./node_modules/@fontsource/fraunces/files/fraunces-latin-400-normal.woff",
      "./node_modules/@fontsource/fraunces/files/fraunces-latin-700-normal.woff",
    ],
    "/api/dev/test-arba-pdf": [
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
