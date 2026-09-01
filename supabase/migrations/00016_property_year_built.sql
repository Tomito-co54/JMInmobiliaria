-- ============================================================================
-- properties.year_built — how old the BUILDING is
-- Migration: 00016_property_year_built.sql
-- ============================================================================
-- The buyer's match can weigh how old a property is, and until now the table
-- had no way to answer that. The only dates on the row are `first_seen_at`
-- and `created_at`, which measure how long the AD has existed — a different
-- question, and one a two-week-old listing of a 1960s house answers wrongly.
--
-- Stored as the year of construction, not as an age in years. An age would be
-- a number that quietly becomes false every January; the year it was built is
-- a fact that never changes. Everything user-facing derives the age at read
-- time.
--
-- Deliberately nullable, and expected to be null for most rows: Zonaprop
-- publishes antigüedad on the individual listing page, not in the results
-- list, so the scraper cannot reach it under the ~9-requests-per-IP ceiling
-- (same blocker as superficie cubierta — point 6 of the Build map). Owner
-- properties get it typed in. The match treats a null as "not known" and
-- renormalizes it out rather than guessing, so a scraped row is never
-- penalised for a field nobody could fill.
-- ============================================================================

ALTER TABLE public.properties
  ADD COLUMN IF NOT EXISTS year_built integer;

-- A plausibility bound rather than a precise one. The lower end predates any
-- housing stock in Zona Sur by a wide margin; the upper end allows a unit
-- sold before it is finished, which is normal in this market ("a estrenar",
-- "en pozo"). The point is to catch a typo — a 3-digit year, a surface typed
-- into the wrong box — not to adjudicate architectural history.
ALTER TABLE public.properties
  ADD CONSTRAINT properties_year_built_plausible CHECK (
    year_built IS NULL
    OR (year_built >= 1800 AND year_built <= 2100)
  );

COMMENT ON COLUMN public.properties.year_built IS
  'Year the building was constructed. NOT the age of the listing — see '
  'first_seen_at for that. Null when unknown, which is the norm for scraped '
  'rows: the source only publishes it on the individual listing page.';
