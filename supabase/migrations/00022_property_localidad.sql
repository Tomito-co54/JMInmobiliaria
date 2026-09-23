-- 00022 — localidad: the town a listing is in, below its partido.
--
-- The catalog's search intro (Tomy, 23-sep-2026) asks "¿qué ubicación?", and
-- by partido that question has one answer: the whole published catalog is in
-- Lomas de Zamora. The visitor thinks in Banfield, Temperley, Lomas centro.
--
-- Plain text, nullable, no CHECK: the vocabulary is closed in code
-- (lib/zona-sur/localidades.ts), enforced by the validator and the maestra
-- sync, so adding a localidad is one line and not a migration. It comes from
-- the maestra's `Localidad` column on the `Propiedades` sheet, one per
-- building, like `Dirección real`.
--
-- Not owner-only either: a scraped row could carry one some day (geocoding
-- knows the town), and nothing public reads scraped rows.

alter table public.properties
  add column if not exists localidad text;

comment on column public.properties.localidad is
  'Localidad within the partido (Banfield, Temperley…). Closed vocabulary in lib/zona-sur/localidades.ts. From the maestra: Propiedades sheet, Localidad column.';
