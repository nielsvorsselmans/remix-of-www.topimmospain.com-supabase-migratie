-- Create orientation guide items table
CREATE TABLE public.orientation_guide_items (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  pillar TEXT NOT NULL CHECK (pillar IN ('regio', 'financiering', 'juridisch', 'fiscaliteit')),
  blog_post_id UUID REFERENCES public.blog_posts(id) ON DELETE SET NULL,
  custom_title TEXT,
  custom_description TEXT,
  custom_read_time_minutes INTEGER DEFAULT 5,
  order_index INTEGER NOT NULL DEFAULT 0,
  is_required BOOLEAN NOT NULL DEFAULT false,
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create user guide progress table
CREATE TABLE public.user_guide_progress (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  visitor_id TEXT,
  guide_item_id UUID NOT NULL REFERENCES public.orientation_guide_items(id) ON DELETE CASCADE,
  started_at TIMESTAMP WITH TIME ZONE,
  completed_at TIMESTAMP WITH TIME ZONE,
  time_spent_seconds INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, guide_item_id),
  UNIQUE(visitor_id, guide_item_id)
);

-- Enable RLS
ALTER TABLE public.orientation_guide_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_guide_progress ENABLE ROW LEVEL SECURITY;

-- RLS policies for orientation_guide_items
CREATE POLICY "Anyone can view active guide items"
  ON public.orientation_guide_items
  FOR SELECT
  USING (active = true);

CREATE POLICY "Admins can manage guide items"
  ON public.orientation_guide_items
  FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role));

-- RLS policies for user_guide_progress
CREATE POLICY "Users can view own progress"
  ON public.user_guide_progress
  FOR SELECT
  USING (auth.uid() = user_id OR visitor_id IS NOT NULL);

CREATE POLICY "Users can insert own progress"
  ON public.user_guide_progress
  FOR INSERT
  WITH CHECK (auth.uid() = user_id OR visitor_id IS NOT NULL);

CREATE POLICY "Users can update own progress"
  ON public.user_guide_progress
  FOR UPDATE
  USING (auth.uid() = user_id OR visitor_id IS NOT NULL);

CREATE POLICY "Service role can manage all progress"
  ON public.user_guide_progress
  FOR ALL
  USING ((auth.jwt() ->> 'role'::text) = 'service_role'::text);

CREATE POLICY "Admins can view all progress"
  ON public.user_guide_progress
  FOR SELECT
  USING (has_role(auth.uid(), 'admin'::app_role));

-- Create indexes
CREATE INDEX idx_orientation_guide_items_pillar ON public.orientation_guide_items(pillar);
CREATE INDEX idx_orientation_guide_items_blog_post ON public.orientation_guide_items(blog_post_id);
CREATE INDEX idx_user_guide_progress_user ON public.user_guide_progress(user_id);
CREATE INDEX idx_user_guide_progress_visitor ON public.user_guide_progress(visitor_id);
CREATE INDEX idx_user_guide_progress_item ON public.user_guide_progress(guide_item_id);

-- Insert initial guide items linked to existing blog posts
INSERT INTO public.orientation_guide_items (pillar, blog_post_id, custom_title, custom_description, order_index, is_required)
SELECT 
  'regio',
  id,
  NULL,
  'Ontdek waarom een bezichtigingsreis essentieel is voor je investering',
  1,
  true
FROM public.blog_posts WHERE slug = 'bezichtigingsreis-spanje-vastgoed';

-- Financiering artikelen
INSERT INTO public.orientation_guide_items (pillar, blog_post_id, custom_title, custom_description, order_index, is_required)
SELECT 
  'financiering',
  id,
  NULL,
  'Leer of je als buitenlander een hypotheek kunt krijgen in Spanje',
  1,
  true
FROM public.blog_posts WHERE slug = 'hypotheek-buitenlander-spanje';

INSERT INTO public.orientation_guide_items (pillar, blog_post_id, custom_title, custom_description, order_index, is_required)
SELECT 
  'financiering',
  id,
  NULL,
  'Ontdek hoeveel je maximaal kunt financieren',
  2,
  false
FROM public.blog_posts WHERE slug = 'maximale-hypotheek-spanje';

INSERT INTO public.orientation_guide_items (pillar, blog_post_id, custom_title, custom_description, order_index, is_required)
SELECT 
  'financiering',
  id,
  NULL,
  'Bekijk welke documenten je nodig hebt voor je hypotheekaanvraag',
  3,
  false
FROM public.blog_posts WHERE slug = 'documenten-hypotheek-spanje';

INSERT INTO public.orientation_guide_items (pillar, blog_post_id, custom_title, custom_description, order_index, is_required)
SELECT 
  'financiering',
  id,
  NULL,
  'Leer over de voorwaarden en rentetarieven in Spanje',
  4,
  false
FROM public.blog_posts WHERE slug = 'hypotheekvoorwaarden-rentetarieven-spanje';

-- Juridisch artikelen
INSERT INTO public.orientation_guide_items (pillar, blog_post_id, custom_title, custom_description, order_index, is_required)
SELECT 
  'juridisch',
  id,
  NULL,
  'Alles over het NIE-nummer en hoe je dit verkrijgt',
  1,
  true
FROM public.blog_posts WHERE slug = 'nie-nummer-spanje';

INSERT INTO public.orientation_guide_items (pillar, blog_post_id, custom_title, custom_description, order_index, is_required)
SELECT 
  'juridisch',
  id,
  NULL,
  'Welke juridische controles worden uitgevoerd bij aankoop',
  2,
  false
FROM public.blog_posts WHERE slug = 'juridische-controles-vastgoed-spanje';

INSERT INTO public.orientation_guide_items (pillar, blog_post_id, custom_title, custom_description, order_index, is_required)
SELECT 
  'juridisch',
  id,
  NULL,
  'Op wiens naam komt de woning te staan',
  3,
  false
FROM public.blog_posts WHERE slug = 'eigendom-naam-spanje';

-- Fiscaliteit artikelen
INSERT INTO public.orientation_guide_items (pillar, blog_post_id, custom_title, custom_description, order_index, is_required)
SELECT 
  'fiscaliteit',
  id,
  NULL,
  'Welke belastingen betaal je bij aankoop van vastgoed',
  1,
  true
FROM public.blog_posts WHERE slug = 'belastingen-aankoop-spanje';

INSERT INTO public.orientation_guide_items (pillar, blog_post_id, custom_title, custom_description, order_index, is_required)
SELECT 
  'fiscaliteit',
  id,
  NULL,
  'Jaarlijkse belastingen als eigenaar in Spanje',
  2,
  false
FROM public.blog_posts WHERE slug = 'jaarlijkse-belastingen-spanje';

INSERT INTO public.orientation_guide_items (pillar, blog_post_id, custom_title, custom_description, order_index, is_required)
SELECT 
  'fiscaliteit',
  id,
  NULL,
  'Hoe werkt belasting op huurinkomsten',
  3,
  false
FROM public.blog_posts WHERE slug = 'belasting-huurinkomsten-spanje';