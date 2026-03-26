-- Create sale_video_links table (koppeling sale ↔ video)
CREATE TABLE public.sale_video_links (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  video_id UUID NOT NULL REFERENCES public.project_videos(id) ON DELETE CASCADE,
  sale_id UUID NOT NULL REFERENCES public.sales(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(video_id, sale_id)
);

-- Enable RLS
ALTER TABLE public.sale_video_links ENABLE ROW LEVEL SECURITY;

-- RLS Policies for sale_video_links
CREATE POLICY "Admins can manage sale video links"
  ON public.sale_video_links
  FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Service role can manage sale video links"
  ON public.sale_video_links
  FOR ALL
  USING ((auth.jwt() ->> 'role'::text) = 'service_role'::text);

CREATE POLICY "Customers can view their own sale video links"
  ON public.sale_video_links
  FOR SELECT
  USING (
    sale_id IN (
      SELECT s.id FROM public.sales s
      JOIN public.sale_customers sc ON sc.sale_id = s.id
      JOIN public.crm_leads cl ON cl.id = sc.crm_lead_id
      WHERE cl.user_id = auth.uid()
    )
  );

-- Create city_video_links table (koppeling city ↔ video)
CREATE TABLE public.city_video_links (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  video_id UUID NOT NULL REFERENCES public.project_videos(id) ON DELETE CASCADE,
  city TEXT NOT NULL,
  visible_public BOOLEAN NOT NULL DEFAULT true,
  visible_portal BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(video_id, city)
);

-- Enable RLS
ALTER TABLE public.city_video_links ENABLE ROW LEVEL SECURITY;

-- RLS Policies for city_video_links
CREATE POLICY "Admins can manage city video links"
  ON public.city_video_links
  FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Service role can manage city video links"
  ON public.city_video_links
  FOR ALL
  USING ((auth.jwt() ->> 'role'::text) = 'service_role'::text);

CREATE POLICY "Anyone can view public city video links"
  ON public.city_video_links
  FOR SELECT
  USING (visible_public = true);

CREATE POLICY "Portal users can view portal city video links"
  ON public.city_video_links
  FOR SELECT
  USING (visible_portal = true AND auth.uid() IS NOT NULL);

-- Create indexes for performance
CREATE INDEX idx_sale_video_links_sale_id ON public.sale_video_links(sale_id);
CREATE INDEX idx_sale_video_links_video_id ON public.sale_video_links(video_id);
CREATE INDEX idx_city_video_links_city ON public.city_video_links(city);
CREATE INDEX idx_city_video_links_video_id ON public.city_video_links(video_id);