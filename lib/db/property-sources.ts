/**
 * Two conditions gate public visibility — they mean different things and
 * BOTH are required. Neither alone is sufficient.
 *
 *   source IN ('owner_direct', 'agency')
 *     → "ES MÍA". Distinguishes the broker's own listings from scraped
 *       market-intel listings (zonaprop, trezza, etc.). Scraped properties
 *       are kept in the same table for the market-intelligence dashboard
 *       inside /admin, but never leak to public surfaces.
 *
 *   listing_status = 'publicada'
 *     → "LA DECIDÍ MOSTRAR". The broker's editorial gate. Owner properties
 *       in 'borrador' (still being loaded) or 'vendida' (closed) stay
 *       private. Only 'publicada' surfaces in the public catalog.
 *
 * `is_active` is intentionally NOT part of this filter. That column tracks
 * whether a scraped listing is still alive on its source portal — it's the
 * market-status concept for scraped data, orthogonal to the broker's own
 * editorial workflow. Mixing them would conflate two domains.
 *
 * Keep PUBLIC_PROPERTY_SOURCES in sync with the `property_source` enum in
 * supabase/migrations/00001_initial_schema.sql, and PUBLIC_LISTING_STATUS
 * with the CHECK constraint in 00011_listing_status_and_arba_type.sql.
 */
export const PUBLIC_PROPERTY_SOURCES = ["owner_direct", "agency"] as const;

export type PublicPropertySource = (typeof PUBLIC_PROPERTY_SOURCES)[number];

export const PUBLIC_LISTING_STATUS = "publicada" as const;
