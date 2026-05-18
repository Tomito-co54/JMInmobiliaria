-- ============================================================================
-- Block 7 — Servicios automatizados
-- Extends service_orders with fields needed for the MercadoPago + delivery flow.
--
-- Added:
--   currency           — ARS / USD (free tier services priced in ARS)
--   mp_preference_id   — MercadoPago preference id, set when order is created
--                        (before payment). The existing mercadopago_payment_id
--                        is set only after the user actually pays.
--   paid_at            — when webhook confirms approval
--   delivered_at       — when PDF is uploaded and email sent
--   metadata           — jsonb for forward-flexibility (e.g., overrides,
--                        delivery email when different from account email)
-- ============================================================================

ALTER TABLE service_orders
  ADD COLUMN IF NOT EXISTS currency       text NOT NULL DEFAULT 'ARS' CHECK (currency IN ('ARS', 'USD')),
  ADD COLUMN IF NOT EXISTS mp_preference_id text,
  ADD COLUMN IF NOT EXISTS paid_at        timestamptz,
  ADD COLUMN IF NOT EXISTS delivered_at   timestamptz,
  ADD COLUMN IF NOT EXISTS metadata       jsonb NOT NULL DEFAULT '{}'::jsonb;

-- Helpful index for the webhook lookup: by preference_id (we use this to
-- find the order when MP fires a notification before payment_id is known).
CREATE INDEX IF NOT EXISTS idx_service_orders_preference
  ON service_orders(mp_preference_id)
  WHERE mp_preference_id IS NOT NULL;

-- Same for payment_id (set once MP confirms).
CREATE INDEX IF NOT EXISTS idx_service_orders_payment
  ON service_orders(mercadopago_payment_id)
  WHERE mercadopago_payment_id IS NOT NULL;
