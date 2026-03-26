-- Add unique constraint on ghl_note_id (partial - only for non-null values)
CREATE UNIQUE INDEX idx_ghl_notes_unique_ghl_id ON public.ghl_contact_notes(ghl_note_id) WHERE ghl_note_id IS NOT NULL;