-- Create chatbot_insights table for AI observations and suggestions
CREATE TABLE IF NOT EXISTS public.chatbot_insights (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID REFERENCES public.chat_conversations(id) ON DELETE CASCADE,
  insight_type TEXT NOT NULL CHECK (insight_type IN ('success_pattern', 'failure_pattern', 'drop_off', 'improvement_suggestion', 'weekly_report')),
  severity TEXT NOT NULL CHECK (severity IN ('info', 'warning', 'critical')),
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  suggested_fix TEXT,
  affected_step TEXT,
  frequency INTEGER DEFAULT 1,
  status TEXT NOT NULL DEFAULT 'new' CHECK (status IN ('new', 'reviewed', 'implemented', 'dismissed')),
  admin_notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create chatbot_question_metrics table for performance tracking per question type
CREATE TABLE IF NOT EXISTS public.chatbot_question_metrics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  question_type TEXT NOT NULL UNIQUE,
  total_asked INTEGER DEFAULT 0,
  total_answered INTEGER DEFAULT 0,
  drop_off_count INTEGER DEFAULT 0,
  avg_response_time_seconds FLOAT DEFAULT 0,
  success_rate FLOAT DEFAULT 0,
  last_updated TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS on both tables
ALTER TABLE public.chatbot_insights ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chatbot_question_metrics ENABLE ROW LEVEL SECURITY;

-- RLS policies for chatbot_insights
CREATE POLICY "Admins can manage insights"
  ON public.chatbot_insights
  FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Service role can manage insights"
  ON public.chatbot_insights
  FOR ALL
  USING ((auth.jwt() ->> 'role'::text) = 'service_role'::text);

-- RLS policies for chatbot_question_metrics
CREATE POLICY "Admins can view metrics"
  ON public.chatbot_question_metrics
  FOR SELECT
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Service role can manage metrics"
  ON public.chatbot_question_metrics
  FOR ALL
  USING ((auth.jwt() ->> 'role'::text) = 'service_role'::text);

-- Create indexes for better performance
CREATE INDEX idx_chatbot_insights_conversation ON public.chatbot_insights(conversation_id);
CREATE INDEX idx_chatbot_insights_status ON public.chatbot_insights(status);
CREATE INDEX idx_chatbot_insights_severity ON public.chatbot_insights(severity);
CREATE INDEX idx_chatbot_insights_created_at ON public.chatbot_insights(created_at DESC);
CREATE INDEX idx_chatbot_question_metrics_type ON public.chatbot_question_metrics(question_type);