CREATE OR REPLACE FUNCTION public.get_gallery_by_token(_slug text, _token text)
RETURNS SETOF public.wedding_galleries
LANGUAGE sql
STABLE
SET search_path TO 'public'
AS $$
  SELECT * FROM public.wedding_galleries
  WHERE slug = _slug
    AND is_published = true
    AND (_token IS NULL OR _token = '' OR access_token = _token)
  LIMIT 1;
$$;