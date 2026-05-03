
-- 1. Tighten quotes insert policy
DROP POLICY IF EXISTS "Anyone can insert quotes" ON public.quotes;
CREATE POLICY "Anyone can insert quotes"
ON public.quotes
FOR INSERT
TO anon, authenticated
WITH CHECK (
  length(btrim(name)) BETWEEN 1 AND 100
  AND length(btrim(phone)) BETWEEN 8 AND 20
  AND (message IS NULL OR length(message) <= 1000)
  AND (city IS NULL OR length(city) <= 150)
  AND (ceremony_location IS NULL OR length(ceremony_location) <= 150)
  AND (reception_location IS NULL OR length(reception_location) <= 150)
  AND (plan_interest IS NULL OR length(plan_interest) <= 500)
  AND (guest_count IS NULL OR (guest_count BETWEEN 1 AND 5000))
);

-- 2. Remove broad SELECT listing policies on public buckets (files still served via public URL)
DROP POLICY IF EXISTS "Public can view portfolio files" ON storage.objects;
DROP POLICY IF EXISTS "Public can view blog images" ON storage.objects;

-- 3. Revoke execute on trigger-only SECURITY DEFINER functions
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.update_updated_at() FROM PUBLIC, anon, authenticated;
