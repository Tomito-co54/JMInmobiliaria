-- ============================================================================
-- Block 7 — Storage bucket for service deliverables (PDFs).
--
-- Layout convention: <orderId>/<service_type>-<timestamp>.pdf
-- e.g. abc-def/cadastral_report-1700000000.pdf
--
-- RLS:
--   - user can read their own deliverables (path starts with their orderId
--     and the order's user_id matches auth.uid())
--   - admin can read all
--   - only service_role can write (uploads happen from the webhook
--     fulfillment, never from the client)
--
-- Signed URLs are generated server-side and emailed to the user, so the
-- bucket itself stays private.
-- ============================================================================

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'service-deliverables',
  'service-deliverables',
  false,
  10 * 1024 * 1024,   -- 10 MB per file
  ARRAY['application/pdf']
)
ON CONFLICT (id) DO NOTHING;

-- Drop any prior versions of these policies so the migration is idempotent.
DROP POLICY IF EXISTS "User reads own deliverables" ON storage.objects;
DROP POLICY IF EXISTS "Admin reads all deliverables" ON storage.objects;
DROP POLICY IF EXISTS "No public writes to deliverables" ON storage.objects;

-- User read policy. The path is <orderId>/..., so we split_part on '/' and
-- join back to service_orders to confirm ownership.
CREATE POLICY "User reads own deliverables"
  ON storage.objects FOR SELECT
  USING (
    bucket_id = 'service-deliverables'
    AND EXISTS (
      SELECT 1
      FROM service_orders so
      WHERE so.id::text = split_part(name, '/', 1)
        AND so.user_id = auth.uid()
    )
  );

CREATE POLICY "Admin reads all deliverables"
  ON storage.objects FOR SELECT
  USING (
    bucket_id = 'service-deliverables'
    AND EXISTS (
      SELECT 1 FROM public.users
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Writes are restricted to service_role (no policy = denied for authenticated/anon).
