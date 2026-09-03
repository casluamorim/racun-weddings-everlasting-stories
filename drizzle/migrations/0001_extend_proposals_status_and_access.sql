ALTER TABLE public.proposals
  ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'rascunho',
  ADD COLUMN IF NOT EXISTS ativo boolean NOT NULL DEFAULT true;

ALTER TABLE public.proposals
  ADD CONSTRAINT proposals_status_valid
  CHECK (status IN ('rascunho', 'enviado', 'aprovado', 'expirado'));

GRANT SELECT, INSERT, UPDATE, DELETE ON public.proposals TO authenticated;
GRANT SELECT ON public.proposals TO anon;
GRANT ALL ON public.proposals TO service_role;

DROP POLICY IF EXISTS "Published proposals are viewable" ON public.proposals;
CREATE POLICY "Active non-expired proposals are viewable"
  ON public.proposals
  FOR SELECT
  TO anon, authenticated
  USING (
    is_published = true
    AND ativo = true
    AND (valid_until IS NULL OR valid_until >= CURRENT_DATE)
  );