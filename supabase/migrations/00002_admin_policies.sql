-- ============================================================================
-- Jotaeme — Admin policies + helpers
-- Migration: 00002_admin_policies.sql
-- ============================================================================
-- Adds:
--   1. A SECURITY DEFINER helper to safely check the admin role
--      (avoids recursive RLS lookups when policies reference users themselves).
--   2. RLS policies that let admins read all rows in users, search_profiles,
--      favorites, and alerts (existing properties/property_history/service_orders
--      policies already allow admin operations).
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. Helper function: is_admin()
-- SECURITY DEFINER bypasses RLS when checking the role of the current user.
-- This prevents infinite recursion when admin policies on `users` need to
-- consult `users` itself.
-- ----------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.users
    WHERE id = auth.uid()
      AND role = 'admin'
  );
$$;

COMMENT ON FUNCTION public.is_admin() IS
  'Returns true if the current authenticated user has role = admin. Use in RLS policies.';

-- Allow authenticated users to call this function.
-- Anon users always get false (auth.uid() is null).
GRANT EXECUTE ON FUNCTION public.is_admin() TO authenticated, anon;

-- ----------------------------------------------------------------------------
-- 2. Replace existing policies that already check is_admin manually
--    so they use the helper function. Cleaner and avoids the inline EXISTS
--    subqueries which could recurse.
-- ----------------------------------------------------------------------------

DROP POLICY IF EXISTS "Only admins can insert properties" ON properties;
DROP POLICY IF EXISTS "Only admins can update properties" ON properties;
DROP POLICY IF EXISTS "Only admins can delete properties" ON properties;
DROP POLICY IF EXISTS "Only admins can insert property history" ON property_history;
DROP POLICY IF EXISTS "Users can read own service orders" ON service_orders;
DROP POLICY IF EXISTS "Only admins can update service orders" ON service_orders;

CREATE POLICY "Only admins can insert properties"
  ON properties FOR INSERT
  WITH CHECK (public.is_admin());

CREATE POLICY "Only admins can update properties"
  ON properties FOR UPDATE
  USING (public.is_admin());

CREATE POLICY "Only admins can delete properties"
  ON properties FOR DELETE
  USING (public.is_admin());

CREATE POLICY "Only admins can insert property history"
  ON property_history FOR INSERT
  WITH CHECK (public.is_admin());

CREATE POLICY "Users can read own service orders"
  ON service_orders FOR SELECT
  USING (auth.uid() = user_id OR public.is_admin());

CREATE POLICY "Only admins can update service orders"
  ON service_orders FOR UPDATE
  USING (public.is_admin());

-- ----------------------------------------------------------------------------
-- 3. Admin read policies for tables that previously only allowed self-reads
-- ----------------------------------------------------------------------------

CREATE POLICY "Admins can read all users"
  ON users FOR SELECT
  USING (public.is_admin());

CREATE POLICY "Admins can read all search profiles"
  ON search_profiles FOR SELECT
  USING (public.is_admin());

CREATE POLICY "Admins can read all favorites"
  ON favorites FOR SELECT
  USING (public.is_admin());

CREATE POLICY "Admins can read all alerts"
  ON alerts FOR SELECT
  USING (public.is_admin());
