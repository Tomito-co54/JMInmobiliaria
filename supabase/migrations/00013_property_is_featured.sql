-- ============================================================================
-- properties.is_featured — broker-curated "destacada" flag
-- Migration: 00013_property_is_featured.sql
-- ============================================================================
-- The public home rotates a single "protagonista" property (the editorial
-- centerpiece, with the cut-out gesture from the direction-de-arte). The
-- broker picks which listings are eligible for that rotation by flipping
-- this flag from /admin/properties.
--
-- Conceptually only owner-managed properties should ever be is_featured —
-- a scraped listing has no business being the home's protagonista. We
-- enforce that with a CHECK constraint instead of a behavioral convention,
-- matching the pattern of listing_status (00011).
-- ============================================================================

ALTER TABLE public.properties
  ADD COLUMN IF NOT EXISTS is_featured boolean NOT NULL DEFAULT false;

-- Only owner_direct / agency rows can be flipped to true.
-- Scraped sources stay false and the CHECK rejects any attempt to flip them.
ALTER TABLE public.properties
  ADD CONSTRAINT properties_is_featured_owner_only CHECK (
    is_featured = false
    OR source IN ('owner_direct', 'agency')
  );

-- Partial index — only the few featured rows ever need to be located fast.
CREATE INDEX IF NOT EXISTS idx_properties_is_featured
  ON public.properties (is_featured)
  WHERE is_featured = true;

COMMENT ON COLUMN public.properties.is_featured IS
  'Broker-curated flag — when true (and listing_status=publicada), the row '
  'is eligible to be the home page protagonista. Only owner sources allowed '
  '(check constraint).';
