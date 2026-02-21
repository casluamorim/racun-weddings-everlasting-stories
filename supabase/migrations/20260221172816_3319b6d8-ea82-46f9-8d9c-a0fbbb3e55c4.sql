-- Fix weddings policies to be PERMISSIVE
DROP POLICY IF EXISTS "Public can view published weddings" ON public.weddings;
DROP POLICY IF EXISTS "Admins can manage weddings" ON public.weddings;

CREATE POLICY "Public can view published weddings"
ON public.weddings FOR SELECT
USING (is_published = true);

CREATE POLICY "Admins can manage weddings"
ON public.weddings FOR ALL
USING (is_admin());

-- Fix portfolio_photos policies to be PERMISSIVE
DROP POLICY IF EXISTS "Public can view photos of published weddings" ON public.portfolio_photos;
DROP POLICY IF EXISTS "Admins can manage photos" ON public.portfolio_photos;

CREATE POLICY "Public can view photos of published weddings"
ON public.portfolio_photos FOR SELECT
USING (EXISTS (
  SELECT 1 FROM weddings
  WHERE weddings.id = portfolio_photos.wedding_id
  AND weddings.is_published = true
));

CREATE POLICY "Admins can manage photos"
ON public.portfolio_photos FOR ALL
USING (is_admin());

-- Fix portfolio_videos policies to be PERMISSIVE
DROP POLICY IF EXISTS "Public can view videos" ON public.portfolio_videos;
DROP POLICY IF EXISTS "Admins can manage videos" ON public.portfolio_videos;

CREATE POLICY "Public can view videos"
ON public.portfolio_videos FOR SELECT
USING (wedding_id IS NULL OR EXISTS (
  SELECT 1 FROM weddings
  WHERE weddings.id = portfolio_videos.wedding_id
  AND weddings.is_published = true
));

CREATE POLICY "Admins can manage videos"
ON public.portfolio_videos FOR ALL
USING (is_admin());