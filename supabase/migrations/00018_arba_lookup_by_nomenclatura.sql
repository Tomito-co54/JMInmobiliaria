-- ============================================================================
-- arba_lookups.match_strategy += 'by_nomenclatura'
-- Migration: 00018_arba_lookup_by_nomenclatura.sql
-- ============================================================================
-- A unit under propiedad horizontal has its own partida, and ARBA's public
-- WFS cannot resolve it: the `Parcela` layer only carries the lot's partida,
-- and `Subparcela` has geometry and nomenclature but no partida at all.
-- Found with Alsina 1639 4°Y (3-sep-2026).
--
-- What the unit's papers do carry is the LOT's nomenclature, and the WFS
-- answers to it. So there is now a third attribute lookup, keyed by `cca`,
-- and its cache rows say so instead of borrowing 'by_partida'.
--
-- ALTER TYPE ... ADD VALUE runs outside a transaction, so it is its own
-- migration, same as 00015.
-- ============================================================================

ALTER TYPE arba_match_strategy ADD VALUE IF NOT EXISTS 'by_nomenclatura';
