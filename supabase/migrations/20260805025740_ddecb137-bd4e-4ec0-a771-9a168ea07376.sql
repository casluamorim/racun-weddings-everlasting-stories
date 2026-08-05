-- 1) Remove overly permissive blog-images INSERT policy (admins keep full access via "Admins can manage blog images")
DROP POLICY IF EXISTS "Service role can insert blog images" ON storage.objects;

-- 2) Trigger helper functions must not be callable through the API
REVOKE ALL ON FUNCTION public.compute_gallery_expiry() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.update_updated_at() FROM PUBLIC, anon, authenticated;

-- 3) Harden the remaining SECURITY DEFINER RPCs used by public gallery visitors
CREATE OR REPLACE FUNCTION public.increment_gallery_view(_gallery_id uuid)
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  UPDATE public.wedding_galleries
  SET view_count = view_count + 1
  WHERE id = _gallery_id
    AND is_published = true;
$function$;

CREATE OR REPLACE FUNCTION public.remove_gallery_favorite(_file_id uuid, _session_id text)
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  DELETE FROM public.gallery_favorites f
  WHERE f.file_id = _file_id
    AND f.session_id = _session_id
    AND length(_session_id) BETWEEN 8 AND 128
    AND EXISTS (
      SELECT 1 FROM public.wedding_galleries g
      WHERE g.id = f.gallery_id AND g.is_published = true
    );
$function$;