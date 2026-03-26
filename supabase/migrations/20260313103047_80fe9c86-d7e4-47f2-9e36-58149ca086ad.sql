CREATE OR REPLACE FUNCTION public.aggregate_customer_profile(p_user_id uuid DEFAULT NULL::uuid, p_visitor_id text DEFAULT NULL::text, p_crm_user_id text DEFAULT NULL::text)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_profile_id UUID;
  v_crm_lead_id UUID;
  v_linked_visitor_ids TEXT[];
  v_last_aggregated_at TIMESTAMPTZ;
  v_existing_engagement JSONB;
  v_existing_viewed_projects UUID[];
  v_existing_viewed_blogs UUID[];
  v_existing_favorite_projects UUID[];
  v_delta_engagement JSONB;
  v_delta_viewed_projects UUID[];
  v_delta_viewed_blogs UUID[];
  v_delta_favorite_projects UUID[];
  v_merged_engagement JSONB;
  v_merged_viewed_projects UUID[];
  v_merged_viewed_blogs UUID[];
  v_merged_favorite_projects UUID[];
  v_inferred JSONB;
  v_has_new_filters BOOLEAN;
  v_is_first_run BOOLEAN;
  v_total_time NUMERIC;
  v_total_page_views BIGINT;
BEGIN
  IF p_user_id IS NOT NULL THEN
    SELECT id, linked_visitor_ids INTO v_crm_lead_id, v_linked_visitor_ids
    FROM public.crm_leads WHERE user_id = p_user_id;
  END IF;
  
  IF v_crm_lead_id IS NULL AND p_visitor_id IS NOT NULL THEN
    SELECT id, linked_visitor_ids INTO v_crm_lead_id, v_linked_visitor_ids
    FROM public.crm_leads
    WHERE p_visitor_id = ANY(linked_visitor_ids) OR visitor_id = p_visitor_id;
  END IF;
  
  IF v_linked_visitor_ids IS NULL THEN
    v_linked_visitor_ids := ARRAY[]::TEXT[];
  END IF;
  IF p_visitor_id IS NOT NULL AND NOT p_visitor_id = ANY(v_linked_visitor_ids) THEN
    v_linked_visitor_ids := array_append(v_linked_visitor_ids, p_visitor_id);
  END IF;

  IF p_user_id IS NOT NULL THEN
    INSERT INTO public.customer_profiles (user_id, crm_lead_id, linked_visitor_ids)
    VALUES (p_user_id, v_crm_lead_id, v_linked_visitor_ids)
    ON CONFLICT (user_id) DO UPDATE SET
      crm_lead_id = COALESCE(customer_profiles.crm_lead_id, EXCLUDED.crm_lead_id),
      linked_visitor_ids = EXCLUDED.linked_visitor_ids
    RETURNING id, last_aggregated_at, 
      COALESCE(engagement_data, '{}'::jsonb),
      COALESCE(viewed_projects, '{}'),
      COALESCE(viewed_blog_posts, '{}'),
      COALESCE(favorite_projects, '{}')
    INTO v_profile_id, v_last_aggregated_at, v_existing_engagement, v_existing_viewed_projects, v_existing_viewed_blogs, v_existing_favorite_projects;
  ELSIF p_visitor_id IS NOT NULL THEN
    INSERT INTO public.customer_profiles (visitor_id, crm_lead_id, linked_visitor_ids)
    VALUES (p_visitor_id, v_crm_lead_id, v_linked_visitor_ids)
    ON CONFLICT (visitor_id) DO UPDATE SET
      crm_lead_id = COALESCE(customer_profiles.crm_lead_id, EXCLUDED.crm_lead_id),
      linked_visitor_ids = EXCLUDED.linked_visitor_ids
    RETURNING id, last_aggregated_at,
      COALESCE(engagement_data, '{}'::jsonb),
      COALESCE(viewed_projects, '{}'),
      COALESCE(viewed_blog_posts, '{}'),
      COALESCE(favorite_projects, '{}')
    INTO v_profile_id, v_last_aggregated_at, v_existing_engagement, v_existing_viewed_projects, v_existing_viewed_blogs, v_existing_favorite_projects;
  ELSE
    RETURN;
  END IF;
  
  IF v_profile_id IS NULL THEN
    SELECT id, last_aggregated_at, 
      COALESCE(engagement_data, '{}'::jsonb),
      COALESCE(viewed_projects, '{}'),
      COALESCE(viewed_blog_posts, '{}'),
      COALESCE(favorite_projects, '{}')
    INTO v_profile_id, v_last_aggregated_at, v_existing_engagement, v_existing_viewed_projects, v_existing_viewed_blogs, v_existing_favorite_projects
    FROM public.customer_profiles 
    WHERE (user_id = p_user_id AND p_user_id IS NOT NULL)
       OR (visitor_id = p_visitor_id AND p_visitor_id IS NOT NULL);
  END IF;

  v_is_first_run := (v_last_aggregated_at IS NULL);

  SELECT 
    jsonb_build_object(
      'delta_visits', COUNT(DISTINCT DATE(occurred_at)),
      'delta_page_views', COUNT(*) FILTER (WHERE event_name = 'page_view'),
      'delta_project_views', COUNT(*) FILTER (WHERE event_name IN ('page_view', 'project_view') AND event_params->>'project_id' IS NOT NULL),
      'delta_blog_views', COUNT(*) FILTER (
        WHERE event_name IN ('page_view', 'blog_view', 'blog_finished_reading') 
        AND (event_params->>'blog_post_id' IS NOT NULL OR event_params->>'blog_post_slug' IS NOT NULL)
      ),
      'delta_story_views', COUNT(*) FILTER (WHERE event_name = 'page_view' AND path LIKE '/klantverhalen/%'),
      'delta_time_on_site', COALESCE(SUM(time_spent_seconds) FILTER (WHERE time_spent_seconds > 0), 0),
      'delta_time_pages_count', COUNT(*) FILTER (WHERE time_spent_seconds > 0),
      'delta_time_pages_sum', COALESCE(SUM(time_spent_seconds) FILTER (WHERE time_spent_seconds > 0), 0),
      'delta_time_project_count', COUNT(*) FILTER (
        WHERE time_spent_seconds > 0 
        AND (path LIKE '/project/%' OR path LIKE '/projecten/%') 
        AND path NOT LIKE '/projecten/gemeente%'
      ),
      'delta_time_project_sum', COALESCE(SUM(time_spent_seconds) FILTER (
        WHERE time_spent_seconds > 0 
        AND (path LIKE '/project/%' OR path LIKE '/projecten/%') 
        AND path NOT LIKE '/projecten/gemeente%'
      ), 0),
      'last_visit_at', MAX(occurred_at),
      'first_visit_at', MIN(occurred_at)
    ),
    ARRAY_AGG(DISTINCT (event_params->>'project_id')::uuid) FILTER (
      WHERE event_name IN ('page_view', 'project_view') AND event_params->>'project_id' IS NOT NULL
    ),
    ARRAY_AGG(DISTINCT (event_params->>'blog_post_id')::uuid) FILTER (
      WHERE event_params->>'blog_post_id' IS NOT NULL
    ),
    ARRAY_AGG(DISTINCT (event_params->>'project_id')::uuid) FILTER (
      WHERE event_name = 'project_favorited' AND event_params->>'project_id' IS NOT NULL
    ),
    bool_or(event_name = 'filter_applied')
  INTO v_delta_engagement, v_delta_viewed_projects, v_delta_viewed_blogs, v_delta_favorite_projects, v_has_new_filters
  FROM public.tracking_events
  WHERE ((user_id = p_user_id AND p_user_id IS NOT NULL)
      OR visitor_id = ANY(v_linked_visitor_ids))
    AND (v_is_first_run OR occurred_at > v_last_aggregated_at);

  IF v_delta_engagement IS NULL OR (
    COALESCE((v_delta_engagement->>'delta_page_views')::int, 0) = 0
    AND COALESCE((v_delta_engagement->>'delta_project_views')::int, 0) = 0
    AND COALESCE((v_delta_engagement->>'delta_blog_views')::int, 0) = 0
    AND COALESCE((v_delta_engagement->>'delta_story_views')::int, 0) = 0
    AND COALESCE((v_delta_engagement->>'delta_visits')::int, 0) = 0
  ) THEN
    UPDATE public.customer_profiles
    SET last_aggregated_at = NOW(), updated_at = NOW()
    WHERE id = v_profile_id;
    RETURN;
  END IF;

  v_total_time := COALESCE((v_existing_engagement->>'total_time_on_site_seconds')::numeric, 0) 
                + COALESCE((v_delta_engagement->>'delta_time_on_site')::numeric, 0);
  v_total_page_views := COALESCE((v_existing_engagement->>'total_page_views')::bigint, 0) 
                      + COALESCE((v_delta_engagement->>'delta_page_views')::bigint, 0);

  v_merged_engagement := jsonb_build_object(
    'total_visits', COALESCE((v_existing_engagement->>'total_visits')::int, 0) + COALESCE((v_delta_engagement->>'delta_visits')::int, 0),
    'total_page_views', v_total_page_views,
    'total_project_views', COALESCE((v_existing_engagement->>'total_project_views')::int, 0) + COALESCE((v_delta_engagement->>'delta_project_views')::int, 0),
    'total_blog_views', COALESCE((v_existing_engagement->>'total_blog_views')::int, 0) + COALESCE((v_delta_engagement->>'delta_blog_views')::int, 0),
    'total_story_views', COALESCE((v_existing_engagement->>'total_story_views')::int, 0) + COALESCE((v_delta_engagement->>'delta_story_views')::int, 0),
    'total_time_on_site_seconds', v_total_time,
    'avg_time_per_page', CASE WHEN v_total_page_views > 0 THEN ROUND(v_total_time / v_total_page_views, 1) ELSE 0 END,
    'avg_time_per_project', CASE 
      WHEN (COALESCE((v_existing_engagement->>'_time_project_count')::int, 0) + COALESCE((v_delta_engagement->>'delta_time_project_count')::int, 0)) > 0
      THEN ROUND(
        (COALESCE((v_existing_engagement->>'_time_project_sum')::numeric, 0) + COALESCE((v_delta_engagement->>'delta_time_project_sum')::numeric, 0))
        / (COALESCE((v_existing_engagement->>'_time_project_count')::int, 0) + COALESCE((v_delta_engagement->>'delta_time_project_count')::int, 0))
      , 1)
      ELSE 0
    END,
    'last_visit_at', GREATEST(
      (v_existing_engagement->>'last_visit_at')::timestamptz,
      (v_delta_engagement->>'last_visit_at')::timestamptz
    ),
    'first_visit_at', LEAST(
      COALESCE((v_existing_engagement->>'first_visit_at')::timestamptz, (v_delta_engagement->>'first_visit_at')::timestamptz),
      (v_delta_engagement->>'first_visit_at')::timestamptz
    ),
    'engagement_depth', CASE
      WHEN v_total_time > 1800 THEN 'very_high'
      WHEN v_total_time > 900 THEN 'high'
      WHEN v_total_time > 300 THEN 'medium'
      ELSE 'low'
    END,
    '_time_project_count', COALESCE((v_existing_engagement->>'_time_project_count')::int, 0) + COALESCE((v_delta_engagement->>'delta_time_project_count')::int, 0),
    '_time_project_sum', COALESCE((v_existing_engagement->>'_time_project_sum')::numeric, 0) + COALESCE((v_delta_engagement->>'delta_time_project_sum')::numeric, 0)
  );

  SELECT ARRAY(SELECT DISTINCT unnest FROM unnest(
    array_cat(v_existing_viewed_projects, COALESCE(v_delta_viewed_projects, '{}'))
  ) WHERE unnest IS NOT NULL)
  INTO v_merged_viewed_projects;

  SELECT ARRAY(SELECT DISTINCT unnest FROM unnest(
    array_cat(v_existing_viewed_blogs, COALESCE(v_delta_viewed_blogs, '{}'))
  ) WHERE unnest IS NOT NULL)
  INTO v_merged_viewed_blogs;

  SELECT ARRAY(SELECT DISTINCT unnest FROM unnest(
    array_cat(v_existing_favorite_projects, COALESCE(v_delta_favorite_projects, '{}'))
  ) WHERE unnest IS NOT NULL)
  INTO v_merged_favorite_projects;

  IF v_is_first_run OR COALESCE(v_has_new_filters, false) THEN
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
    filter_events AS (
      SELECT event_params->'filters' as filters
      FROM public.tracking_events
      WHERE event_name = 'filter_applied'
        AND ((user_id = p_user_id AND p_user_id IS NOT NULL)
          OR visitor_id = ANY(v_linked_visitor_ids))
    ),
    filter_budgets AS (
      SELECT
        MIN((filters->>'price_min')::numeric) FILTER (WHERE filters->>'price_min' IS NOT NULL) as min_budget,
        MAX((filters->>'price_max')::numeric) FILTER (WHERE filters->>'price_max' IS NOT NULL) as max_budget
      FROM filter_events
    ),
    filter_cities AS (
      SELECT ARRAY_AGG(DISTINCT city) as cities
      FROM filter_events, LATERAL jsonb_array_elements_text(COALESCE(filters->'cities', '[]'::jsonb)) AS city
    ),
    filter_regions AS (
      SELECT ARRAY_AGG(DISTINCT region) as regions
      FROM filter_events, LATERAL jsonb_array_elements_text(COALESCE(filters->'regions', '[]'::jsonb)) AS region
    ),
    filter_property_types AS (
      SELECT ARRAY_AGG(DISTINCT pt) as property_types
      FROM filter_events, LATERAL jsonb_array_elements_text(COALESCE(filters->'property_types', '[]'::jsonb)) AS pt
    ),
    filter_bedrooms AS (
      SELECT ARRAY_AGG(DISTINCT br) as bedrooms
      FROM filter_events, LATERAL jsonb_array_elements_text(COALESCE(filters->'bedrooms', '[]'::jsonb)) AS br
    )
    SELECT jsonb_build_object(
      'budget_min', COALESCE(
        (SELECT min_budget FROM filter_budgets), 
        CASE WHEN (SELECT avg_price FROM project_stats) IS NOT NULL THEN ((SELECT avg_price FROM project_stats) * 0.8)::int ELSE null END
      ),
      'budget_max', COALESCE(
        (SELECT max_budget FROM filter_budgets),
        CASE WHEN (SELECT avg_price FROM project_stats) IS NOT NULL THEN ((SELECT avg_price FROM project_stats) * 1.2)::int ELSE null END
      ),
      'common_cities', COALESCE(
        (SELECT cities FROM filter_cities WHERE cities IS NOT NULL AND array_length(cities, 1) > 0),
        (SELECT cities FROM project_stats),
        ARRAY[]::text[]
      ),
      'common_regions', COALESCE(
        (SELECT regions FROM filter_regions WHERE regions IS NOT NULL AND array_length(regions, 1) > 0),
        (SELECT regions FROM project_stats),
        ARRAY[]::text[]
      ),
      'property_types', COALESCE(
        (SELECT property_types FROM filter_property_types WHERE property_types IS NOT NULL AND array_length(property_types, 1) > 0),
        ARRAY[]::text[]
      ),
      'avg_bedrooms', (SELECT bedrooms[1] FROM filter_bedrooms WHERE bedrooms IS NOT NULL AND array_length(bedrooms, 1) > 0)
    ) INTO v_inferred;
  END IF;
  
  UPDATE public.customer_profiles
  SET 
    engagement_data = v_merged_engagement,
    inferred_preferences = CASE WHEN v_inferred IS NOT NULL THEN v_inferred ELSE inferred_preferences END,
    viewed_projects = COALESCE(v_merged_viewed_projects, '{}'),
    viewed_blog_posts = COALESCE(v_merged_viewed_blogs, '{}'),
    favorite_projects = COALESCE(v_merged_favorite_projects, '{}'),
    linked_visitor_ids = v_linked_visitor_ids,
    crm_lead_id = COALESCE(crm_lead_id, v_crm_lead_id),
    last_aggregated_at = NOW(),
    updated_at = NOW()
  WHERE id = v_profile_id;
END;
$function$