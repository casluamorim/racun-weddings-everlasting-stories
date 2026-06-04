
CREATE POLICY "Public read galleries bucket"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'galleries');

CREATE POLICY "Admins upload galleries"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'galleries' AND public.is_admin());

CREATE POLICY "Admins update galleries"
  ON storage.objects FOR UPDATE
  USING (bucket_id = 'galleries' AND public.is_admin());

CREATE POLICY "Admins delete galleries"
  ON storage.objects FOR DELETE
  USING (bucket_id = 'galleries' AND public.is_admin());
