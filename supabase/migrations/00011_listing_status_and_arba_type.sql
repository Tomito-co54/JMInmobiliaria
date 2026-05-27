-- ============================================================================
-- Listing status (broker-managed) + ARBA parcel type
-- Migration: 00011_listing_status_and_arba_type.sql
-- ============================================================================
-- Two orthogonal concepts have been historically conflated; this migration
-- separates them at the schema level so they can never drift.
--
--   is_active (existing)
--     "Is the SCRAPED listing still alive on its source portal?" — set by the
--     scrape pipeline. Owner-managed properties default to true and we
--     effectively ignore the column for them.
--
--   listing_status (NEW, this migration)
--     "What did the broker decide to do with their OWN property?" — a
--     three-state editorial workflow controlled from /admin. Only meaningful
--     for properties the broker manages (source IN ('owner_direct','agency')).
--     For scraped properties this column MUST be NULL — a CHECK constraint
--     enforces that, so the two domains can't bleed into each other.
--
-- Also adds `tpa` (Urbano / Rural) — the ARBA parcel type returned by the WFS
-- but until now never persisted to the row.
-- ============================================================================

ALTER TABLE public.properties
  ADD COLUMN IF NOT EXISTS listing_status text;

-- Domain guard. New rows MUST pick the right side of the OR; scrape inserts
-- (which don't set listing_status) leave it NULL and that satisfies the
-- second branch.
ALTER TABLE public.properties
  ADD CONSTRAINT properties_listing_status_check CHECK (
    (source IN ('owner_direct', 'agency')
       AND listing_status IN ('borrador', 'publicada', 'vendida'))
    OR
    (source NOT IN ('owner_direct', 'agency')
       AND listing_status IS NULL)
  );

-- Partial index — only the few owner/agency rows ever have a non-null value
-- here, so the index stays tiny and fast for the catalog filter queries.
CREATE INDEX IF NOT EXISTS idx_properties_listing_status
  ON public.properties (listing_status)
  WHERE listing_status IS NOT NULL;

-- ARBA parcel type. From the WFS `tpa` field (e.g. 'Urbano', 'Rural').
-- Captured during the by-partida cadastral lookup.
ALTER TABLE public.properties
  ADD COLUMN IF NOT EXISTS tpa text;

COMMENT ON COLUMN public.properties.listing_status IS
  'Broker editorial state for OWN properties (borrador|publicada|vendida). '
  'NULL for scraped sources — separation enforced by check constraint.';

COMMENT ON COLUMN public.properties.tpa IS
  'ARBA parcel type (Urbano|Rural|...) — from the WFS `tpa` attribute.';
