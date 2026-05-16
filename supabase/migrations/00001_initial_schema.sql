-- ============================================================================
-- Jotaeme — Initial Database Schema
-- Migration: 00001_initial_schema.sql
--
-- Creates all core entities for the MVP:
--   1. Custom enums
--   2. users (extends auth.users)
--   3. properties
--   4. property_history
--   5. search_profiles
--   6. favorites
--   7. service_orders
--   8. alerts
--   9. RLS policies for all tables
-- ============================================================================

-- ============================================================================
-- 1. ENUMS
-- ============================================================================

CREATE TYPE property_source AS ENUM (
  'zonaprop',
  'argenprop',
  'mercadolibre',
  'owner_direct',
  'agency'
);

CREATE TYPE property_type AS ENUM (
  'casa',
  'departamento',
  'ph',
  'lote',
  'local'
);

CREATE TYPE operation_type AS ENUM (
  'venta',
  'alquiler'
);

CREATE TYPE price_currency AS ENUM (
  'USD',
  'ARS'
);

CREATE TYPE user_role AS ENUM (
  'buyer',
  'agency',
  'admin'
);

CREATE TYPE service_type AS ENUM (
  'dominion_report',
  'dominion_report_urgent',
  'cadastral_report',
  'cadastral_certificate',
  'cedula_catastral',
  'inhibition_report',
  'market_appraisal',
  'formal_appraisal',
  'parcel_status',
  'compra_segura_bundle'
);

CREATE TYPE order_status AS ENUM (
  'pending_payment',
  'paid',
  'processing',
  'delivered',
  'refunded'
);

CREATE TYPE alert_type AS ENUM (
  'new_match',
  'price_drop',
  'score_change'
);

-- ============================================================================
-- 2. USERS
-- Extends Supabase auth.users with app-specific fields.
-- The id matches auth.users.id exactly.
-- ============================================================================

CREATE TABLE users (
  id          uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email       text UNIQUE NOT NULL,
  full_name   text NOT NULL DEFAULT '',
  phone       text,
  role        user_role NOT NULL DEFAULT 'buyer',
  created_at  timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE users IS 'App user profiles — extends Supabase auth.users';

-- ============================================================================
-- 3. PROPERTIES
-- One row per unique property tracked in the platform.
-- ============================================================================

CREATE TABLE properties (
  id                      uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  external_id             text,
  source                  property_source NOT NULL,
  url                     text,
  partido                 text,
  partida                 text,
  nomenclatura_catastral  text,
  address                 text,
  lat                     numeric,
  lng                     numeric,
  property_type           property_type,
  operation_type          operation_type NOT NULL DEFAULT 'venta',
  price_amount            numeric,
  price_currency          price_currency DEFAULT 'USD',
  surface_total           numeric,
  surface_covered         numeric,
  surface_arba            numeric,
  has_surface_discrepancy boolean DEFAULT false,
  rooms                   integer,
  bedrooms                integer,
  bathrooms               integer,
  garages                 integer,
  description             text,
  photos                  jsonb DEFAULT '[]'::jsonb,
  first_seen_at           timestamptz NOT NULL DEFAULT now(),
  last_seen_at            timestamptz NOT NULL DEFAULT now(),
  is_active               boolean NOT NULL DEFAULT true,
  quality_score           numeric,
  quality_score_breakdown jsonb,
  created_at              timestamptz NOT NULL DEFAULT now(),
  updated_at              timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE properties IS 'Main entity — one row per property listing tracked';

-- Index for common queries
CREATE INDEX idx_properties_partido ON properties(partido);
CREATE INDEX idx_properties_active ON properties(is_active);
CREATE INDEX idx_properties_source ON properties(source);
CREATE INDEX idx_properties_external_id ON properties(external_id);
CREATE INDEX idx_properties_operation_type ON properties(operation_type);
CREATE INDEX idx_properties_property_type ON properties(property_type);

-- ============================================================================
-- 4. PROPERTY_HISTORY
-- Tracks every change to a property over time.
-- ============================================================================

CREATE TABLE property_history (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id     uuid NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
  changed_at      timestamptz NOT NULL DEFAULT now(),
  field_changed   text NOT NULL,
  old_value       text,
  new_value       text
);

COMMENT ON TABLE property_history IS 'Audit log of property data changes (price drops, status, etc.)';

CREATE INDEX idx_property_history_property ON property_history(property_id);
CREATE INDEX idx_property_history_changed_at ON property_history(changed_at);
CREATE INDEX idx_property_history_field ON property_history(field_changed);

-- ============================================================================
-- 5. SEARCH_PROFILES
-- A user can have multiple search profiles (up to 5).
-- ============================================================================

CREATE TABLE search_profiles (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name            text NOT NULL DEFAULT 'Mi búsqueda',
  zones           jsonb DEFAULT '[]'::jsonb,
  price_min       numeric,
  price_max       numeric,
  price_currency  price_currency DEFAULT 'USD',
  property_types  text[] DEFAULT '{}',
  rooms_min       integer,
  surface_min     numeric,
  must_haves      text[] DEFAULT '{}',
  personal_objectives jsonb,  -- Phase 2
  is_primary      boolean NOT NULL DEFAULT false,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE search_profiles IS 'User search profiles for match scoring';

CREATE INDEX idx_search_profiles_user ON search_profiles(user_id);

-- ============================================================================
-- 6. FAVORITES
-- User's saved properties.
-- ============================================================================

CREATE TABLE favorites (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  property_id   uuid NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
  notes         text,
  created_at    timestamptz NOT NULL DEFAULT now(),

  UNIQUE(user_id, property_id)
);

COMMENT ON TABLE favorites IS 'User-saved properties with optional notes';

CREATE INDEX idx_favorites_user ON favorites(user_id);
CREATE INDEX idx_favorites_property ON favorites(property_id);

-- ============================================================================
-- 7. SERVICE_ORDERS
-- Paid service contracts (dominion reports, cadastral reports, etc.)
-- ============================================================================

CREATE TABLE service_orders (
  id                      uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id                 uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  property_id             uuid REFERENCES properties(id) ON DELETE SET NULL,
  service_type            service_type NOT NULL,
  status                  order_status NOT NULL DEFAULT 'pending_payment',
  price                   numeric NOT NULL,
  mercadopago_payment_id  text,
  result_file_url         text,
  created_at              timestamptz NOT NULL DEFAULT now(),
  updated_at              timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE service_orders IS 'Paid service orders (informes, tasaciones, etc.)';

CREATE INDEX idx_service_orders_user ON service_orders(user_id);
CREATE INDEX idx_service_orders_status ON service_orders(status);

-- ============================================================================
-- 8. ALERTS
-- Notifications sent to users.
-- ============================================================================

CREATE TABLE alerts (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  type          alert_type NOT NULL,
  property_id   uuid REFERENCES properties(id) ON DELETE CASCADE,
  message       text,
  sent_at       timestamptz NOT NULL DEFAULT now(),
  read_at       timestamptz
);

COMMENT ON TABLE alerts IS 'In-app and email notification records';

CREATE INDEX idx_alerts_user ON alerts(user_id);
CREATE INDEX idx_alerts_user_unread ON alerts(user_id) WHERE read_at IS NULL;

-- ============================================================================
-- 9. AUTOMATIC UPDATED_AT TRIGGER
-- ============================================================================

CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS trigger AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_updated_at_properties
  BEFORE UPDATE ON properties
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER set_updated_at_search_profiles
  BEFORE UPDATE ON search_profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER set_updated_at_service_orders
  BEFORE UPDATE ON service_orders
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ============================================================================
-- 10. AUTO-CREATE USER PROFILE ON SIGNUP
-- When a user signs up via Supabase Auth, automatically create their
-- row in the users table.
-- ============================================================================

CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.users (id, email, full_name)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data ->> 'full_name', '')
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- ============================================================================
-- 11. ROW LEVEL SECURITY (RLS)
-- ============================================================================

-- Enable RLS on all tables
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE properties ENABLE ROW LEVEL SECURITY;
ALTER TABLE property_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE search_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE favorites ENABLE ROW LEVEL SECURITY;
ALTER TABLE service_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE alerts ENABLE ROW LEVEL SECURITY;

-- ---------------------------------------------------------------------------
-- USERS: each user can read/update their own profile
-- ---------------------------------------------------------------------------

CREATE POLICY "Users can read own profile"
  ON users FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Users can update own profile"
  ON users FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- ---------------------------------------------------------------------------
-- PROPERTIES: public read, admin-only write
-- ---------------------------------------------------------------------------

CREATE POLICY "Properties are publicly readable"
  ON properties FOR SELECT
  USING (true);

CREATE POLICY "Only admins can insert properties"
  ON properties FOR INSERT
  WITH CHECK (
    EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin')
  );

CREATE POLICY "Only admins can update properties"
  ON properties FOR UPDATE
  USING (
    EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin')
  );

CREATE POLICY "Only admins can delete properties"
  ON properties FOR DELETE
  USING (
    EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin')
  );

-- ---------------------------------------------------------------------------
-- PROPERTY_HISTORY: public read, admin-only write
-- ---------------------------------------------------------------------------

CREATE POLICY "Property history is publicly readable"
  ON property_history FOR SELECT
  USING (true);

CREATE POLICY "Only admins can insert property history"
  ON property_history FOR INSERT
  WITH CHECK (
    EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin')
  );

-- ---------------------------------------------------------------------------
-- SEARCH_PROFILES: each user manages their own
-- ---------------------------------------------------------------------------

CREATE POLICY "Users can read own search profiles"
  ON search_profiles FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create own search profiles"
  ON search_profiles FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own search profiles"
  ON search_profiles FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own search profiles"
  ON search_profiles FOR DELETE
  USING (auth.uid() = user_id);

-- ---------------------------------------------------------------------------
-- FAVORITES: each user manages their own
-- ---------------------------------------------------------------------------

CREATE POLICY "Users can read own favorites"
  ON favorites FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create own favorites"
  ON favorites FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own favorites"
  ON favorites FOR DELETE
  USING (auth.uid() = user_id);

-- ---------------------------------------------------------------------------
-- SERVICE_ORDERS: each user sees their own, admin sees all
-- ---------------------------------------------------------------------------

CREATE POLICY "Users can read own service orders"
  ON service_orders FOR SELECT
  USING (
    auth.uid() = user_id
    OR EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin')
  );

CREATE POLICY "Users can create own service orders"
  ON service_orders FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Only admins can update service orders"
  ON service_orders FOR UPDATE
  USING (
    EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin')
  );

-- ---------------------------------------------------------------------------
-- ALERTS: each user sees their own
-- ---------------------------------------------------------------------------

CREATE POLICY "Users can read own alerts"
  ON alerts FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can update own alerts"
  ON alerts FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
