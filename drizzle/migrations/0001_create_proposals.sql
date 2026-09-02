CREATE TABLE public.proposals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text NOT NULL UNIQUE,
  couple_names text NOT NULL,
  event_date date,
  city text,
  venue text,
  intro text,
  notes text,
  items jsonb NOT NULL DEFAULT '[]'::jsonb,
  discount numeric NOT NULL DEFAULT 0,
  valid_until date,
  media jsonb NOT NULL DEFAULT '[]'::jsonb,
  is_published boolean NOT NULL DEFAULT true,
  view_count integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.proposals TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.proposals TO authenticated;
GRANT ALL ON public.proposals TO service_role;

ALTER TABLE public.proposals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Published proposals are viewable"
ON public.proposals FOR SELECT
TO anon, authenticated
USING (is_published = true);

CREATE POLICY "Admins manage proposals"
ON public.proposals FOR ALL
TO authenticated
USING (public.is_admin())
WITH CHECK (public.is_admin());

CREATE TRIGGER update_proposals_updated_at
BEFORE UPDATE ON public.proposals
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

CREATE OR REPLACE FUNCTION public.increment_proposal_view(_slug text)
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  UPDATE public.proposals
  SET view_count = view_count + 1
  WHERE slug = _slug AND is_published = true;
$$;

REVOKE ALL ON FUNCTION public.increment_proposal_view(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.increment_proposal_view(text) TO anon, authenticated;