-- ============================================================================
-- properties.extras — cochera / patio / terraza, included or optional
-- Migration: 00020_property_extras.sql
-- ============================================================================
-- A unit does not have one price, it has a short table: Belgrano 1287 1°A is
-- USD 80.000, or 88.000 with the garage; Alsina 1639 4°Y is sold with garage
-- 00-15 and terrace 05-02 whether the buyer wants them or not. Until now the
-- row had `price_amount` (the floor: contado, sin extras) and a description
-- where the rest was dead text.
--
-- `extras` is a JSON array of { kind, mode, detail, price_delta }:
--   kind        cochera | patio | terraza            (closed list)
--   mode        incluida | opcional                  (fixed vs. a toggle)
--   detail      free short text — "00-15", "40 m²", "cubierta"
--   price_delta what an OPTIONAL extra adds to price_amount; null = consult.
--               Always null for an included one: it is already in the price.
--
-- `price_amount` keeps meaning what it meant — contado, sin extras — because
-- the Quality Score, the comparables and the market dashboard all read it,
-- and the number they read must stay the base one (Build map, point 7).
--
-- jsonb rather than a child table: a listing carries at most three, nothing
-- else references them, and the whole thing reads in one SELECT. Validated
-- by an immutable SQL function so the CHECK can look inside the array, and
-- mirrored by lib/property/extras.ts. Owner-only like tags (00017).
-- ============================================================================

ALTER TABLE public.properties
  ADD COLUMN IF NOT EXISTS extras jsonb NOT NULL DEFAULT '[]'::jsonb;

CREATE OR REPLACE FUNCTION public.property_extras_valid(v jsonb)
RETURNS boolean
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT jsonb_typeof(v) = 'array'
    AND NOT EXISTS (
      SELECT 1 FROM jsonb_array_elements(v) AS e
      WHERE jsonb_typeof(e) <> 'object'
         OR coalesce(e->>'kind', '') NOT IN ('cochera', 'patio', 'terraza')
         OR coalesce(e->>'mode', '') NOT IN ('incluida', 'opcional')
         OR (e ? 'price_delta' AND jsonb_typeof(e->'price_delta') NOT IN ('number', 'null'))
         OR (e ? 'detail' AND jsonb_typeof(e->'detail') NOT IN ('string', 'null'))
         -- An included extra is already in the price; a delta on it would be
         -- a number that means nothing and could be shown as if it did.
         OR (e->>'mode' = 'incluida' AND jsonb_typeof(e->'price_delta') = 'number')
    )
    -- One entry per kind: two garages are one "cochera" entry whose detail
    -- names both ("00-09 y 00-11"), not two chips that read as a typo.
    AND (
      SELECT count(*) = count(DISTINCT e->>'kind')
      FROM jsonb_array_elements(v) AS e
    );
$$;

ALTER TABLE public.properties
  ADD CONSTRAINT properties_extras_valid CHECK (public.property_extras_valid(extras));

ALTER TABLE public.properties
  ADD CONSTRAINT properties_extras_owner_only CHECK (
    extras = '[]'::jsonb
    OR source IN ('owner_direct', 'agency')
  );

COMMENT ON COLUMN public.properties.extras IS
  'Cochera / patio / terraza on an owner listing, each "incluida" (fixed, '
  'in the price) or "opcional" (a toggle; price_delta is what it adds to '
  'price_amount, null = consult). price_amount stays contado sin extras. '
  'Validated by property_extras_valid(); mirrored in lib/property/extras.ts.';
