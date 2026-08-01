ALTER TABLE public.portfolio_photos
  ADD COLUMN IF NOT EXISTS category text NOT NULL DEFAULT 'wedding',
  ADD COLUMN IF NOT EXISTS show_in_home boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS home_sort_order integer NOT NULL DEFAULT 0;

ALTER TABLE public.portfolio_videos
  ADD COLUMN IF NOT EXISTS category text NOT NULL DEFAULT 'wedding',
  ADD COLUMN IF NOT EXISTS show_in_home boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS home_sort_order integer NOT NULL DEFAULT 0;

CREATE INDEX IF NOT EXISTS portfolio_photos_home_idx ON public.portfolio_photos (show_in_home, home_sort_order);
CREATE INDEX IF NOT EXISTS portfolio_videos_home_idx ON public.portfolio_videos (show_in_home, home_sort_order);