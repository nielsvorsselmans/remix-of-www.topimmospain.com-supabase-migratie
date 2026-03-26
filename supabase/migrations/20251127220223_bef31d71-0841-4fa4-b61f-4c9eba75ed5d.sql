-- Create project_feedback table for storing visitor feedback
CREATE TABLE IF NOT EXISTS public.project_feedback (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL,
  user_id UUID REFERENCES auth.users(id),
  visitor_id TEXT,
  crm_user_id TEXT,
  rating BOOLEAN NOT NULL, -- true = found info, false = missing info
  missing_info TEXT[] DEFAULT '{}', -- array of missing information types
  additional_comment TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  
  -- Ensure at least one identifier is present
  CONSTRAINT project_feedback_identifier_check CHECK (
    user_id IS NOT NULL OR visitor_id IS NOT NULL OR crm_user_id IS NOT NULL
  )
);

-- Create index for faster queries
CREATE INDEX idx_project_feedback_project_id ON public.project_feedback(project_id);
CREATE INDEX idx_project_feedback_created_at ON public.project_feedback(created_at DESC);

-- Enable RLS
ALTER TABLE public.project_feedback ENABLE ROW LEVEL SECURITY;

-- Allow anyone to submit feedback
CREATE POLICY "Anyone can submit project feedback"
  ON public.project_feedback
  FOR INSERT
  WITH CHECK (true);

-- Users can view their own feedback
CREATE POLICY "Users can view their own feedback"
  ON public.project_feedback
  FOR SELECT
  USING (
    auth.uid() = user_id 
    OR visitor_id IS NOT NULL
  );

-- Admins can view all feedback
CREATE POLICY "Admins can view all project feedback"
  ON public.project_feedback
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_roles.user_id = auth.uid()
      AND user_roles.role = 'admin'
    )
  );