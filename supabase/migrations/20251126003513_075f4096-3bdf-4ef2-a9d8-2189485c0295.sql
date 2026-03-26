-- Create table for blog reading analytics
CREATE TABLE IF NOT EXISTS public.blog_reading_analytics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id),
  visitor_id TEXT,
  crm_user_id TEXT,
  blog_post_id UUID NOT NULL,
  blog_post_slug TEXT NOT NULL,
  blog_post_title TEXT NOT NULL,
  blog_post_category TEXT NOT NULL,
  
  -- Reading behavior metrics
  time_spent_seconds INTEGER,
  scroll_depth_percentage INTEGER,
  finished_reading BOOLEAN DEFAULT false,
  
  -- Engagement signals
  clicked_related_articles BOOLEAN DEFAULT false,
  shared_article BOOLEAN DEFAULT false,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create table for blog feedback
CREATE TABLE IF NOT EXISTS public.blog_feedback (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id),
  visitor_id TEXT,
  crm_user_id TEXT,
  blog_post_id UUID NOT NULL,
  blog_post_slug TEXT NOT NULL,
  
  -- Feedback types
  was_helpful BOOLEAN,
  rating INTEGER CHECK (rating >= 1 AND rating <= 5),
  missing_info TEXT,
  suggested_topics TEXT[],
  comment TEXT,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create table for AI-inferred interests from blog reading
CREATE TABLE IF NOT EXISTS public.blog_interest_analysis (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id),
  visitor_id TEXT,
  crm_user_id TEXT,
  
  -- AI-inferred interests
  primary_interests TEXT[],
  secondary_interests TEXT[],
  content_preferences JSONB, -- e.g. {"prefers_detailed": true, "avg_reading_time": 480}
  stage_in_journey TEXT, -- orientation, research, decision
  
  -- Supporting data
  most_read_categories TEXT[],
  most_engaged_topics TEXT[],
  total_articles_read INTEGER DEFAULT 0,
  avg_time_per_article INTEGER,
  
  last_analyzed_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.blog_reading_analytics ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.blog_feedback ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.blog_interest_analysis ENABLE ROW LEVEL SECURITY;

-- RLS Policies for blog_reading_analytics
CREATE POLICY "Anyone can track their own reading"
  ON public.blog_reading_analytics
  FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Users can view their own analytics"
  ON public.blog_reading_analytics
  FOR SELECT
  USING (auth.uid() = user_id OR visitor_id IS NOT NULL);

-- RLS Policies for blog_feedback  
CREATE POLICY "Anyone can submit feedback"
  ON public.blog_feedback
  FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Users can view their own feedback"
  ON public.blog_feedback
  FOR SELECT
  USING (auth.uid() = user_id OR visitor_id IS NOT NULL);

-- RLS Policies for blog_interest_analysis
CREATE POLICY "Users can view their own interest analysis"
  ON public.blog_interest_analysis
  FOR SELECT
  USING (auth.uid() = user_id OR visitor_id IS NOT NULL);

CREATE POLICY "System can manage interest analysis"
  ON public.blog_interest_analysis
  FOR ALL
  USING (true)
  WITH CHECK (true);

-- Indexes for performance
CREATE INDEX idx_blog_reading_analytics_user ON public.blog_reading_analytics(user_id);
CREATE INDEX idx_blog_reading_analytics_visitor ON public.blog_reading_analytics(visitor_id);
CREATE INDEX idx_blog_reading_analytics_crm ON public.blog_reading_analytics(crm_user_id);
CREATE INDEX idx_blog_reading_analytics_post ON public.blog_reading_analytics(blog_post_slug);
CREATE INDEX idx_blog_reading_analytics_created ON public.blog_reading_analytics(created_at DESC);

CREATE INDEX idx_blog_feedback_user ON public.blog_feedback(user_id);
CREATE INDEX idx_blog_feedback_visitor ON public.blog_feedback(visitor_id);
CREATE INDEX idx_blog_feedback_crm ON public.blog_feedback(crm_user_id);
CREATE INDEX idx_blog_feedback_post ON public.blog_feedback(blog_post_slug);

CREATE INDEX idx_blog_interest_analysis_user ON public.blog_interest_analysis(user_id);
CREATE INDEX idx_blog_interest_analysis_visitor ON public.blog_interest_analysis(visitor_id);
CREATE INDEX idx_blog_interest_analysis_crm ON public.blog_interest_analysis(crm_user_id);

-- Trigger for updated_at
CREATE TRIGGER update_blog_reading_analytics_updated_at
  BEFORE UPDATE ON public.blog_reading_analytics
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_blog_interest_analysis_updated_at
  BEFORE UPDATE ON public.blog_interest_analysis
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();