-- ============================================================================
-- 00014 — Price snapshot on history rows
-- ============================================================================
-- A delisting used to record only that `is_active` flipped, which answers
-- "when did this leave the market" but not "at what price". That second
-- question is the one that matters to a broker: an ad that disappears at
-- USD 120.000 after two price cuts tells a different story than one that
-- disappears at its asking price.
--
-- The price was technically recoverable from the properties row while the
-- listing stayed gone, but it is overwritten the moment the ad comes back
-- with a new price — which is exactly the case worth studying.
--
-- Currency travels with the amount: the scraped set mixes USD and ARS, and
-- a bare number is meaningless without it.
-- ============================================================================

ALTER TABLE property_history
  ADD COLUMN IF NOT EXISTS price_at_change          numeric,
  ADD COLUMN IF NOT EXISTS price_currency_at_change text;

COMMENT ON COLUMN property_history.price_at_change IS
  'Listing price at the moment this change was recorded. Written on delisting and relisting; null on rows created before 00014.';

COMMENT ON COLUMN property_history.price_currency_at_change IS
  'Currency of price_at_change (USD / ARS). Null when the price was unknown.';
