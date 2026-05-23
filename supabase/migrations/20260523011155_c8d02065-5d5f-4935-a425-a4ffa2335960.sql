UPDATE public.weddings SET is_published = true WHERE is_published = false;
ALTER TABLE public.weddings ALTER COLUMN is_published SET DEFAULT true;