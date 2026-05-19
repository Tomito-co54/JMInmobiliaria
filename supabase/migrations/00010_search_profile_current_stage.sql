-- ============================================================================
-- Add current_stage to search_profiles.
--
-- Lets the buyer tell us where they are in the buying process so we can
-- render contextual guidance on /p/[id] ("you're in due diligence; for
-- this property you still need X, Y, Z"). Maps to step.slug values
-- from lib/education/buying-process.ts:
--
--   pre-busqueda
--   busqueda
--   reserva
--   due-diligence
--   boleto-y-escritura
--   post-escritura
--
-- Nullable: existing profiles + users who don't want to tell us their
-- stage just don't get the advisor.
-- ============================================================================

ALTER TABLE search_profiles
  ADD COLUMN IF NOT EXISTS current_stage text
    CHECK (current_stage IS NULL OR current_stage IN (
      'pre-busqueda',
      'busqueda',
      'reserva',
      'due-diligence',
      'boleto-y-escritura',
      'post-escritura'
    ));

COMMENT ON COLUMN search_profiles.current_stage IS
  'Buyer-declared stage in the property-buying process. References the step.slug values in lib/education/buying-process.ts. Used to render contextual advice on the property page.';
