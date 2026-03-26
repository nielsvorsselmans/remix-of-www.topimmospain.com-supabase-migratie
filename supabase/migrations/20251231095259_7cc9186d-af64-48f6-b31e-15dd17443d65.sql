-- Create social_campaigns table for managing social media campaigns
CREATE TABLE public.social_campaigns (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id UUID REFERENCES public.projects(id) ON DELETE SET NULL,
  campaign_name TEXT NOT NULL,
  campaign_type TEXT NOT NULL DEFAULT 'facebook',
  trigger_word TEXT NOT NULL DEFAULT 'INFO',
  utm_campaign TEXT NOT NULL,
  facebook_post_template TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  starts_at TIMESTAMP WITH TIME ZONE,
  ends_at TIMESTAMP WITH TIME ZONE,
  total_clicks INTEGER NOT NULL DEFAULT 0,
  total_signups INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL
);

-- Create campaign_leads table for tracking leads from campaigns
CREATE TABLE public.campaign_leads (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  campaign_id UUID NOT NULL REFERENCES public.social_campaigns(id) ON DELETE CASCADE,
  crm_lead_id UUID REFERENCES public.crm_leads(id) ON DELETE SET NULL,
  visitor_id TEXT,
  source_platform TEXT NOT NULL DEFAULT 'facebook',
  clicked_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  converted_at TIMESTAMP WITH TIME ZONE,
  utm_data JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.social_campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.campaign_leads ENABLE ROW LEVEL SECURITY;

-- RLS Policies for social_campaigns
CREATE POLICY "Admins can manage social campaigns"
  ON public.social_campaigns
  FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Service role can manage social campaigns"
  ON public.social_campaigns
  FOR ALL
  USING ((auth.jwt() ->> 'role'::text) = 'service_role'::text);

-- RLS Policies for campaign_leads
CREATE POLICY "Admins can manage campaign leads"
  ON public.campaign_leads
  FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Service role can manage campaign leads"
  ON public.campaign_leads
  FOR ALL
  USING ((auth.jwt() ->> 'role'::text) = 'service_role'::text);

CREATE POLICY "Anyone can insert campaign leads"
  ON public.campaign_leads
  FOR INSERT
  WITH CHECK (true);

-- Create indexes for performance
CREATE INDEX idx_social_campaigns_project_id ON public.social_campaigns(project_id);
CREATE INDEX idx_social_campaigns_utm_campaign ON public.social_campaigns(utm_campaign);
CREATE INDEX idx_social_campaigns_is_active ON public.social_campaigns(is_active);
CREATE INDEX idx_campaign_leads_campaign_id ON public.campaign_leads(campaign_id);
CREATE INDEX idx_campaign_leads_visitor_id ON public.campaign_leads(visitor_id);

-- Create trigger for updated_at
CREATE TRIGGER update_social_campaigns_updated_at
  BEFORE UPDATE ON public.social_campaigns
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();