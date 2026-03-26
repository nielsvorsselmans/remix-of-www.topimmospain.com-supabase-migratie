-- Trigger to invalidate snagging PDF cache when recordings change
CREATE OR REPLACE FUNCTION public.invalidate_snagging_pdf_cache()
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

CREATE TRIGGER trg_invalidate_snagging_pdf_cache_insert
  AFTER INSERT ON public.snagging_voice_recordings
  FOR EACH ROW EXECUTE FUNCTION public.invalidate_snagging_pdf_cache();

CREATE TRIGGER trg_invalidate_snagging_pdf_cache_update
  AFTER UPDATE ON public.snagging_voice_recordings
  FOR EACH ROW EXECUTE FUNCTION public.invalidate_snagging_pdf_cache();

CREATE TRIGGER trg_invalidate_snagging_pdf_cache_delete
  AFTER DELETE ON public.snagging_voice_recordings
  FOR EACH ROW EXECUTE FUNCTION public.invalidate_snagging_pdf_cache();