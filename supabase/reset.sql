-- ============================================================================
-- Jotaeme — Database Reset
-- ============================================================================
-- Drops all app-specific objects so the initial migration can be re-run.
-- DO NOT use in production — only for local/dev cleanup.
-- Does NOT touch Supabase auth tables.
-- ============================================================================

-- Drop trigger on auth.users (created by the migration)
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

-- Drop tables (CASCADE removes dependent indexes, triggers, RLS policies)
DROP TABLE IF EXISTS public.alerts CASCADE;
DROP TABLE IF EXISTS public.service_orders CASCADE;
DROP TABLE IF EXISTS public.favorites CASCADE;
DROP TABLE IF EXISTS public.search_profiles CASCADE;
DROP TABLE IF EXISTS public.property_history CASCADE;
DROP TABLE IF EXISTS public.properties CASCADE;
DROP TABLE IF EXISTS public.users CASCADE;

-- Drop functions
DROP FUNCTION IF EXISTS public.handle_new_user() CASCADE;
DROP FUNCTION IF EXISTS public.update_updated_at() CASCADE;

-- Drop enum types
DROP TYPE IF EXISTS alert_type;
DROP TYPE IF EXISTS order_status;
DROP TYPE IF EXISTS service_type;
DROP TYPE IF EXISTS user_role;
DROP TYPE IF EXISTS price_currency;
DROP TYPE IF EXISTS operation_type;
DROP TYPE IF EXISTS property_type;
DROP TYPE IF EXISTS property_source;
