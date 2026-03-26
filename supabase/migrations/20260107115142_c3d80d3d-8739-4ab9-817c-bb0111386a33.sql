-- FASE 1: Database Migraties

-- Stap 1.1: Verwijder NOT NULL constraint van crm_user_id
ALTER TABLE crm_leads ALTER COLUMN crm_user_id DROP NOT NULL;

-- Stap 1.2: Verwijder de problematische FK constraint op visitor_id
ALTER TABLE crm_leads 
DROP CONSTRAINT IF EXISTS fk_crm_leads_customer_profiles;

-- FASE 2: Update aggregate_customer_profile functie
-- Verwijder crm_user_id dependency, gebruik alleen user_id + linked_visitor_ids

CREATE OR REPLACE FUNCTION public.aggregate_customer_profile(
  p_user_id uuid DEFAULT NULL::uuid, 
  p_visitor_id text DEFAULT NULL::text, 
  p_crm_user_id text DEFAULT NULL::text  -- Behouden voor backwards compatibility, maar genegeerd
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_profile_id UUID;
  v_crm_lead_id UUID;
  v_engagement JSONB;
  v_inferred JSONB;
  v_viewed_projects UUID[];
  v_viewed_blogs UUID[];
  v_favorite_projects UUID[];
  v_linked_visitor_ids TEXT[];
  v_project_engagement JSONB;
BEGIN
  -- STAP 1: Zoek crm_lead via user_id (primair) of visitor_id (secundair)
  IF p_user_id IS NOT NULL THEN
    SELECT id, linked_visitor_ids INTO v_crm_lead_id, v_linked_visitor_ids
    FROM public.crm_leads
    WHERE user_id = p_user_id;
  END IF;
  
  -- Fallback: zoek via visitor_id in linked_visitor_ids
  IF v_crm_lead_id IS NULL AND p_visitor_id IS NOT NULL THEN
    SELECT id, linked_visitor_ids INTO v_crm_lead_id, v_linked_visitor_ids
    FROM public.crm_leads
    WHERE p_visitor_id = ANY(linked_visitor_ids)
       OR visitor_id = p_visitor_id;
  END IF;
  
  -- Zorg dat linked_visitor_ids array bevat huidige visitor_id
  IF v_linked_visitor_ids IS NULL THEN
    v_linked_visitor_ids := ARRAY[]::TEXT[];
  END IF;
  
  IF p_visitor_id IS NOT NULL AND NOT p_visitor_id = ANY(v_linked_visitor_ids) THEN
    v_linked_visitor_ids := array_append(v_linked_visitor_ids, p_visitor_id);
  END IF;

  -- STAP 2: Get or create customer_profile
  IF p_user_id IS NOT NULL THEN
    INSERT INTO public.customer_profiles (user_id, crm_lead_id, linked_visitor_ids)
    VALUES (p_user_id, v_crm_lead_id, v_linked_visitor_ids)
    ON CONFLICT (user_id) DO UPDATE SET
      crm_lead_id = COALESCE(customer_profiles.crm_lead_id, EXCLUDED.crm_lead_id),
      linked_visitor_ids = EXCLUDED.linked_visitor_ids
    RETURNING id INTO v_profile_id;
  ELSIF p_visitor_id IS NOT NULL THEN
    INSERT INTO public.customer_profiles (visitor_id, crm_lead_id, linked_visitor_ids)
    VALUES (p_visitor_id, v_crm_lead_id, v_linked_visitor_ids)
    ON CONFLICT (visitor_id) DO UPDATE SET
      crm_lead_id = COALESCE(customer_profiles.crm_lead_id, EXCLUDED.crm_lead_id),
      linked_visitor_ids = EXCLUDED.linked_visitor_ids
    RETURNING id INTO v_profile_id;
  ELSE
    RETURN;
  END IF;
  
  IF v_profile_id IS NULL THEN
    SELECT id INTO v_profile_id 
    FROM public.customer_profiles 
    WHERE (user_id = p_user_id AND p_user_id IS NOT NULL)
       OR (visitor_id = p_visitor_id AND p_visitor_id IS NOT NULL);
  END IF;

  -- STAP 3: Aggregate engagement metrics van ALLE linked visitor_ids
  SELECT jsonb_build_object(
    'total_visits', COUNT(DISTINCT DATE(occurred_at)),
    'total_page_views', COUNT(*) FILTER (WHERE event_name = 'page_view'),
    'total_project_views', COUNT(*) FILTER (WHERE event_name IN ('page_view', 'project_view') AND event_params->>'project_id' IS NOT NULL),
    'total_blog_views', COUNT(*) FILTER (
      WHERE event_name IN ('page_view', 'blog_view', 'blog_finished_reading') 
      AND (event_params->>'blog_post_id' IS NOT NULL OR event_params->>'blog_post_slug' IS NOT NULL)
    ),
    'total_story_views', COUNT(*) FILTER (WHERE event_name = 'page_view' AND path LIKE '/klantverhalen/%'),
    'avg_time_per_page', COALESCE(AVG(time_spent_seconds) FILTER (WHERE time_spent_seconds > 0), 0),
    'last_visit_at', MAX(occurred_at),
    'first_visit_at', MIN(occurred_at),
    'total_time_on_site_seconds', COALESCE(SUM(time_spent_seconds) FILTER (WHERE time_spent_seconds > 0), 0),
    'avg_time_per_project', COALESCE(
      AVG(time_spent_seconds) FILTER (
        WHERE time_spent_seconds > 0 
        AND (path LIKE '/project/%' OR path LIKE '/projecten/%') 
        AND path NOT LIKE '/projecten/gemeente%'
      ), 
      0
    ),
    'repeat_project_views', (
      SELECT COUNT(*) FROM (
        SELECT event_params->>'project_id'
        FROM public.tracking_events te
        WHERE (te.user_id = p_user_id AND p_user_id IS NOT NULL)
          OR te.visitor_id = ANY(v_linked_visitor_ids)
        GROUP BY event_params->>'project_id'
        HAVING COUNT(*) > 1
      ) sub
    ),
    'engagement_depth', CASE
      WHEN COALESCE(SUM(time_spent_seconds) FILTER (WHERE time_spent_seconds > 0), 0) > 1800 THEN 'very_high'
      WHEN COALESCE(SUM(time_spent_seconds) FILTER (WHERE time_spent_seconds > 0), 0) > 900 THEN 'high'
      WHEN COALESCE(SUM(time_spent_seconds) FILTER (WHERE time_spent_seconds > 0), 0) > 300 THEN 'medium'
      ELSE 'low'
    END
  ) INTO v_engagement
  FROM public.tracking_events
  WHERE (user_id = p_user_id AND p_user_id IS NOT NULL)
     OR visitor_id = ANY(v_linked_visitor_ids);
  
  -- STAP 4: Get viewed projects
  SELECT ARRAY_AGG(DISTINCT (event_params->>'project_id')::uuid)
  INTO v_viewed_projects
  FROM public.tracking_events
  WHERE event_name IN ('page_view', 'project_view')
    AND event_params->>'project_id' IS NOT NULL
    AND ((user_id = p_user_id AND p_user_id IS NOT NULL)
      OR visitor_id = ANY(v_linked_visitor_ids));
  
  -- STAP 5: Get viewed blogs
  SELECT ARRAY_AGG(DISTINCT (event_params->>'blog_post_id')::uuid)
  INTO v_viewed_blogs
  FROM public.tracking_events
  WHERE event_params->>'blog_post_id' IS NOT NULL
    AND ((user_id = p_user_id AND p_user_id IS NOT NULL)
      OR visitor_id = ANY(v_linked_visitor_ids));
  
  -- STAP 6: Get favorited projects
  SELECT ARRAY_AGG(DISTINCT (event_params->>'project_id')::uuid)
  INTO v_favorite_projects
  FROM public.tracking_events
  WHERE event_name = 'project_favorited'
    AND event_params->>'project_id' IS NOT NULL
    AND ((user_id = p_user_id AND p_user_id IS NOT NULL)
      OR visitor_id = ANY(v_linked_visitor_ids));
  
  -- STAP 7: Infer preferences
  WITH project_stats AS (
    SELECT 
      AVG((event_params->>'project_price')::numeric) as avg_price,
      ARRAY_AGG(DISTINCT event_params->>'project_city') FILTER (WHERE event_params->>'project_city' IS NOT NULL) as cities,
      ARRAY_AGG(DISTINCT event_params->>'project_region') FILTER (WHERE event_params->>'project_region' IS NOT NULL) as regions
    FROM public.tracking_events
    WHERE event_params->>'project_id' IS NOT NULL
      AND ((user_id = p_user_id AND p_user_id IS NOT NULL)
        OR visitor_id = ANY(v_linked_visitor_ids))
  ),
  filter_stats AS (
    SELECT
      MIN((event_params->'filters'->>'price_min')::numeric) FILTER (WHERE event_params->'filters'->>'price_min' IS NOT NULL) as min_budget_filter,
      MAX((event_params->'filters'->>'price_max')::numeric) FILTER (WHERE event_params->'filters'->>'price_max' IS NOT NULL) as max_budget_filter,
      ARRAY_AGG(DISTINCT city) FILTER (WHERE city IS NOT NULL) as filter_cities,
      ARRAY_AGG(DISTINCT region) FILTER (WHERE region IS NOT NULL) as filter_regions,
      ARRAY_AGG(DISTINCT property_type) FILTER (WHERE property_type IS NOT NULL) as filter_property_types,
      ARRAY_AGG(DISTINCT bedroom) FILTER (WHERE bedroom IS NOT NULL) as filter_bedrooms
    FROM public.tracking_events
    CROSS JOIN LATERAL jsonb_array_elements_text(COALESCE(event_params->'filters'->'cities', '[]'::jsonb)) AS city
    CROSS JOIN LATERAL jsonb_array_elements_text(COALESCE(event_params->'filters'->'regions', '[]'::jsonb)) AS region
    CROSS JOIN LATERAL jsonb_array_elements_text(COALESCE(event_params->'filters'->'property_types', '[]'::jsonb)) AS property_type
    CROSS JOIN LATERAL jsonb_array_elements_text(COALESCE(event_params->'filters'->'bedrooms', '[]'::jsonb)) AS bedroom
    WHERE event_name = 'filter_applied'
      AND ((user_id = p_user_id AND p_user_id IS NOT NULL)
        OR visitor_id = ANY(v_linked_visitor_ids))
  )
  SELECT jsonb_build_object(
    'budget_min', COALESCE(
      (SELECT min_budget_filter FROM filter_stats), 
      CASE WHEN (SELECT avg_price FROM project_stats) IS NOT NULL THEN ((SELECT avg_price FROM project_stats) * 0.8)::int ELSE null END
    ),
    'budget_max', COALESCE(
      (SELECT max_budget_filter FROM filter_stats),
      CASE WHEN (SELECT avg_price FROM project_stats) IS NOT NULL THEN ((SELECT avg_price FROM project_stats) * 1.2)::int ELSE null END
    ),
    'common_cities', COALESCE(
      (SELECT filter_cities FROM filter_stats WHERE filter_cities IS NOT NULL AND array_length(filter_cities, 1) > 0),
      (SELECT cities FROM project_stats),
      ARRAY[]::text[]
    ),
    'common_regions', COALESCE(
      (SELECT filter_regions FROM filter_stats WHERE filter_regions IS NOT NULL AND array_length(filter_regions, 1) > 0),
      (SELECT regions FROM project_stats),
      ARRAY[]::text[]
    ),
    'property_types', COALESCE(
      (SELECT filter_property_types FROM filter_stats WHERE filter_property_types IS NOT NULL AND array_length(filter_property_types, 1) > 0),
      ARRAY[]::text[]
    ),
    'avg_bedrooms', (
      SELECT bedroom FROM filter_stats 
      CROSS JOIN LATERAL unnest(filter_bedrooms) AS bedroom
      LIMIT 1
    )
  ) INTO v_inferred
  FROM project_stats, filter_stats;
  
  -- STAP 8: Update customer_profile
  UPDATE public.customer_profiles
  SET 
    engagement_data = COALESCE(v_engagement, '{}'::jsonb),
    inferred_preferences = COALESCE(v_inferred, inferred_preferences),
    viewed_projects = COALESCE(v_viewed_projects, '{}'),
    viewed_blog_posts = COALESCE(v_viewed_blogs, '{}'),
    favorite_projects = COALESCE(v_favorite_projects, '{}'),
    linked_visitor_ids = v_linked_visitor_ids,
    crm_lead_id = COALESCE(crm_lead_id, v_crm_lead_id),
    last_aggregated_at = NOW(),
    updated_at = NOW()
  WHERE id = v_profile_id;
END;
$function$;