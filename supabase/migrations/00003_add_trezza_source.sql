-- ============================================================================
-- Jotaeme — Add 'trezza' to property_source enum
-- Migration: 00003_add_trezza_source.sql
-- ============================================================================
-- Trezza Propiedades is a local Zona Sur agency, not a portal. We track it
-- as its own source rather than collapsing all agencies into 'agency' so
-- we can attribute listings correctly.
-- ============================================================================

ALTER TYPE property_source ADD VALUE IF NOT EXISTS 'trezza';
