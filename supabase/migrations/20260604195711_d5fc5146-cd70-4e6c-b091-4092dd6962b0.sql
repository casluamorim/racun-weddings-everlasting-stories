
-- Tables
CREATE TABLE public.wedding_galleries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  wedding_id UUID REFERENCES public.weddings(id) ON DELETE SET NULL,
  couple_names TEXT NOT NULL,
  event_date DATE,
  city TEXT,
  venue TEXT,
  description TEXT,
  story TEXT,
  slug TEXT NOT NULL UNIQUE,
  access_token TEXT NOT NULL UNIQUE DEFAULT encode(gen_random_bytes(24), 'hex'),
  cover_url TEXT,
  hero_video_url TEXT,
  is_published BOOLEAN NOT NULL DEFAULT false,
  show_in_portfolio BOOLEAN NOT NULL DEFAULT false,
  featured_home BOOLEAN NOT NULL DEFAULT false,
  is_password_protected BOOLEAN NOT NULL DEFAULT false,
  password_hash TEXT,
  retention_months INTEGER NOT NULL DEFAULT 12,
  keep_originals_forever BOOLEAN NOT NULL DEFAULT false,
  originals_expire_at TIMESTAMPTZ,
  originals_removed_at TIMESTAMPTZ,
  view_count INTEGER NOT NULL DEFAULT 0,
  download_count INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT ON public.wedding_galleries TO anon, authenticated;
GRANT ALL ON public.wedding_galleries TO service_role;
ALTER TABLE public.wedding_galleries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public can view published galleries"
  ON public.wedding_galleries FOR SELECT
  USING (is_published = true);

CREATE POLICY "Admins can manage galleries"
  ON public.wedding_galleries FOR ALL
  USING (is_admin());

CREATE TRIGGER trg_wedding_galleries_updated_at
  BEFORE UPDATE ON public.wedding_galleries
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- Auto compute originals_expire_at
CREATE OR REPLACE FUNCTION public.compute_gallery_expiry()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF NEW.keep_originals_forever THEN
    NEW.originals_expire_at := NULL;
  ELSIF NEW.originals_expire_at IS NULL OR
        (TG_OP = 'UPDATE' AND OLD.retention_months IS DISTINCT FROM NEW.retention_months) THEN
    NEW.originals_expire_at := now() + (NEW.retention_months || ' months')::interval;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_gallery_expiry
  BEFORE INSERT OR UPDATE OF retention_months, keep_originals_forever
  ON public.wedding_galleries
  FOR EACH ROW EXECUTE FUNCTION public.compute_gallery_expiry();

CREATE INDEX idx_galleries_slug ON public.wedding_galleries(slug);
CREATE INDEX idx_galleries_published ON public.wedding_galleries(is_published) WHERE is_published = true;
CREATE INDEX idx_galleries_expiry ON public.wedding_galleries(originals_expire_at) WHERE originals_removed_at IS NULL AND keep_originals_forever = false;

-- Files
CREATE TABLE public.gallery_files (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  gallery_id UUID NOT NULL REFERENCES public.wedding_galleries(id) ON DELETE CASCADE,
  kind TEXT NOT NULL CHECK (kind IN ('photo','video')),
  file_name TEXT NOT NULL,
  mime_type TEXT,
  size_bytes BIGINT,
  original_path TEXT,
  web_path TEXT NOT NULL,
  thumb_path TEXT,
  width INTEGER,
  height INTEGER,
  sort_order INTEGER NOT NULL DEFAULT 0,
  is_cover BOOLEAN NOT NULL DEFAULT false,
  is_hero BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT ON public.gallery_files TO anon, authenticated;
GRANT ALL ON public.gallery_files TO service_role;
ALTER TABLE public.gallery_files ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public can view files of published galleries"
  ON public.gallery_files FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.wedding_galleries g
    WHERE g.id = gallery_files.gallery_id AND g.is_published = true
  ));

CREATE POLICY "Admins can manage files"
  ON public.gallery_files FOR ALL
  USING (is_admin());

CREATE INDEX idx_files_gallery ON public.gallery_files(gallery_id, sort_order);

-- Favorites (no login)
CREATE TABLE public.gallery_favorites (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  gallery_id UUID NOT NULL REFERENCES public.wedding_galleries(id) ON DELETE CASCADE,
  file_id UUID NOT NULL REFERENCES public.gallery_files(id) ON DELETE CASCADE,
  session_id TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(file_id, session_id)
);

GRANT SELECT, INSERT, DELETE ON public.gallery_favorites TO anon, authenticated;
GRANT ALL ON public.gallery_favorites TO service_role;
ALTER TABLE public.gallery_favorites ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public can read favorites of published galleries"
  ON public.gallery_favorites FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.wedding_galleries g
    WHERE g.id = gallery_favorites.gallery_id AND g.is_published = true
  ));

CREATE POLICY "Anyone can add favorite"
  ON public.gallery_favorites FOR INSERT
  WITH CHECK (
    length(session_id) BETWEEN 8 AND 128
    AND EXISTS (
      SELECT 1 FROM public.wedding_galleries g
      WHERE g.id = gallery_favorites.gallery_id AND g.is_published = true
    )
  );

CREATE POLICY "Anyone can remove own favorite by session"
  ON public.gallery_favorites FOR DELETE
  USING (true);

-- RPC to fetch a gallery validating slug + token
CREATE OR REPLACE FUNCTION public.get_gallery_by_token(_slug TEXT, _token TEXT)
RETURNS SETOF public.wedding_galleries
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT * FROM public.wedding_galleries
  WHERE slug = _slug AND access_token = _token AND is_published = true
  LIMIT 1;
$$;

GRANT EXECUTE ON FUNCTION public.get_gallery_by_token(TEXT, TEXT) TO anon, authenticated;

-- View counter RPC
CREATE OR REPLACE FUNCTION public.increment_gallery_view(_gallery_id UUID)
RETURNS VOID LANGUAGE sql SECURITY DEFINER SET search_path = public AS $$
  UPDATE public.wedding_galleries SET view_count = view_count + 1 WHERE id = _gallery_id;
$$;
GRANT EXECUTE ON FUNCTION public.increment_gallery_view(UUID) TO anon, authenticated;
