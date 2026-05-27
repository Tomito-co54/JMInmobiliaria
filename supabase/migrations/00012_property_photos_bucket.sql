-- ============================================================================
-- Property photos storage bucket
-- Migration: 00012_property_photos_bucket.sql
-- ============================================================================
-- Photos uploaded from the /admin property loader live here. The bucket is
-- READ-PUBLIC (so the catalog and property detail pages can render images
-- via plain URLs) and WRITE-ADMIN-ONLY (uploads happen from server actions
-- triggered by the admin form).
--
-- Layout convention: <propertyId>/<uuid>.<ext>
--   e.g. 123e4567-.../a1b2c3d4-....jpg
--
-- The photos column on properties (jsonb array of public URLs, first element
-- = portada) keeps the ordering — Storage holds the bytes, the row holds the
-- order and "primary" decision.
-- ============================================================================

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'property-photos',
  'property-photos',
  true,                                                -- public read
  10485760,                                            -- 10 MB per file
  ARRAY['image/jpeg', 'image/png', 'image/webp']
)
ON CONFLICT (id) DO NOTHING;

-- RLS policies on storage.objects (the existing global RLS is enabled).

-- Anyone can read — that's how the public catalog renders the images.
CREATE POLICY "Public can read property photos"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'property-photos');

-- Only admins (per public.is_admin() helper) can write. The bucket id check
-- is needed because this policy is on storage.objects globally.
CREATE POLICY "Admins can upload property photos"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'property-photos'
    AND public.is_admin()
  );

CREATE POLICY "Admins can update property photos"
  ON storage.objects FOR UPDATE
  USING (
    bucket_id = 'property-photos'
    AND public.is_admin()
  );

CREATE POLICY "Admins can delete property photos"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'property-photos'
    AND public.is_admin()
  );
