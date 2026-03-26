-- Recalculate data_completeness_score for all existing customer_profiles
-- based on their explicit_preferences (budget, preferred_regions, investment_goal, timeline, persona_type)

UPDATE customer_profiles
SET data_completeness_score = (
  SELECT 
    ROUND(
      (
        -- Budget complete (min OR max filled)
        CASE WHEN 
          (explicit_preferences->>'budget_min' IS NOT NULL AND explicit_preferences->>'budget_min' != '' AND explicit_preferences->>'budget_min' != 'null') 
          OR (explicit_preferences->>'budget_max' IS NOT NULL AND explicit_preferences->>'budget_max' != '' AND explicit_preferences->>'budget_max' != 'null')
        THEN 1 ELSE 0 END
        +
        -- preferred_regions (check if array has elements)
        CASE WHEN 
          explicit_preferences->'preferred_regions' IS NOT NULL 
          AND jsonb_typeof(explicit_preferences->'preferred_regions') = 'array'
          AND jsonb_array_length(explicit_preferences->'preferred_regions') > 0
        THEN 1 ELSE 0 END
        +
        -- investment_goal
        CASE WHEN 
          explicit_preferences->>'investment_goal' IS NOT NULL 
          AND explicit_preferences->>'investment_goal' != ''
          AND explicit_preferences->>'investment_goal' != 'null'
        THEN 1 ELSE 0 END
        +
        -- timeline
        CASE WHEN 
          explicit_preferences->>'timeline' IS NOT NULL 
          AND explicit_preferences->>'timeline' != ''
          AND explicit_preferences->>'timeline' != 'null'
        THEN 1 ELSE 0 END
        +
        -- persona_type
        CASE WHEN 
          explicit_preferences->>'persona_type' IS NOT NULL 
          AND explicit_preferences->>'persona_type' != ''
          AND explicit_preferences->>'persona_type' != 'null'
        THEN 1 ELSE 0 END
      )::float / 5 * 100
    )
)
WHERE explicit_preferences IS NOT NULL;