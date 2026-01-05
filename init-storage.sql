-- init-storage.sql
-- Script untuk membuat bucket dan policy di Supabase

-- Buat bucket 'laporan-images' (jika belum ada)
INSERT INTO storage.buckets (id, name, public)
VALUES ('laporan-images', 'laporan-images', true)
ON CONFLICT (id) DO NOTHING;

-- Policy untuk read access (public bisa lihat)
CREATE POLICY "Public can view laporan images"
ON storage.objects FOR SELECT
USING (bucket_id = 'laporan-images');

-- Policy untuk upload (authenticated users)
CREATE POLICY "Authenticated users can upload"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'laporan-images' 
  AND auth.role() = 'authenticated'
);

-- Policy untuk update (pemilik file)
CREATE POLICY "Users can update own files"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'laporan-images' 
  AND auth.uid() = owner
);

-- Policy untuk delete (pemilik file)
CREATE POLICY "Users can delete own files"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'laporan-images' 
  AND auth.uid() = owner
);