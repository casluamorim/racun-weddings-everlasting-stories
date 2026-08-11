ALTER TABLE public.blog_posts
  ADD COLUMN IF NOT EXISTS category text NOT NULL DEFAULT 'geral',
  ADD COLUMN IF NOT EXISTS tags text[] NOT NULL DEFAULT '{}'::text[];

CREATE INDEX IF NOT EXISTS blog_posts_category_idx ON public.blog_posts (category);

CREATE TABLE IF NOT EXISTS public.blog_events (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  event_type text NOT NULL,
  post_slug text,
  path text,
  value integer,
  session_id text,
  referrer text,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

GRANT INSERT ON public.blog_events TO anon, authenticated;
GRANT SELECT ON public.blog_events TO authenticated;
GRANT ALL ON public.blog_events TO service_role;

ALTER TABLE public.blog_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can log blog events"
ON public.blog_events FOR INSERT TO anon, authenticated
WITH CHECK (
  event_type IN ('pageview','scroll','whatsapp_cta','cta_click')
  AND (post_slug IS NULL OR length(post_slug) <= 200)
  AND (path IS NULL OR length(path) <= 300)
  AND (session_id IS NULL OR length(session_id) <= 128)
  AND (referrer IS NULL OR length(referrer) <= 300)
  AND (value IS NULL OR (value >= 0 AND value <= 100))
);

CREATE POLICY "Admins can view blog events"
ON public.blog_events FOR SELECT TO authenticated
USING (public.is_admin());

CREATE INDEX IF NOT EXISTS blog_events_created_idx ON public.blog_events (created_at DESC);