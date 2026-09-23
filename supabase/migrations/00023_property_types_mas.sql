-- 00023 — four more property types: deposito, oficina, galpon, campo.
--
-- Tomy, 23-sep-2026: the catalog's search intro asks "¿qué tipo de
-- propiedad?", and the portfolio has more than houses and flats. Same pattern
-- as 00019 (cochera). The list in code is lib/property/types.ts, and the two
-- have to match.
--
-- "terreno" is NOT here on purpose: the sync already reads "terreno" in the
-- maestra's Tipo column as `lote`, and two types for one kind of land would be
-- two buttons for the same answer. Pending Tomy's call.
--
-- ADD VALUE cannot be undone without rebuilding the type, which is why the
-- list is short and deliberate.

ALTER TYPE property_type ADD VALUE IF NOT EXISTS 'deposito';
ALTER TYPE property_type ADD VALUE IF NOT EXISTS 'oficina';
ALTER TYPE property_type ADD VALUE IF NOT EXISTS 'galpon';
ALTER TYPE property_type ADD VALUE IF NOT EXISTS 'campo';
