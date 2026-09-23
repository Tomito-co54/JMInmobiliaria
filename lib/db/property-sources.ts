/**
 * Two conditions gate public visibility — they mean different things and
 * BOTH are required. Neither alone is sufficient.
 *
 *   source IN ('owner_direct', 'agency', 'colega')
 *     → "LA PUBLICAMOS NOSOTROS". Distinguishes what the site shows from
 *       scraped market-intel listings (zonaprop, trezza, etc.). Scraped
 *       properties are kept in the same table for the market-intelligence
 *       dashboard inside /admin, but never leak to public surfaces.
 *       'colega' (00024) is a fellow broker's catalog published as ours by
 *       agreement: public, but NOT the family's — see OWNER_PROPERTY_SOURCES.
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
export const PUBLIC_PROPERTY_SOURCES = ["owner_direct", "agency", "colega"] as const;

export type PublicPropertySource = (typeof PUBLIC_PROPERTY_SOURCES)[number];

/**
 * The family's own listings: what the maestra sync loads and updates, what
 * the editor edits, and the only ones that can be the home's protagonist or
 * its featured offer. A subset of the public sources — never widen it to
 * include 'colega', or the sync could match a partner's listing by address
 * and write over it.
 */
export const OWNER_PROPERTY_SOURCES = ["owner_direct", "agency"] as const;

/**
 * Everything that is not market intelligence. /admin/mercado reads the
 * complement of this: a partner's catalog is published inventory, and
 * counting it as "the market" would put one agency's asking prices into the
 * medians twice (they are also on the portals).
 */
export const NON_MARKET_SOURCES = PUBLIC_PROPERTY_SOURCES;

export const PUBLIC_LISTING_STATUS = "publicada" as const;

/**
 * Cache tag for everything that depends on "which properties are public".
 *
 * One tag and not one per surface: the set is the same set everywhere — the
 * two-gate filter above — so a property becoming published changes every
 * consumer at the same instant. Splitting the tag would mean remembering to
 * invalidate each one, and the failure mode of forgetting is a page that
 * quietly serves yesterday's catalog.
 */
export const PUBLIC_CATALOG_TAG = "catalogo-publico";
