
-- Enum for roles
CREATE TYPE public.app_role AS ENUM ('admin', 'user');

-- Profiles table
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
  display_name TEXT,
  avatar_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- User roles table
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role app_role NOT NULL DEFAULT 'user',
  UNIQUE (user_id, role)
);
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Security definer function for role checking
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  )
$$;

CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid() AND role = 'admin'
  )
$$;

-- Auto-create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (user_id, display_name)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email));
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Update timestamp function
CREATE OR REPLACE FUNCTION public.update_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- Profiles RLS
CREATE POLICY "Users can view own profile" ON public.profiles FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Admins can view all profiles" ON public.profiles FOR SELECT USING (public.is_admin());

-- User roles RLS
CREATE POLICY "Users can view own roles" ON public.user_roles FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Admins can manage roles" ON public.user_roles FOR ALL USING (public.is_admin());

-- Weddings table
CREATE TABLE public.weddings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  couple_names TEXT NOT NULL,
  date DATE,
  city TEXT,
  venue TEXT,
  style TEXT,
  description TEXT,
  cover_photo_url TEXT,
  is_published BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.weddings ENABLE ROW LEVEL SECURITY;
CREATE TRIGGER update_weddings_updated_at BEFORE UPDATE ON public.weddings FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

CREATE POLICY "Public can view published weddings" ON public.weddings FOR SELECT USING (is_published = true);
CREATE POLICY "Admins can manage weddings" ON public.weddings FOR ALL USING (public.is_admin());

-- Portfolio photos
CREATE TABLE public.portfolio_photos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  wedding_id UUID REFERENCES public.weddings(id) ON DELETE CASCADE NOT NULL,
  photo_url TEXT NOT NULL,
  caption TEXT,
  sort_order INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.portfolio_photos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public can view photos of published weddings" ON public.portfolio_photos FOR SELECT
  USING (EXISTS (SELECT 1 FROM public.weddings WHERE id = wedding_id AND is_published = true));
CREATE POLICY "Admins can manage photos" ON public.portfolio_photos FOR ALL USING (public.is_admin());

-- Portfolio videos
CREATE TABLE public.portfolio_videos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  wedding_id UUID REFERENCES public.weddings(id) ON DELETE CASCADE,
  youtube_url TEXT NOT NULL,
  title TEXT,
  is_featured BOOLEAN NOT NULL DEFAULT false,
  sort_order INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.portfolio_videos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public can view videos" ON public.portfolio_videos FOR SELECT
  USING (wedding_id IS NULL OR EXISTS (SELECT 1 FROM public.weddings WHERE id = wedding_id AND is_published = true));
CREATE POLICY "Admins can manage videos" ON public.portfolio_videos FOR ALL USING (public.is_admin());

-- Pricing plans
CREATE TABLE public.pricing_plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  category TEXT NOT NULL CHECK (category IN ('foto', 'video', 'combo')),
  name TEXT NOT NULL,
  display_name TEXT NOT NULL,
  price TEXT NOT NULL,
  features TEXT[] NOT NULL DEFAULT '{}',
  is_highlighted BOOLEAN NOT NULL DEFAULT false,
  badge TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  sort_order INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.pricing_plans ENABLE ROW LEVEL SECURITY;
CREATE TRIGGER update_pricing_plans_updated_at BEFORE UPDATE ON public.pricing_plans FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

CREATE POLICY "Public can view active plans" ON public.pricing_plans FOR SELECT USING (is_active = true);
CREATE POLICY "Admins can manage plans" ON public.pricing_plans FOR ALL USING (public.is_admin());

-- Quotes (orçamentos)
CREATE TABLE public.quotes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  phone TEXT NOT NULL,
  wedding_date DATE,
  city TEXT,
  message TEXT,
  plan_interest TEXT,
  status TEXT NOT NULL DEFAULT 'new' CHECK (status IN ('new', 'in_conversation', 'closed', 'lost')),
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.quotes ENABLE ROW LEVEL SECURITY;
CREATE TRIGGER update_quotes_updated_at BEFORE UPDATE ON public.quotes FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

CREATE POLICY "Anyone can insert quotes" ON public.quotes FOR INSERT WITH CHECK (true);
CREATE POLICY "Admins can manage quotes" ON public.quotes FOR ALL USING (public.is_admin());

-- Reserved dates
CREATE TABLE public.reserved_dates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  date DATE NOT NULL UNIQUE,
  couple_names TEXT,
  wedding_id UUID REFERENCES public.weddings(id) ON DELETE SET NULL,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.reserved_dates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public can view reserved dates" ON public.reserved_dates FOR SELECT USING (true);
CREATE POLICY "Admins can manage dates" ON public.reserved_dates FOR ALL USING (public.is_admin());

-- Blog posts
CREATE TABLE public.blog_posts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  excerpt TEXT,
  content TEXT,
  cover_image_url TEXT,
  is_published BOOLEAN NOT NULL DEFAULT false,
  published_at TIMESTAMPTZ,
  seo_title TEXT,
  seo_description TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.blog_posts ENABLE ROW LEVEL SECURITY;
CREATE TRIGGER update_blog_posts_updated_at BEFORE UPDATE ON public.blog_posts FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

CREATE POLICY "Public can view published posts" ON public.blog_posts FOR SELECT USING (is_published = true);
CREATE POLICY "Admins can manage posts" ON public.blog_posts FOR ALL USING (public.is_admin());

-- Stories
CREATE TABLE public.stories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  wedding_id UUID REFERENCES public.weddings(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  content TEXT,
  cover_image_url TEXT,
  city TEXT,
  venue TEXT,
  wedding_date DATE,
  is_published BOOLEAN NOT NULL DEFAULT false,
  seo_title TEXT,
  seo_description TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.stories ENABLE ROW LEVEL SECURITY;
CREATE TRIGGER update_stories_updated_at BEFORE UPDATE ON public.stories FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

CREATE POLICY "Public can view published stories" ON public.stories FOR SELECT USING (is_published = true);
CREATE POLICY "Admins can manage stories" ON public.stories FOR ALL USING (public.is_admin());

-- Storage bucket for portfolio
INSERT INTO storage.buckets (id, name, public) VALUES ('portfolio', 'portfolio', true);

CREATE POLICY "Public can view portfolio files" ON storage.objects FOR SELECT USING (bucket_id = 'portfolio');
CREATE POLICY "Admins can upload portfolio files" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'portfolio' AND public.is_admin());
CREATE POLICY "Admins can update portfolio files" ON storage.objects FOR UPDATE USING (bucket_id = 'portfolio' AND public.is_admin());
CREATE POLICY "Admins can delete portfolio files" ON storage.objects FOR DELETE USING (bucket_id = 'portfolio' AND public.is_admin());

-- Seed pricing plans with current data
INSERT INTO public.pricing_plans (category, name, display_name, price, features, sort_order) VALUES
  ('foto', 'Foto Essencial', 'Essencial', 'R$ 3.200', ARRAY['Cobertura parcial do evento', 'Registro espontâneo e documental', 'Galeria online privada com fotos tratadas', 'Entrega em alta resolução'], 1),
  ('foto', 'Foto Clássico', 'Clássico', 'R$ 4.800', ARRAY['Cobertura estendida do casamento', 'Registro completo da cerimônia e recepção', 'Galeria online privada', 'Álbum digital'], 2),
  ('foto', 'Foto Signature', 'Signature', 'R$ 6.900', ARRAY['Cobertura completa do grande dia', 'Curadoria artística das imagens', 'Galeria online privada', 'Álbum premium', 'Sessão pré-casamento'], 3),
  ('video', 'Vídeo Essencial', 'Essencial', 'R$ 4.200', ARRAY['Cobertura parcial', 'Trailer cinematográfico com narrativa emocional', 'Entrega digital em alta qualidade'], 1),
  ('video', 'Vídeo Cinematográfico', 'Cinematográfico', 'R$ 5.900', ARRAY['Cobertura estendida', 'Trailer cinematográfico', 'Teaser curto para redes sociais', 'Entrega digital'], 2),
  ('video', 'Vídeo Signature', 'Signature', 'R$ 8.500', ARRAY['Cobertura completa do casamento', 'Trailer cinematográfico', 'Filme completo com storytelling personalizado', 'Entrega digital e mídia física'], 3);

INSERT INTO public.pricing_plans (category, name, display_name, price, features, is_highlighted, badge, sort_order) VALUES
  ('combo', 'Combo Clássico', 'Combo Clássico', 'R$ 9.500', ARRAY['Fotografia e vídeo com cobertura estendida', 'Galeria online completa', 'Trailer cinematográfico', 'Álbum digital'], false, NULL, 1),
  ('combo', 'Combo Signature', 'Combo Signature', 'R$ 13.900', ARRAY['Cobertura completa de fotografia e vídeo', 'Trailer + filme completo', 'Sessão pré-casamento', 'Álbum premium', 'Teasers para redes sociais'], true, 'Mais escolhido', 2);

-- Mark highlighted plans
UPDATE public.pricing_plans SET is_highlighted = true WHERE name IN ('Foto Signature', 'Vídeo Signature');
