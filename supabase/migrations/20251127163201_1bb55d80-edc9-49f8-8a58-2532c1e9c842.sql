-- Create chatbot_feedback table for storing feedback from page-specific chatbot flows
CREATE TABLE IF NOT EXISTS public.chatbot_feedback (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  visitor_id TEXT,
  user_id UUID REFERENCES auth.users(id),
  page_type TEXT NOT NULL CHECK (page_type IN ('homepage', 'projects', 'project-detail', 'blog', 'blog-post', 'generic')),
  page_url TEXT NOT NULL,
  project_id UUID REFERENCES projects(id),
  blog_post_slug TEXT,
  feedback_data JSONB NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.chatbot_feedback ENABLE ROW LEVEL SECURITY;

-- Policy: Anyone can insert feedback (anonymous or logged in)
CREATE POLICY "Anyone can insert chatbot feedback"
ON public.chatbot_feedback
FOR INSERT
WITH CHECK (true);

-- Policy: Admins can view all feedback
CREATE POLICY "Admins can view all chatbot feedback"
ON public.chatbot_feedback
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM user_roles
    WHERE user_roles.user_id = auth.uid()
    AND user_roles.role = 'admin'
  )
);

-- Create index for faster queries
CREATE INDEX idx_chatbot_feedback_page_type ON public.chatbot_feedback(page_type);
CREATE INDEX idx_chatbot_feedback_created_at ON public.chatbot_feedback(created_at DESC);
CREATE INDEX idx_chatbot_feedback_project_id ON public.chatbot_feedback(project_id) WHERE project_id IS NOT NULL;
CREATE INDEX idx_chatbot_feedback_visitor_id ON public.chatbot_feedback(visitor_id) WHERE visitor_id IS NOT NULL;