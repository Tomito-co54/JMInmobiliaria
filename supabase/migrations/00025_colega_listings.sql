-- 00025 — what a 'colega' row may carry.
--
-- `partner` names whose listing it is ('laudani'), for the seal on the card
-- and for the sync that owns those rows. Required on colega rows, forbidden
-- on the rest: a colega row without a partner is one nobody can sync or
-- credit.
--
-- Colega rows go through the public gate like the family's, so they need
-- `listing_status` (the sync writes 'publicada', and 'borrador' when the
-- listing leaves the partner's site) and `tags` (a price cut there is an
-- `oferta` here). Extras, is_featured and price_list_amount stay owner-only:
-- the protagonist of the home is always Tomy's.

alter table public.properties
  add column if not exists partner text;

comment on column public.properties.partner is
  'For source = colega: whose listing it is (lib/colegas). Null otherwise.';

alter table public.properties drop constraint if exists properties_partner_colega_only;
alter table public.properties
  add constraint properties_partner_colega_only check (
    (source = 'colega' and partner is not null)
    or (source <> 'colega' and partner is null)
  );

alter table public.properties drop constraint if exists properties_listing_status_check;
alter table public.properties
  add constraint properties_listing_status_check check (
    (
      source in ('owner_direct', 'agency', 'colega')
      and listing_status in ('borrador', 'publicada', 'vendida')
    )
    or (
      source not in ('owner_direct', 'agency', 'colega')
      and listing_status is null
    )
  );

alter table public.properties drop constraint if exists properties_tags_owner_only;
alter table public.properties
  add constraint properties_tags_owner_only check (
    cardinality(tags) = 0 or source in ('owner_direct', 'agency', 'colega')
  );

-- One row per partner listing. The sync looks rows up by this pair, and a
-- duplicate would publish the same property twice.
create unique index if not exists properties_colega_external_id
  on public.properties (source, external_id)
  where source = 'colega';
