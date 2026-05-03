ALTER TABLE public.quotes
  ADD COLUMN IF NOT EXISTS ceremony_location text,
  ADD COLUMN IF NOT EXISTS reception_location text,
  ADD COLUMN IF NOT EXISTS guest_count integer;