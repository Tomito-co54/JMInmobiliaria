-- ============================================================================
-- property_type += 'cochera'
-- Migration: 00019_property_type_cochera.sql
-- ============================================================================
-- The broker's portfolio has parking units that are listings in their own
-- right — a "U.C" (unidad complementaria) sold or rented on its own, not
-- attached to an apartment. None of the five types fit: it is not a `local`
-- and it is not a `lote`. Pretending otherwise would put "Local en venta"
-- on a garage.
--
-- ALTER TYPE ... ADD VALUE runs outside a transaction, so it is its own
-- migration, same as 00015 and 00018.
-- ============================================================================

ALTER TYPE property_type ADD VALUE IF NOT EXISTS 'cochera';
