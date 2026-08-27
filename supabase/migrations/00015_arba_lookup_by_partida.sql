-- ============================================================================
-- 00015 — Cache ARBA lookups made by partida
-- ============================================================================
-- The cadastral cache was built for the scraped flow: geocode an address,
-- ask ARBA what parcel sits at those coordinates, key the answer by lat/lng.
-- Owner properties take the other road — they are loaded by partida and
-- never geocoded — and that road never wrote to the cache at all.
--
-- Two consequences, both invisible until you look at a published listing:
-- the parcel polygon was fetched and then thrown away, and /p/[id], which
-- reads the cache by coordinates, found nothing to draw. So the ARBA outline
-- — the whole point of the "verificado contra el catastro" claim — never
-- appeared on a single owner property, which is to say on the entire public
-- catalogue.
--
-- ALTER TYPE ... ADD VALUE runs outside a transaction, so it is its own
-- statement ahead of the index.
-- ============================================================================

ALTER TYPE arba_match_strategy ADD VALUE IF NOT EXISTS 'by_partida';
