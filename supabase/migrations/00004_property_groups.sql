-- ============================================================================
-- Jotaeme — Property deduplication
-- Migration: 00004_property_groups.sql
-- ============================================================================
-- Groups multiple listings (across sources) that refer to the same physical
-- property. A property_group is a logical "real-world property" that may have
-- 1..N listings attached to it (1 = no duplicate detected; N = duplicates).
--
-- Match strategies are stored as the matched_by enum so we know WHY a group
-- was formed. This lets us audit and improve the matcher over time.
-- ============================================================================

CREATE TYPE property_match_strategy AS ENUM (
  'partida',          -- ARBA cadastral ID match (strongest)
  'geo',              -- coordinates within radius
  'fuzzy_address',    -- normalized street+number match
  'manual'            -- admin manually grouped them
);

CREATE TABLE public.property_groups (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  -- Normalized signature used for the match (e.g. "lomas-de-zamora|garay 3500")
  signature     text,
  -- How the group was formed
  matched_by    property_match_strategy NOT NULL,
  -- The "best" listing in the group (most complete, most recent, etc.). Updated
  -- by the matcher as new listings arrive. Nullable to avoid circular FK at insert.
  primary_listing_id uuid REFERENCES public.properties(id) ON DELETE SET NULL,
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now()
);

CREATE TRIGGER property_groups_updated_at
  BEFORE UPDATE ON public.property_groups
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

CREATE INDEX idx_property_groups_signature ON public.property_groups(signature);

-- Add the group reference to properties
ALTER TABLE public.properties
  ADD COLUMN property_group_id uuid REFERENCES public.property_groups(id) ON DELETE SET NULL;

CREATE INDEX idx_properties_group ON public.properties(property_group_id)
  WHERE property_group_id IS NOT NULL;

-- ============================================================================
-- RLS: groups are public read, admin write (mirrors properties).
-- ============================================================================

ALTER TABLE public.property_groups ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Property groups are publicly readable"
  ON public.property_groups FOR SELECT
  USING (true);

CREATE POLICY "Only admins can insert property groups"
  ON public.property_groups FOR INSERT
  WITH CHECK (public.is_admin());

CREATE POLICY "Only admins can update property groups"
  ON public.property_groups FOR UPDATE
  USING (public.is_admin());

CREATE POLICY "Only admins can delete property groups"
  ON public.property_groups FOR DELETE
  USING (public.is_admin());
