-- 00021 — price_list_amount: the price an offer is a discount FROM.
--
-- Until now an offer was a lower number plus the `oferta` tag: the list price
-- lived only in the maestra (`Precio pretendido`), so the site could not show
-- what the offer saves. Tomy, 18-sep-2026: next to the offer price goes the
-- list price, struck through.
--
-- Rules, enforced here and mirrored in lib/property/price.ts:
--   - Owner rows only, like listing_status / tags / extras. A scraped listing's
--     "before" price is what property_history records, not a column.
--   - It must be HIGHER than price_amount. A list price equal to or below what
--     we publish is not a list price; it is a typo, and printing it struck
--     through would make the offer look like a markup.

alter table public.properties
  add column if not exists price_list_amount numeric;

comment on column public.properties.price_list_amount is
  'List price for an offer (maestra: Precio pretendido). price_amount stays the published one. Owner rows only, and always higher than price_amount.';

alter table public.properties
  drop constraint if exists properties_price_list_owner_only;

alter table public.properties
  add constraint properties_price_list_owner_only check (
    price_list_amount is null
    or source in ('owner_direct', 'agency')
  );

alter table public.properties
  drop constraint if exists properties_price_list_above_price;

alter table public.properties
  add constraint properties_price_list_above_price check (
    price_list_amount is null
    or (price_amount is not null and price_list_amount > price_amount)
  );
