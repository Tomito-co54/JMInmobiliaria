-- ============================================================================
-- Jotaeme — Add operation_type to search_profiles
-- Migration: 00007_search_profile_operation_type.sql
-- ============================================================================
-- Block 5 introduces match scoring between a property and a search profile.
-- One of the sub-scores compares the operation (venta vs alquiler). The
-- `operation_type` enum already exists (from 00001) on properties; we add
-- the same enum as a nullable column on search_profiles so a user can
-- declare what they're looking for.
--
-- NULL = "no preference" (the buyer accepts both). The match algorithm
-- treats null as low-confidence neutral rather than a hard mismatch.
-- ============================================================================

ALTER TABLE public.search_profiles
  ADD COLUMN IF NOT EXISTS operation_type operation_type;

COMMENT ON COLUMN public.search_profiles.operation_type IS
  'venta | alquiler | NULL (no preference). Used by the match score sub-score.';
