ALTER TABLE public.lead_nurture_actions
  ADD COLUMN action_result TEXT,
  ADD COLUMN action_result_note TEXT,
  ADD COLUMN feedback_due_at TIMESTAMPTZ;