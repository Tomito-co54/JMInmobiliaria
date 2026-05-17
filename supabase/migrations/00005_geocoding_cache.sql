-- ============================================================================
-- Jotaeme — Geocoding cache
-- Migration: 00005_geocoding_cache.sql
-- ============================================================================
-- Caches address -> lat/lng lookups from external geocoders (OSM/Nominatim
-- primarily, ARBA WMS later for verified parcel coords).
--
-- TTL is enforced in app code (90 days). Stale rows can be hard-deleted by
-- a periodic cleanup job.
-- ============================================================================

CREATE TABLE public.geocoding_cache (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  -- Normalized query string used as the cache key (lowercased, trimmed, etc.)
  query         text NOT NULL,
  -- Geocoder provider: 'nominatim', 'arba_wms', etc.
  provider      text NOT NULL DEFAULT 'nominatim',

  -- Result. NULLABLE on purpose: we cache misses too (so we don't keep
  -- hammering OSM with un-geocodable addresses).
  lat           numeric(10, 7),
  lng           numeric(10, 7),
  display_name  text,            -- what the geocoder echoed back ("Av. Hipólito Yrigoyen 8900, Lomas...")
  confidence    text,            -- provider-specific quality hint (e.g. "house" vs "street")

  created_at    timestamptz NOT NULL DEFAULT now(),

  UNIQUE (provider, query)
);

CREATE INDEX idx_geocoding_cache_lookup ON public.geocoding_cache(provider, query);
CREATE INDEX idx_geocoding_cache_created ON public.geocoding_cache(created_at);

-- RLS: only the server (service role) writes; nothing else needs to read.
ALTER TABLE public.geocoding_cache ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Geocoding cache is admin-read"
  ON public.geocoding_cache FOR SELECT
  USING (public.is_admin());
