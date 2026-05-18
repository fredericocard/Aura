-- ============================================================
-- 025 · Avatars storage bucket
-- Creates a public bucket for profile photos.
-- Each user uploads to {user_id}/avatar.jpg (upsert).
-- ============================================================

-- Create the bucket (public so avatar URLs are readable without auth)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'avatars',
  'avatars',
  true,
  2097152,          -- 2 MB limit
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif']
)
ON CONFLICT (id) DO NOTHING;

-- RLS: authenticated users can upload/update only their own folder
CREATE POLICY "Users can upload their own avatar"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'avatars'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

CREATE POLICY "Users can update their own avatar"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (
    bucket_id = 'avatars'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

CREATE POLICY "Users can delete their own avatar"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'avatars'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

-- Public read — anyone can view avatars via the public URL
CREATE POLICY "Avatar images are publicly readable"
  ON storage.objects FOR SELECT
  TO public
  USING (bucket_id = 'avatars');
