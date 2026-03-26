-- Fix functions missing search_path setting
-- This prevents potential SQL injection via search_path manipulation

-- 1. Fix link_visitor_to_user function
CREATE OR REPLACE FUNCTION public.link_visitor_to_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Link existing visitor data to new user
  UPDATE public.customer_profiles
  SET user_id = NEW.id
  WHERE visitor_id IN (
    SELECT visitor_id FROM public.crm_leads WHERE user_id = NEW.id
  )
  AND user_id IS NULL;
  
  RETURN NEW;
END;
$$;

-- 2. Fix sync_ghl_appointment_to_conversation function
CREATE OR REPLACE FUNCTION public.sync_ghl_appointment_to_conversation()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Only sync if summary is published and has content
  IF NEW.is_summary_published = true AND NEW.summary_full IS NOT NULL THEN
    INSERT INTO public.conversations (
      crm_lead_id,
      source_type,
      source_id,
      raw_notes,
      anonymized_notes,
      sentiment,
      processed
    )
    VALUES (
      NEW.crm_lead_id,
      'ghl_appointment',
      NEW.id::text,
      NEW.summary_full,
      NEW.summary_full,
      CASE NEW.summary_category
        WHEN 'positief' THEN 'positive'
        WHEN 'negatief' THEN 'negative'
        ELSE 'neutral'
      END,
      true
    )
    ON CONFLICT (source_type, source_id) DO UPDATE SET
      raw_notes = EXCLUDED.raw_notes,
      anonymized_notes = EXCLUDED.anonymized_notes,
      sentiment = EXCLUDED.sentiment;
  END IF;
  
  RETURN NEW;
END;
$$;

-- 3. Fix sync_ghl_note_to_conversation function
CREATE OR REPLACE FUNCTION public.sync_ghl_note_to_conversation()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Sync GHL notes to conversations for insight analysis
  INSERT INTO public.conversations (
    crm_lead_id,
    source_type,
    source_id,
    raw_notes,
    processed
  )
  VALUES (
    NEW.crm_lead_id,
    'ghl_note',
    NEW.id::text,
    NEW.body,
    false
  )
  ON CONFLICT (source_type, source_id) DO UPDATE SET
    raw_notes = EXCLUDED.raw_notes;
  
  RETURN NEW;
END;
$$;

-- 4. Fix sync_manual_event_to_conversation function
CREATE OR REPLACE FUNCTION public.sync_manual_event_to_conversation()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Only sync if summary is published and has content
  IF NEW.is_summary_published = true AND NEW.summary_full IS NOT NULL THEN
    INSERT INTO public.conversations (
      crm_lead_id,
      source_type,
      source_id,
      raw_notes,
      anonymized_notes,
      sentiment,
      processed
    )
    VALUES (
      NEW.crm_lead_id,
      'manual_event',
      NEW.id::text,
      NEW.summary_full,
      NEW.summary_full,
      CASE NEW.summary_category
        WHEN 'positief' THEN 'positive'
        WHEN 'negatief' THEN 'negative'
        ELSE 'neutral'
      END,
      true
    )
    ON CONFLICT (source_type, source_id) DO UPDATE SET
      raw_notes = EXCLUDED.raw_notes,
      anonymized_notes = EXCLUDED.anonymized_notes,
      sentiment = EXCLUDED.sentiment;
  END IF;
  
  RETURN NEW;
END;
$$;

-- 5. Fix update_insights_updated_at function
CREATE OR REPLACE FUNCTION public.update_insights_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- 6. Fix upsert_insight function (there are 2 with same name - overloads)
-- First, get the existing function signatures and recreate them
DROP FUNCTION IF EXISTS public.upsert_insight(text, text, text, text, text, text, text, text);
DROP FUNCTION IF EXISTS public.upsert_insight(text, text, text, text, text, text, text);

CREATE OR REPLACE FUNCTION public.upsert_insight(
  p_label text,
  p_raw_quote text,
  p_normalized_insight text,
  p_type text,
  p_theme text DEFAULT NULL,
  p_subtheme text DEFAULT NULL,
  p_impact_score text DEFAULT NULL,
  p_suggested_archetype text DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_id uuid;
BEGIN
  -- Try to find existing insight with same normalized text
  SELECT id INTO v_id
  FROM public.insights
  WHERE normalized_insight = p_normalized_insight
  LIMIT 1;
  
  IF v_id IS NOT NULL THEN
    -- Update existing insight, increment frequency
    UPDATE public.insights
    SET 
      frequency = COALESCE(frequency, 1) + 1,
      updated_at = now(),
      theme = COALESCE(p_theme, theme),
      subtheme = COALESCE(p_subtheme, subtheme),
      impact_score = COALESCE(p_impact_score, impact_score),
      suggested_archetype = COALESCE(p_suggested_archetype, suggested_archetype)
    WHERE id = v_id;
  ELSE
    -- Insert new insight
    INSERT INTO public.insights (
      label,
      raw_quote,
      normalized_insight,
      type,
      theme,
      subtheme,
      impact_score,
      suggested_archetype,
      frequency
    )
    VALUES (
      p_label,
      p_raw_quote,
      p_normalized_insight,
      p_type,
      p_theme,
      p_subtheme,
      p_impact_score,
      p_suggested_archetype,
      1
    )
    RETURNING id INTO v_id;
  END IF;
  
  RETURN v_id;
END;
$$;