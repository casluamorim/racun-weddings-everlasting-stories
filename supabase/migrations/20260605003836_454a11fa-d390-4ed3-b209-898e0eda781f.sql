
ALTER TABLE public.wedding_galleries
  ADD COLUMN IF NOT EXISTS design_settings jsonb NOT NULL DEFAULT '{}'::jsonb;

ALTER TABLE public.gallery_files
  ADD COLUMN IF NOT EXISTS is_pinned boolean NOT NULL DEFAULT false;

CREATE INDEX IF NOT EXISTS gallery_files_gallery_sort_idx
  ON public.gallery_files (gallery_id, is_pinned DESC, sort_order ASC);
