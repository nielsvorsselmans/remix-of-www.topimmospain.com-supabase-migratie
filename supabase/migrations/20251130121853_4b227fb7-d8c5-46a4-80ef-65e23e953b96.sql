-- =====================================================
-- STAP 1: Migreer ontbrekende records naar customer_profiles
-- =====================================================

-- Migreer visitor_preferences (16 missing records)
INSERT INTO public.customer_profiles (
  visitor_id,
  linked_visitor_ids,
  inferred_preferences,
  created_at,
  updated_at
)
SELECT 
  vp.visitor_id,
  ARRAY[vp.visitor_id] as linked_visitor_ids,
  jsonb_build_object(
    'budget_min', vp.inferred_budget_min,
    'budget_max', vp.inferred_budget_max,
    'common_cities', COALESCE(vp.inferred_cities, ARRAY[]::text[]),
    'common_regions', COALESCE(vp.inferred_regions, ARRAY[]::text[]),
    'property_types', COALESCE(vp.last_used_property_types, ARRAY[]::text[]),
    'avg_bedrooms', (
      SELECT bedroom 
      FROM unnest(COALESCE(vp.inferred_bedrooms, ARRAY[]::integer[])) AS bedroom 
      LIMIT 1
    )
  ) as inferred_preferences,
  vp.created_at,
  vp.updated_at
FROM public.visitor_preferences vp
WHERE NOT EXISTS (
  SELECT 1 FROM public.customer_profiles cp 
  WHERE cp.visitor_id = vp.visitor_id 
    OR vp.visitor_id = ANY(cp.linked_visitor_ids)
)
ON CONFLICT (visitor_id) DO NOTHING;

-- Migreer user_preferences (5 missing records)
INSERT INTO public.customer_profiles (
  user_id,
  visitor_id,
  linked_visitor_ids,
  inferred_preferences,
  explicit_preferences,
  created_at,
  updated_at
)
SELECT 
  up.user_id,
  NULL as visitor_id,
  ARRAY[]::text[] as linked_visitor_ids,
  jsonb_build_object(
    'budget_min', up.budget_min,
    'budget_max', up.budget_max,
    'common_cities', COALESCE(up.last_used_cities, ARRAY[]::text[]),
    'common_regions', ARRAY[]::text[],
    'property_types', COALESCE(up.last_used_property_types, ARRAY[]::text[])
  ) as inferred_preferences,
  jsonb_build_object(
    'budget_min', up.budget_min,
    'budget_max', up.budget_max,
    'preferred_regions', COALESCE(up.preferred_regions, ARRAY[]::text[]),
    'preferred_cities', ARRAY[]::text[]
  ) as explicit_preferences,
  up.created_at,
  up.updated_at
FROM public.user_preferences up
WHERE NOT EXISTS (
  SELECT 1 FROM public.customer_profiles cp 
  WHERE cp.user_id = up.user_id
)
ON CONFLICT (user_id) DO NOTHING;

-- =====================================================
-- STAP 2: Drop oude tabellen
-- =====================================================

-- Drop visitor_preferences table
DROP TABLE IF EXISTS public.visitor_preferences CASCADE;

-- Drop user_preferences table  
DROP TABLE IF EXISTS public.user_preferences CASCADE;

-- =====================================================
-- STAP 3: Trigger database aggregation voor nieuwe records
-- =====================================================

-- Force aggregation voor alle customer_profiles zonder data_completeness_score
DO $$
DECLARE
  profile_record RECORD;
BEGIN
  FOR profile_record IN 
    SELECT user_id, visitor_id, crm_user_id 
    FROM public.customer_profiles 
    WHERE data_completeness_score IS NULL OR data_completeness_score = 0
  LOOP
    PERFORM public.aggregate_customer_profile(
      profile_record.user_id,
      profile_record.visitor_id,
      profile_record.crm_user_id
    );
  END LOOP;
END $$;