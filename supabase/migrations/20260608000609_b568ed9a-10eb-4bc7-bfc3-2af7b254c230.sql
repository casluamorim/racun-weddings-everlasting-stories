CREATE TABLE public.gallery_design_presets (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  design_settings JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_by UUID,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.gallery_design_presets TO authenticated;
GRANT ALL ON public.gallery_design_presets TO service_role;

ALTER TABLE public.gallery_design_presets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage design presets"
ON public.gallery_design_presets
FOR ALL
USING (public.is_admin())
WITH CHECK (public.is_admin());

CREATE TRIGGER set_gallery_design_presets_updated_at
BEFORE UPDATE ON public.gallery_design_presets
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();