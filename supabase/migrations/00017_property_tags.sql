-- ============================================================================
-- properties.tags — editorial labels on the broker's own listings
-- Migration: 00017_property_tags.sql
-- ============================================================================
-- "Apto comercial", "Oferta", "A estrenar": short claims the broker makes
-- about a listing that no existing column can carry. They are not facts the
-- catalog derives (a rental is derived from operation_type, the age from
-- year_built); they are things the broker decides to say, so they live in
-- their own column and are typed in by hand, like listing_status.
--
-- A closed vocabulary, enforced here and mirrored in lib/property/tags.ts.
-- Free text would let "oferta", "Oferta" and "OFERTA" become three different
-- chips, and a typo would publish silently — the class of failure this repo
-- keeps finding, where the wrong thing arrives looking right. The cost is
-- that adding a tag is a migration that redefines the CHECK, plus one entry
-- in the TypeScript list. That is the intended price.
--
-- Stored as text[] rather than a join table: a listing carries at most a
-- handful, nothing else references them, and the array reads in one SELECT
-- with the row that owns it.
-- ============================================================================

ALTER TABLE public.properties
  ADD COLUMN IF NOT EXISTS tags text[] NOT NULL DEFAULT '{}';

-- Every element must be a known tag. `<@` is "is contained by": an empty
-- array passes, and so does any subset of the vocabulary, in any order.
ALTER TABLE public.properties
  ADD CONSTRAINT properties_tags_known CHECK (
    tags <@ ARRAY['apto_comercial', 'oferta', 'a_estrenar']::text[]
  );

-- Only the broker's own listings carry tags. A scraped row is market
-- intelligence, not something we make claims about — same rule as
-- listing_status (00011) and is_featured (00013), enforced the same way.
ALTER TABLE public.properties
  ADD CONSTRAINT properties_tags_owner_only CHECK (
    cardinality(tags) = 0
    OR source IN ('owner_direct', 'agency')
  );

COMMENT ON COLUMN public.properties.tags IS
  'Editorial labels chosen by the broker (apto_comercial, oferta, '
  'a_estrenar). Closed vocabulary, CHECK-enforced; mirrored in '
  'lib/property/tags.ts. Empty for scraped rows.';
