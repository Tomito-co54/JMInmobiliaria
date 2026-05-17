-- ============================================================================
-- Jotaeme — ARBA cadastral lookup cache
-- Migration: 00006_arba_lookups.sql
-- ============================================================================
-- Caches results of querying ARBA's public WFS GeoServer
-- (geo.arba.gov.ar/geoserver/idera/wfs, layer idera:Parcela) for a given
-- (lat, lng) point.
--
-- A row with NULL partida is a negative cache hit — the point was queried
-- but no parcel was found within the search radius. We still cache these so
-- repeated runs of the enrichment CLI don't re-hit ARBA for unmatchable points.
--
-- TTL is enforced in the app layer (180 days). Cadastral data changes slowly
-- (subdivisions, new escrituras) but not at scrape-frequency, so a long TTL
-- is fine.
-- ============================================================================

CREATE TYPE arba_match_strategy AS ENUM (
  'intersects',   -- The point fell inside the parcel polygon
  'dwithin',      -- The point was within N meters of the parcel; we picked closest
  'none'          -- No parcel found (for negative cache)
);

CREATE TABLE public.arba_lookups (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  -- Coordinates we queried. Exact match keys the cache.
  lat             numeric NOT NULL,
  lng             numeric NOT NULL,
  -- Result fields. All NULL when the point matched no parcel.
  partida         text,
  nomenclatura    text,
  surface_arba    numeric,
  tipo            text,             -- 'Urbano' | 'Rural' | etc.
  match_strategy  arba_match_strategy NOT NULL,
  -- Approximate distance from the queried point to the matched parcel's
  -- centroid (meters). 0 when match_strategy = 'intersects'.
  distance_meters numeric,
  -- Raw GeoJSON FeatureCollection returned by ARBA, for debugging.
  raw_response    jsonb,
  created_at      timestamptz NOT NULL DEFAULT now(),
  UNIQUE (lat, lng)
);

CREATE INDEX idx_arba_lookups_lookup ON public.arba_lookups (lat, lng);
CREATE INDEX idx_arba_lookups_created ON public.arba_lookups (created_at);
CREATE INDEX idx_arba_lookups_partida ON public.arba_lookups (partida)
  WHERE partida IS NOT NULL;

-- ============================================================================
-- RLS: writes only via service_role (no policy = denied). Admins can read for
-- debugging and audit in the admin panel.
-- ============================================================================

ALTER TABLE public.arba_lookups ENABLE ROW LEVEL SECURITY;

CREATE POLICY "ARBA lookups are admin-read"
  ON public.arba_lookups FOR SELECT
  USING (public.is_admin());
