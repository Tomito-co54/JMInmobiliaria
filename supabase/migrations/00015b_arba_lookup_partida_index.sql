-- Companion to 00015. Lookups by partida need an index; the table only had
-- one on (lat, lng), which is the key the scraped flow uses.
CREATE INDEX IF NOT EXISTS idx_arba_lookups_partida
  ON public.arba_lookups (partida)
  WHERE partida IS NOT NULL;

COMMENT ON INDEX idx_arba_lookups_partida IS
  'Read path for owner properties, which are found by partida and have no coordinates to key on.';
