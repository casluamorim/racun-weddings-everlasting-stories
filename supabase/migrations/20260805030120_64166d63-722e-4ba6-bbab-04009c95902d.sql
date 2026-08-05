-- 1) Access sessions granted only after a successful password check
CREATE TABLE IF NOT EXISTS public.gallery_access_sessions (
  token text PRIMARY KEY,
  gallery_id uuid NOT NULL REFERENCES public.wedding_galleries(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz NOT NULL DEFAULT now() + interval '12 hours'
);

GRANT ALL ON public.gallery_access_sessions TO service_role;
ALTER TABLE public.gallery_access_sessions ENABLE ROW LEVEL SECURITY;
-- No policies: reachable only through SECURITY DEFINER functions / service_role

CREATE INDEX IF NOT EXISTS gallery_access_sessions_gallery_idx
  ON public.gallery_access_sessions(gallery_id);

-- 2) Admin-only password management (stores a bcrypt hash, never the password)
CREATE OR REPLACE FUNCTION public.set_gallery_password(_gallery_id uuid, _password text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'extensions'
AS $$
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'not_authorized';
  END IF;

  IF _password IS NULL OR length(_password) = 0 THEN
    UPDATE public.wedding_galleries
    SET password_hash = NULL, is_password_protected = false
    WHERE id = _gallery_id;
    DELETE FROM public.gallery_access_sessions WHERE gallery_id = _gallery_id;
    RETURN;
  END IF;

  IF length(_password) < 4 OR length(_password) > 128 THEN
    RAISE EXCEPTION 'invalid_password_length';
  END IF;

  UPDATE public.wedding_galleries
  SET password_hash = extensions.crypt(_password, extensions.gen_salt('bf', 10)),
      is_password_protected = true
  WHERE id = _gallery_id;

  -- invalidate previously issued access sessions
  DELETE FROM public.gallery_access_sessions WHERE gallery_id = _gallery_id;
END;
$$;

REVOKE ALL ON FUNCTION public.set_gallery_password(uuid, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.set_gallery_password(uuid, text) TO authenticated, service_role;

-- 3) Visitor password verification -> short lived access token
CREATE OR REPLACE FUNCTION public.verify_gallery_password(_slug text, _password text)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'extensions'
AS $$
DECLARE
  g record;
  new_token text;
BEGIN
  IF _slug IS NULL OR _password IS NULL OR length(_password) > 128 THEN
    RETURN NULL;
  END IF;

  SELECT id, password_hash, is_password_protected
  INTO g
  FROM public.wedding_galleries
  WHERE slug = _slug AND is_published = true
  LIMIT 1;

  IF g.id IS NULL OR NOT g.is_password_protected OR g.password_hash IS NULL THEN
    RETURN NULL;
  END IF;

  IF extensions.crypt(_password, g.password_hash) <> g.password_hash THEN
    RETURN NULL;
  END IF;

  DELETE FROM public.gallery_access_sessions WHERE expires_at < now();

  new_token := encode(extensions.gen_random_bytes(24), 'hex');
  INSERT INTO public.gallery_access_sessions (token, gallery_id)
  VALUES (new_token, g.id);

  RETURN new_token;
END;
$$;

REVOKE ALL ON FUNCTION public.verify_gallery_password(text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.verify_gallery_password(text, text) TO anon, authenticated, service_role;

-- 4) Central access check used by RLS and the gallery RPCs
CREATE OR REPLACE FUNCTION public.gallery_access_ok(_gallery_id uuid, _token text)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.wedding_galleries g
    WHERE g.id = _gallery_id
      AND g.is_published = true
      AND (
        g.is_password_protected = false
        OR EXISTS (
          SELECT 1 FROM public.gallery_access_sessions s
          WHERE s.gallery_id = g.id
            AND s.token = _token
            AND s.expires_at > now()
        )
      )
  );
$$;

REVOKE ALL ON FUNCTION public.gallery_access_ok(uuid, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.gallery_access_ok(uuid, text) TO anon, authenticated, service_role;

-- 5) get_gallery_by_token now actually enforces the password
CREATE OR REPLACE FUNCTION public.get_gallery_by_token(_slug text, _token text DEFAULT ''::text)
RETURNS TABLE(id uuid, wedding_id uuid, couple_names text, event_date date, city text, venue text, description text, story text, slug text, cover_url text, hero_video_url text, is_published boolean, show_in_portfolio boolean, featured_home boolean, is_password_protected boolean, retention_months integer, keep_originals_forever boolean, originals_expire_at timestamp with time zone, originals_removed_at timestamp with time zone, view_count integer, download_count integer, created_at timestamp with time zone, updated_at timestamp with time zone, design_settings jsonb)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT
    g.id, g.wedding_id, g.couple_names, g.event_date, g.city, g.venue, g.description, g.story,
    g.slug, g.cover_url, g.hero_video_url, g.is_published, g.show_in_portfolio, g.featured_home,
    g.is_password_protected, g.retention_months, g.keep_originals_forever, g.originals_expire_at,
    g.originals_removed_at, g.view_count, g.download_count, g.created_at, g.updated_at, g.design_settings
  FROM public.wedding_galleries g
  WHERE g.slug = _slug
    AND g.is_published = true
    AND public.gallery_access_ok(g.id, COALESCE(_token, ''))
  LIMIT 1;
$$;

-- Lightweight probe so the UI can show a password prompt without leaking content
CREATE OR REPLACE FUNCTION public.gallery_requires_password(_slug text)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT g.is_password_protected
  FROM public.wedding_galleries g
  WHERE g.slug = _slug AND g.is_published = true
  LIMIT 1;
$$;

REVOKE ALL ON FUNCTION public.gallery_requires_password(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.gallery_requires_password(text) TO anon, authenticated, service_role;

-- 6) File metadata: public reads only for galleries without a password
DROP POLICY IF EXISTS "Public can view files of published galleries" ON public.gallery_files;
CREATE POLICY "Public can view files of open published galleries"
ON public.gallery_files FOR SELECT
USING (EXISTS (
  SELECT 1 FROM public.wedding_galleries g
  WHERE g.id = gallery_files.gallery_id
    AND g.is_published = true
    AND g.is_password_protected = false
));

CREATE OR REPLACE FUNCTION public.get_gallery_files_by_token(_slug text, _token text DEFAULT ''::text)
RETURNS SETOF public.gallery_files
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT f.*
  FROM public.gallery_files f
  JOIN public.wedding_galleries g ON g.id = f.gallery_id
  WHERE g.slug = _slug
    AND g.is_published = true
    AND public.gallery_access_ok(g.id, COALESCE(_token, ''))
  ORDER BY f.is_pinned DESC, f.sort_order;
$$;

REVOKE ALL ON FUNCTION public.get_gallery_files_by_token(text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_gallery_files_by_token(text, text) TO anon, authenticated, service_role;

-- 7) Storage: signed URLs cannot be minted for password-protected galleries
DROP POLICY IF EXISTS "Read galleries from published only" ON storage.objects;
CREATE POLICY "Read galleries from open published only"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'galleries'
  AND EXISTS (
    SELECT 1 FROM public.wedding_galleries g
    WHERE g.is_published = true
      AND g.is_password_protected = false
      AND (storage.foldername(objects.name))[1] = (g.id)::text
  )
);

-- 8) Favorites must respect the password gate too
DROP POLICY IF EXISTS "Public can read favorites of published galleries" ON public.gallery_favorites;
CREATE POLICY "Public can read favorites of open published galleries"
ON public.gallery_favorites FOR SELECT
USING (EXISTS (
  SELECT 1 FROM public.wedding_galleries g
  WHERE g.id = gallery_favorites.gallery_id
    AND g.is_published = true
    AND g.is_password_protected = false
));

DROP POLICY IF EXISTS "Anyone can add favorite" ON public.gallery_favorites;
CREATE POLICY "Anyone can add favorite to open published galleries"
ON public.gallery_favorites FOR INSERT
WITH CHECK (
  length(session_id) >= 8 AND length(session_id) <= 128
  AND EXISTS (
    SELECT 1 FROM public.wedding_galleries g
    WHERE g.id = gallery_favorites.gallery_id
      AND g.is_published = true
      AND g.is_password_protected = false
  )
);