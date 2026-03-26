
-- Add label column to snagging_inspections
ALTER TABLE public.snagging_inspections ADD COLUMN IF NOT EXISTS label TEXT NOT NULL DEFAULT 'Inspectie';

-- Add inspection_id column to snagging_voice_recordings
ALTER TABLE public.snagging_voice_recordings 
  ADD COLUMN inspection_id UUID REFERENCES public.snagging_inspections(id) ON DELETE CASCADE;

-- Migrate existing recordings
INSERT INTO public.snagging_inspections (sale_id, label, inspection_date)
SELECT DISTINCT ON (sale_id) sale_id, 'Eerste inspectie', COALESCE(MIN(created_at::date), CURRENT_DATE)
FROM public.snagging_voice_recordings
WHERE inspection_id IS NULL
GROUP BY sale_id
ON CONFLICT DO NOTHING;

UPDATE public.snagging_voice_recordings r
SET inspection_id = i.id
FROM public.snagging_inspections i
WHERE r.sale_id = i.sale_id AND r.inspection_id IS NULL;

-- Cache invalidation trigger
CREATE OR REPLACE FUNCTION public.invalidate_snagging_pdf_cache_on_inspection()
  RETURNS trigger
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path TO 'public'
AS $$
BEGIN
  DELETE FROM public.cached_pdfs 
  WHERE sale_id = COALESCE(NEW.sale_id, OLD.sale_id)
  AND pdf_type IN ('snagging-developer', 'snagging-client');
  RETURN COALESCE(NEW, OLD);
END;
$$;

DROP TRIGGER IF EXISTS trg_invalidate_snagging_pdf_on_inspection ON public.snagging_inspections;
CREATE TRIGGER trg_invalidate_snagging_pdf_on_inspection
  AFTER INSERT OR UPDATE OR DELETE ON public.snagging_inspections
  FOR EACH ROW EXECUTE FUNCTION public.invalidate_snagging_pdf_cache_on_inspection();
