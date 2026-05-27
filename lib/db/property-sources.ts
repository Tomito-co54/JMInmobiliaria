/**
 * Sources whose properties are exposed in the public-facing surfaces
 * (landing catalog, /p/[id], /buscar, /favoritos, etc.).
 *
 * Properties scraped from third-party portals (zonaprop, trezza, etc.)
 * stay in the database but are NEVER shown publicly — they're only
 * visible inside /admin where they power the private market-intelligence
 * dashboard.
 *
 * Keep this list in sync with the `property_source` enum in
 * supabase/migrations/00001_initial_schema.sql.
 */
export const PUBLIC_PROPERTY_SOURCES = ["owner_direct", "agency"] as const;

export type PublicPropertySource = (typeof PUBLIC_PROPERTY_SOURCES)[number];
