CREATE OR REPLACE FUNCTION public.list_gallery_favorites(_slug text, _session_id text, _token text DEFAULT ''::text)
RETURNS TABLE(file_id uuid)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT f.file_id
  FROM public.gallery_favorites f
  JOIN public.wedding_galleries g ON g.id = f.gallery_id
  WHERE g.slug = _slug
    AND f.session_id = _session_id
    AND length(_session_id) BETWEEN 8 AND 128
    AND public.gallery_access_ok(g.id, COALESCE(_token, ''));
$$;

CREATE OR REPLACE FUNCTION public.add_gallery_favorite(_file_id uuid, _session_id text, _token text DEFAULT ''::text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  _gallery_id uuid;
BEGIN
  IF length(COALESCE(_session_id, '')) < 8 OR length(_session_id) > 128 THEN
    RAISE EXCEPTION 'invalid_session';
  END IF;

  SELECT gallery_id INTO _gallery_id FROM public.gallery_files WHERE id = _file_id;
  IF _gallery_id IS NULL OR NOT public.gallery_access_ok(_gallery_id, COALESCE(_token, '')) THEN
    RAISE EXCEPTION 'not_authorized';
  END IF;

  INSERT INTO public.gallery_favorites (gallery_id, file_id, session_id)
  VALUES (_gallery_id, _file_id, _session_id)
  ON CONFLICT DO NOTHING;
END;
$$;

CREATE OR REPLACE FUNCTION public.remove_gallery_favorite(_file_id uuid, _session_id text, _token text DEFAULT ''::text)
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  DELETE FROM public.gallery_favorites f
  WHERE f.file_id = _file_id
    AND f.session_id = _session_id
    AND length(_session_id) BETWEEN 8 AND 128
    AND public.gallery_access_ok(f.gallery_id, COALESCE(_token, ''));
$$;

REVOKE ALL ON FUNCTION public.list_gallery_favorites(text, text, text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.add_gallery_favorite(uuid, text, text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.remove_gallery_favorite(uuid, text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.list_gallery_favorites(text, text, text) TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.add_gallery_favorite(uuid, text, text) TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.remove_gallery_favorite(uuid, text, text) TO anon, authenticated, service_role;