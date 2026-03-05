DROP POLICY IF EXISTS "Public can view photos of published weddings" ON public.portfolio_photos;
CREATE POLICY "Public can view portfolio photos"
ON public.portfolio_photos
FOR SELECT
USING (
  wedding_id IS NULL
  OR EXISTS (
    SELECT 1 FROM weddings WHERE weddings.id = portfolio_photos.wedding_id AND weddings.is_published = true
  )
);