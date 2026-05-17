-- ============================================================================
-- Jotaeme — Promote user to admin
-- ============================================================================
-- One-off script to grant admin role to a specific user.
-- The user MUST already have signed up (so a row exists in public.users).
--
-- Usage:
--   1. Sign up at /register using your email
--   2. Confirm your email (click the link Supabase sends you)
--   3. Replace tu@email.com below with your real email
--   4. Run this in the Supabase SQL Editor
-- ============================================================================

UPDATE public.users
SET role = 'admin'
WHERE email = 'tu@email.com';

-- Verify
SELECT id, email, full_name, role
FROM public.users
WHERE email = 'tu@email.com';
