
-- Add slug to weddings
ALTER TABLE public.weddings ADD COLUMN IF NOT EXISTS slug text;

-- Backfill slug from couple_names where null
UPDATE public.weddings
SET slug = regexp_replace(
  lower(translate(couple_names,
    'ÁÀÃÂÄÉÈÊËÍÌÎÏÓÒÕÔÖÚÙÛÜÇáàãâäéèêëíìîïóòõôöúùûüç&',
    'AAAAAEEEEIIIIOOOOOUUUUCaaaaaeeeeiiiioooooo uuuuce'
  )),
  '[^a-z0-9]+', '-', 'g'
) || '-' || substr(id::text, 1, 6)
WHERE slug IS NULL;

ALTER TABLE public.weddings ALTER COLUMN slug SET NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS weddings_slug_unique ON public.weddings(slug);

-- Link testimonials to weddings (optional)
ALTER TABLE public.testimonials ADD COLUMN IF NOT EXISTS wedding_id uuid;
CREATE INDEX IF NOT EXISTS testimonials_wedding_id_idx ON public.testimonials(wedding_id);
