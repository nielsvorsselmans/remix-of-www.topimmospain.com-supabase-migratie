-- Create a function to generate display_title based on property types and city
CREATE OR REPLACE FUNCTION public.generate_project_display_title(
  p_property_types text[],
  p_city text
)
RETURNS text
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  v_translated text[];
  v_pluralized text[];
  v_type text;
  v_translated_type text;
  v_pluralized_type text;
  v_unique_types text[];
BEGIN
  -- Return empty if no city
  IF p_city IS NULL OR p_city = '' THEN
    RETURN NULL;
  END IF;
  
  -- Return 'Diverse woningen in City' if no property types
  IF p_property_types IS NULL OR array_length(p_property_types, 1) IS NULL THEN
    RETURN 'Diverse woningen in ' || p_city;
  END IF;
  
  -- Get unique translated types
  v_unique_types := ARRAY(SELECT DISTINCT unnest(p_property_types));
  v_translated := ARRAY[]::text[];
  v_pluralized := ARRAY[]::text[];
  
  FOREACH v_type IN ARRAY v_unique_types
  LOOP
    -- Translate property type to Dutch
    v_translated_type := CASE lower(trim(v_type))
      WHEN 'apartment' THEN 'Appartement'
      WHEN 'townhouse' THEN 'Rijwoning'
      WHEN 'town house' THEN 'Rijwoning'
      WHEN 'villa' THEN 'Villa'
      WHEN 'penthouse' THEN 'Penthouse'
      WHEN 'bungalow' THEN 'Bungalow'
      WHEN 'duplex' THEN 'Duplex'
      WHEN 'studio' THEN 'Studio'
      WHEN 'house' THEN 'Huis'
      WHEN 'detached' THEN 'Vrijstaand'
      WHEN 'semi-detached' THEN 'Halfvrijstaand'
      WHEN 'semi detached' THEN 'Halfvrijstaand'
      WHEN 'semidetached' THEN 'Halfvrijstaand'
      WHEN 'ground floor apartment' THEN 'Begane grond appartement'
      WHEN 'ground floor bungalow' THEN 'Begane grond bungalow'
      WHEN 'top floor bungalow' THEN 'Bovenverdieping bungalow'
      WHEN 'quad' THEN 'Hoekwoning'
      WHEN 'semi penthouse' THEN 'Semi-penthouse'
      WHEN 'duplex penthouse' THEN 'Duplex penthouse'
      WHEN 'terraced' THEN 'Tussenwoning'
      WHEN 'finca' THEN 'Finca'
      WHEN 'country house' THEN 'Landhuis'
      ELSE initcap(v_type)
    END;
    
    -- Pluralize the translated type
    v_pluralized_type := CASE v_translated_type
      WHEN 'Appartement' THEN 'Appartementen'
      WHEN 'Rijwoning' THEN 'Rijwoningen'
      WHEN 'Villa' THEN 'Villa''s'
      WHEN 'Penthouse' THEN 'Penthouses'
      WHEN 'Bungalow' THEN 'Bungalows'
      WHEN 'Duplex' THEN 'Duplexen'
      WHEN 'Studio' THEN 'Studio''s'
      WHEN 'Huis' THEN 'Huizen'
      WHEN 'Vrijstaand' THEN 'Vrijstaande woningen'
      WHEN 'Halfvrijstaand' THEN 'Halfvrijstaande woningen'
      WHEN 'Begane grond appartement' THEN 'Begane grond appartementen'
      WHEN 'Begane grond bungalow' THEN 'Begane grond bungalows'
      WHEN 'Bovenverdieping bungalow' THEN 'Bovenverdieping bungalows'
      WHEN 'Hoekwoning' THEN 'Hoekwoningen'
      WHEN 'Semi-penthouse' THEN 'Semi-penthouses'
      WHEN 'Duplex penthouse' THEN 'Duplex penthouses'
      WHEN 'Tussenwoning' THEN 'Tussenwoningen'
      WHEN 'Finca' THEN 'Finca''s'
      WHEN 'Landhuis' THEN 'Landhuizen'
      ELSE v_translated_type || 's'
    END;
    
    v_pluralized := array_append(v_pluralized, v_pluralized_type);
  END LOOP;
  
  -- Generate title based on number of unique types
  IF array_length(v_pluralized, 1) = 1 THEN
    RETURN v_pluralized[1] || ' in ' || p_city;
  ELSIF array_length(v_pluralized, 1) = 2 THEN
    RETURN v_pluralized[1] || ' en ' || v_pluralized[2] || ' in ' || p_city;
  ELSE
    RETURN 'Diverse woningen in ' || p_city;
  END IF;
END;
$$;

-- Update all existing projects with generated display_title (only if display_title is null or empty)
UPDATE public.projects
SET display_title = generate_project_display_title(property_types, city)
WHERE (display_title IS NULL OR display_title = '')
  AND city IS NOT NULL
  AND city != '';