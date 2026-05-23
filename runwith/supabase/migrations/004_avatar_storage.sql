-- =====================================================
-- Migration 004: Avatar storage bucket
-- ユーザーのプロフィール画像用ストレージ
-- =====================================================

-- アバター用バケット作成
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'avatars',
  'avatars',
  true,
  2097152,  -- 2MB
  ARRAY['image/jpeg', 'image/png', 'image/gif', 'image/webp']
) ON CONFLICT (id) DO NOTHING;

-- 認証済みユーザーは自分のアバターをアップロード・更新可能
CREATE POLICY "avatar_upload"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'avatars'
    AND auth.uid() IS NOT NULL
    AND (storage.foldername(name))[1] = 'avatars'
  );

CREATE POLICY "avatar_update"
  ON storage.objects FOR UPDATE
  USING (
    bucket_id = 'avatars'
    AND auth.uid() IS NOT NULL
  );

-- 公開バケットなので誰でも画像を閲覧可能
CREATE POLICY "avatar_read"
  ON storage.objects FOR SELECT
  USING ( bucket_id = 'avatars' );
