
-- 1) Lock down wedding_galleries: remove broad public SELECT, replace RPC with safe (nulled sensitive cols) SECURITY DEFINER version.
DROP POLICY IF EXISTS "Public can view published galleries" ON public.wedding_galleries;

DROP FUNCTION IF EXISTS public.get_gallery_by_token(text, text);

CREATE OR REPLACE FUNCTION public.get_gallery_by_token(_slug text, _token text DEFAULT '')
RETURNS TABLE (
  id uuid,
  wedding_id uuid,
  couple_names text,
  event_date date,
  city text,
  venue text,
  description text,
  story text,
  slug text,
  cover_url text,
  hero_video_url text,
  is_published boolean,
  show_in_portfolio boolean,
  featured_home boolean,
  is_password_protected boolean,
  retention_months integer,
  keep_originals_forever boolean,
  originals_expire_at timestamptz,
  originals_removed_at timestamptz,
  view_count integer,
  download_count integer,
  created_at timestamptz,
  updated_at timestamptz,
  design_settings jsonb
)
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    g.id, g.wedding_id, g.couple_names, g.event_date, g.city, g.venue, g.description, g.story,
    g.slug, g.cover_url, g.hero_video_url, g.is_published, g.show_in_portfolio, g.featured_home,
    g.is_password_protected, g.retention_months, g.keep_originals_forever, g.originals_expire_at,
    g.originals_removed_at, g.view_count, g.download_count, g.created_at, g.updated_at, g.design_settings
  FROM public.wedding_galleries g
  WHERE g.slug = _slug
    AND g.is_published = true
  LIMIT 1;
$$;

REVOKE ALL ON FUNCTION public.get_gallery_by_token(text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_gallery_by_token(text, text) TO anon, authenticated;

-- Public-facing landing components that need to know about published galleries for portfolio/home
-- read from the `weddings` table, not `wedding_galleries`. So removing the public SELECT is safe.

-- 2) reserved_dates: only admin sees PII (couple_names / notes). Public usage doesn't exist in the app.
DROP POLICY IF EXISTS "Public can view reserved dates" ON public.reserved_dates;

-- 3) Storage bucket "galleries": restrict reads to objects under PUBLISHED galleries.
DROP POLICY IF EXISTS "Public read galleries bucket" ON storage.objects;
CREATE POLICY "Read galleries from published only"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'galleries'
  AND EXISTS (
    SELECT 1 FROM public.wedding_galleries g
    WHERE g.is_published = true
      AND (storage.foldername(name))[1] = g.id::text
  )
);

-- 4) Tighten EXECUTE on SECURITY DEFINER functions: only the roles that need them.
REVOKE ALL ON FUNCTION public.increment_gallery_view(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.increment_gallery_view(uuid) TO anon, authenticated;

REVOKE ALL ON FUNCTION public.remove_gallery_favorite(uuid, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.remove_gallery_favorite(uuid, text) TO anon, authenticated;

REVOKE ALL ON FUNCTION public.handle_new_user() FROM PUBLIC;
-- handle_new_user runs as auth trigger; only service_role/owner invokes it.

REVOKE ALL ON FUNCTION public.has_role(uuid, public.app_role) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) TO authenticated, service_role;

REVOKE ALL ON FUNCTION public.is_admin() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.is_admin() TO authenticated, service_role;
