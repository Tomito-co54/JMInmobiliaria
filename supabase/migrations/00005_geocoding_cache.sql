-- ============================================================================
-- Jotaeme — Geocoding cache
-- Migration: 00005_geocoding_cache.sql
-- ============================================================================
-- Caches geocoding lookups (address text -> lat/lng) to avoid repeatedly
-- hitting external providers like Nominatim, which has strict rate limits
-- (1 req/sec) and a usage policy that requires aggressive client-side caching.
--
-- The cache is keyed by (provider, query). A row with NULL lat/lng is a
-- "negative" cache hit — the query was tried but no result was found. We still
-- cache this to avoid re-hitting Nominatim for unparseable addresses.
--
-- Entries are considered fresh for 90 days (TTL is enforced in the app layer,
-- not by a constraint, so we can tune it without a migration).
--
-- NOTE: this file was applied to the live DB before being added to the repo.
-- It is preserved here so the schema is reproducible from migrations alone.
-- ============================================================================

CREATE TABLE public.geocoding_cache (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  -- Normalized query string used as the cache key.
  query        text NOT NULL,
  -- Which provider produced this result. Default 'nominatim' for now.
  provider     text NOT NULL DEFAULT 'nominatim',
  -- Coordinates. NULL = negative cache (query tried, no result).
  lat          numeric,
  lng          numeric,
  -- Provider's canonical name for the matched place (for debugging/QA).
  display_name text,
  -- Provider-specific confidence tier. For Nominatim: addresstype
  -- (e.g. 'house', 'road', 'suburb', 'city') — downstream code can use
  -- this to reject too-coarse matches.
  confidence   text,
  created_at   timestamptz NOT NULL DEFAULT now(),
  UNIQUE (provider, query)
);

CREATE INDEX idx_geocoding_cache_lookup ON public.geocoding_cache (provider, query);
CREATE INDEX idx_geocoding_cache_created ON public.geocoding_cache (created_at);

-- ============================================================================
-- RLS: writes only via service_role (no policy = denied). Admins can read for
-- debugging in the admin panel.
-- ============================================================================

ALTER TABLE public.geocoding_cache ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Geocoding cache is admin-read"
  ON public.geocoding_cache FOR SELECT
  USING (public.is_admin());
