-- =====================================================
-- CONSOLIDATED CUSTOMER PROFILES TABLE
-- =====================================================
-- Single source of truth for all customer data, aggregated from tracking_events

CREATE TABLE IF NOT EXISTS public.customer_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Identity (one of these will be set)
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,
  visitor_id TEXT UNIQUE,
  crm_user_id TEXT UNIQUE,
  
  -- Explicit preferences (from chatbot, forms)
  explicit_preferences JSONB DEFAULT '{
    "budget_min": null,
    "budget_max": null,
    "preferred_regions": [],
    "preferred_cities": [],
    "investment_goal": null,
    "timeline": null,
    "persona_type": null,
    "bedrooms_min": null,
    "bedrooms_max": null
  }'::jsonb,
  
  -- Inferred preferences (from behavior)
  inferred_preferences JSONB DEFAULT '{
    "budget_min": null,
    "budget_max": null,
    "common_cities": [],
    "common_regions": [],
    "avg_bedrooms": null,
    "property_types": []
  }'::jsonb,
  
  -- Engagement metrics
  engagement_data JSONB DEFAULT '{
    "total_visits": 0,
    "total_page_views": 0,
    "total_project_views": 0,
    "total_blog_views": 0,
    "total_story_views": 0,
    "avg_time_per_page": 0,
    "last_visit_at": null,
    "first_visit_at": null
  }'::jsonb,
  
  -- Viewed content (IDs only, details in tracking_events)
  viewed_projects UUID[] DEFAULT '{}',
  viewed_blog_posts UUID[] DEFAULT '{}',
  viewed_stories UUID[] DEFAULT '{}',
  favorite_projects UUID[] DEFAULT '{}',
  
  -- Lead qualification
  data_completeness_score INTEGER DEFAULT 0 CHECK (data_completeness_score BETWEEN 0 AND 100),
  lead_temperature TEXT CHECK (lead_temperature IN ('cold', 'warm', 'hot')),
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  last_aggregated_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Constraints
  CONSTRAINT customer_profiles_identity_check CHECK (
    (user_id IS NOT NULL)::int + 
    (visitor_id IS NOT NULL)::int + 
    (crm_user_id IS NOT NULL)::int = 1
  )
);

-- Indexes for fast lookups
CREATE INDEX idx_customer_profiles_user_id ON public.customer_profiles(user_id) WHERE user_id IS NOT NULL;
CREATE INDEX idx_customer_profiles_visitor_id ON public.customer_profiles(visitor_id) WHERE visitor_id IS NOT NULL;
CREATE INDEX idx_customer_profiles_crm_user_id ON public.customer_profiles(crm_user_id) WHERE crm_user_id IS NOT NULL;
CREATE INDEX idx_customer_profiles_temperature ON public.customer_profiles(lead_temperature);
CREATE INDEX idx_customer_profiles_last_visit ON public.customer_profiles((engagement_data->>'last_visit_at'));

-- Enable RLS
ALTER TABLE public.customer_profiles ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view own profile"
  ON public.customer_profiles FOR SELECT
  USING (
    auth.uid() = user_id OR
    visitor_id IS NOT NULL OR
    crm_user_id IS NOT NULL
  );

CREATE POLICY "Service role can manage all profiles"
  ON public.customer_profiles FOR ALL
  USING ((auth.jwt() ->> 'role'::text) = 'service_role'::text);

CREATE POLICY "Admins can view all profiles"
  ON public.customer_profiles FOR SELECT
  USING (has_role(auth.uid(), 'admin'::app_role));

-- =====================================================
-- AGGREGATION FUNCTION
-- =====================================================

CREATE OR REPLACE FUNCTION public.aggregate_customer_profile(
  p_user_id UUID DEFAULT NULL,
  p_visitor_id TEXT DEFAULT NULL,
  p_crm_user_id TEXT DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_profile_id UUID;
  v_engagement JSONB;
  v_inferred JSONB;
  v_viewed_projects UUID[];
  v_viewed_blogs UUID[];
BEGIN
  -- Get or create profile
  IF p_user_id IS NOT NULL THEN
    INSERT INTO public.customer_profiles (user_id)
    VALUES (p_user_id)
    ON CONFLICT (user_id) DO NOTHING
    RETURNING id INTO v_profile_id;
    
    IF v_profile_id IS NULL THEN
      SELECT id INTO v_profile_id FROM public.customer_profiles WHERE user_id = p_user_id;
    END IF;
  ELSIF p_visitor_id IS NOT NULL THEN
    INSERT INTO public.customer_profiles (visitor_id)
    VALUES (p_visitor_id)
    ON CONFLICT (visitor_id) DO NOTHING
    RETURNING id INTO v_profile_id;
    
    IF v_profile_id IS NULL THEN
      SELECT id INTO v_profile_id FROM public.customer_profiles WHERE visitor_id = p_visitor_id;
    END IF;
  ELSIF p_crm_user_id IS NOT NULL THEN
    INSERT INTO public.customer_profiles (crm_user_id)
    VALUES (p_crm_user_id)
    ON CONFLICT (crm_user_id) DO NOTHING
    RETURNING id INTO v_profile_id;
    
    IF v_profile_id IS NULL THEN
      SELECT id INTO v_profile_id FROM public.customer_profiles WHERE crm_user_id = p_crm_user_id;
    END IF;
  ELSE
    RETURN;
  END IF;
  
  -- Aggregate engagement metrics
  SELECT jsonb_build_object(
    'total_visits', COUNT(DISTINCT session_id),
    'total_page_views', COUNT(*) FILTER (WHERE event_name = 'page_view'),
    'total_project_views', COUNT(*) FILTER (WHERE event_name = 'page_view' AND event_params->>'project_id' IS NOT NULL),
    'total_blog_views', COUNT(*) FILTER (WHERE event_name = 'page_view' AND event_params->>'blog_post_id' IS NOT NULL),
    'total_story_views', COUNT(*) FILTER (WHERE event_name = 'page_view' AND path LIKE '/klantverhalen/%'),
    'avg_time_per_page', COALESCE(AVG(time_spent_seconds) FILTER (WHERE time_spent_seconds > 0), 0),
    'last_visit_at', MAX(occurred_at),
    'first_visit_at', MIN(occurred_at)
  ) INTO v_engagement
  FROM public.tracking_events
  WHERE (user_id = p_user_id AND p_user_id IS NOT NULL)
     OR (visitor_id = p_visitor_id AND p_visitor_id IS NOT NULL)
     OR (crm_user_id = p_crm_user_id AND p_crm_user_id IS NOT NULL);
  
  -- Get viewed projects
  SELECT ARRAY_AGG(DISTINCT (event_params->>'project_id')::uuid)
  INTO v_viewed_projects
  FROM public.tracking_events
  WHERE event_params->>'project_id' IS NOT NULL
    AND ((user_id = p_user_id AND p_user_id IS NOT NULL)
      OR (visitor_id = p_visitor_id AND p_visitor_id IS NOT NULL)
      OR (crm_user_id = p_crm_user_id AND p_crm_user_id IS NOT NULL));
  
  -- Get viewed blogs
  SELECT ARRAY_AGG(DISTINCT (event_params->>'blog_post_id')::uuid)
  INTO v_viewed_blogs
  FROM public.tracking_events
  WHERE event_params->>'blog_post_id' IS NOT NULL
    AND ((user_id = p_user_id AND p_user_id IS NOT NULL)
      OR (visitor_id = p_visitor_id AND p_visitor_id IS NOT NULL)
      OR (crm_user_id = p_crm_user_id AND p_crm_user_id IS NOT NULL));
  
  -- Infer preferences from viewed projects
  WITH project_stats AS (
    SELECT 
      AVG((event_params->>'project_price')::numeric) as avg_price,
      ARRAY_AGG(DISTINCT event_params->>'project_city') FILTER (WHERE event_params->>'project_city' IS NOT NULL) as cities,
      ARRAY_AGG(DISTINCT event_params->>'project_region') FILTER (WHERE event_params->>'project_region' IS NOT NULL) as regions
    FROM public.tracking_events
    WHERE event_params->>'project_id' IS NOT NULL
      AND ((user_id = p_user_id AND p_user_id IS NOT NULL)
        OR (visitor_id = p_visitor_id AND p_visitor_id IS NOT NULL)
        OR (crm_user_id = p_crm_user_id AND p_crm_user_id IS NOT NULL))
  )
  SELECT jsonb_build_object(
    'budget_min', CASE WHEN avg_price IS NOT NULL THEN (avg_price * 0.8)::int ELSE null END,
    'budget_max', CASE WHEN avg_price IS NOT NULL THEN (avg_price * 1.2)::int ELSE null END,
    'common_cities', COALESCE(cities, ARRAY[]::text[]),
    'common_regions', COALESCE(regions, ARRAY[]::text[]),
    'avg_bedrooms', null,
    'property_types', ARRAY[]::text[]
  ) INTO v_inferred
  FROM project_stats;
  
  -- Update profile
  UPDATE public.customer_profiles
  SET 
    engagement_data = v_engagement,
    inferred_preferences = COALESCE(v_inferred, inferred_preferences),
    viewed_projects = COALESCE(v_viewed_projects, '{}'),
    viewed_blog_posts = COALESCE(v_viewed_blogs, '{}'),
    last_aggregated_at = NOW(),
    updated_at = NOW()
  WHERE id = v_profile_id;
END;
$$;

-- =====================================================
-- TRIGGER FOR AUTO-AGGREGATION
-- =====================================================

CREATE OR REPLACE FUNCTION public.trigger_aggregate_customer_profile()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  PERFORM aggregate_customer_profile(NEW.user_id, NEW.visitor_id, NEW.crm_user_id);
  RETURN NEW;
END;
$$;

CREATE TRIGGER after_tracking_event_insert
  AFTER INSERT ON public.tracking_events
  FOR EACH ROW
  EXECUTE FUNCTION public.trigger_aggregate_customer_profile();

-- =====================================================
-- PERSONALIZED PROJECTS FUNCTION
-- =====================================================

CREATE OR REPLACE FUNCTION public.get_personalized_projects(
  p_user_id UUID DEFAULT NULL,
  p_visitor_id TEXT DEFAULT NULL,
  p_limit INTEGER DEFAULT 10
)
RETURNS TABLE (
  project_id UUID,
  match_score INTEGER,
  match_reasons TEXT[]
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_profile RECORD;
BEGIN
  -- Get customer profile
  SELECT * INTO v_profile
  FROM public.customer_profiles
  WHERE (user_id = p_user_id AND p_user_id IS NOT NULL)
     OR (visitor_id = p_visitor_id AND p_visitor_id IS NOT NULL);
  
  IF v_profile IS NULL THEN
    -- No profile, return featured projects
    RETURN QUERY
    SELECT p.id, 0 as match_score, ARRAY[]::text[] as match_reasons
    FROM public.projects p
    WHERE p.active = true
    ORDER BY p.priority DESC
    LIMIT p_limit;
    RETURN;
  END IF;
  
  -- Calculate match scores
  RETURN QUERY
  WITH project_scores AS (
    SELECT 
      p.id as pid,
      (
        -- Budget match
        CASE 
          WHEN (v_profile.inferred_preferences->>'budget_min')::numeric IS NOT NULL
           AND p.price_from >= (v_profile.inferred_preferences->>'budget_min')::numeric 
           AND p.price_to <= (v_profile.inferred_preferences->>'budget_max')::numeric
          THEN 50 ELSE 0 
        END +
        -- Region match
        CASE 
          WHEN EXISTS (
            SELECT 1 FROM jsonb_array_elements_text(v_profile.explicit_preferences->'preferred_regions') AS region
            WHERE region = p.region
          )
          THEN 40 ELSE 0 
        END +
        -- City match
        CASE 
          WHEN EXISTS (
            SELECT 1 FROM jsonb_array_elements_text(v_profile.inferred_preferences->'common_cities') AS city
            WHERE city = p.city
          )
          THEN 30 ELSE 0 
        END +
        -- Favorited
        CASE WHEN p.id = ANY(v_profile.favorite_projects) THEN 100 ELSE 0 END -
        -- Already viewed (show new content)
        CASE WHEN p.id = ANY(v_profile.viewed_projects) THEN 10 ELSE 0 END
      ) as score,
      ARRAY_REMOVE(ARRAY[
        CASE WHEN (v_profile.inferred_preferences->>'budget_min')::numeric IS NOT NULL
             AND p.price_from >= (v_profile.inferred_preferences->>'budget_min')::numeric 
             AND p.price_to <= (v_profile.inferred_preferences->>'budget_max')::numeric
             THEN 'Budget match' END,
        CASE WHEN EXISTS (
               SELECT 1 FROM jsonb_array_elements_text(v_profile.explicit_preferences->'preferred_regions') AS region
               WHERE region = p.region
             )
             THEN 'Preferred region' END,
        CASE WHEN p.id = ANY(v_profile.favorite_projects) THEN 'Favorited' END
      ], NULL) as reasons
    FROM public.projects p
    WHERE p.active = true
  )
  SELECT 
    ps.pid,
    ps.score::integer,
    ps.reasons
  FROM project_scores ps
  ORDER BY ps.score DESC, RANDOM()
  LIMIT p_limit;
END;
$$;