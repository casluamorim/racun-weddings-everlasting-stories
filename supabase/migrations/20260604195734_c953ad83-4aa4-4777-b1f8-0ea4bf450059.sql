
DROP POLICY IF EXISTS "Anyone can remove own favorite by session" ON public.gallery_favorites;

CREATE OR REPLACE FUNCTION public.remove_gallery_favorite(_file_id UUID, _session_id TEXT)
RETURNS VOID LANGUAGE sql SECURITY DEFINER SET search_path = public AS $$
  DELETE FROM public.gallery_favorites
  WHERE file_id = _file_id AND session_id = _session_id;
$$;
GRANT EXECUTE ON FUNCTION public.remove_gallery_favorite(UUID, TEXT) TO anon, authenticated;

CREATE OR REPLACE FUNCTION public.get_gallery_by_token(_slug TEXT, _token TEXT)
RETURNS SETOF public.wedding_galleries
LANGUAGE sql STABLE SECURITY INVOKER SET search_path = public
AS $$
  SELECT * FROM public.wedding_galleries
  WHERE slug = _slug AND access_token = _token AND is_published = true
  LIMIT 1;
$$;
