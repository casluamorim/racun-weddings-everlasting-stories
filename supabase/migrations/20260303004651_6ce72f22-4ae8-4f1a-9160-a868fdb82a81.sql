
-- Create blog-images storage bucket
INSERT INTO storage.buckets (id, name, public) VALUES ('blog-images', 'blog-images', true);

-- Allow public read
CREATE POLICY "Public can view blog images"
ON storage.objects FOR SELECT
USING (bucket_id = 'blog-images');

-- Admins can manage blog images
CREATE POLICY "Admins can manage blog images"
ON storage.objects FOR ALL
USING (bucket_id = 'blog-images' AND public.is_admin())
WITH CHECK (bucket_id = 'blog-images' AND public.is_admin());

-- Service role can insert (for edge function)
CREATE POLICY "Service role can insert blog images"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'blog-images');
