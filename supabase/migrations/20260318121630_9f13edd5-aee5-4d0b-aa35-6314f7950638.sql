
CREATE TABLE public.question_answers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  content_question_id UUID NOT NULL REFERENCES public.content_questions(id) ON DELETE CASCADE,
  conversation_id UUID NOT NULL REFERENCES public.conversations(id) ON DELETE CASCADE,
  answer_fragment TEXT NOT NULL,
  confidence INTEGER NOT NULL DEFAULT 3 CHECK (confidence >= 1 AND confidence <= 5),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(content_question_id, conversation_id, answer_fragment)
);

ALTER TABLE public.question_answers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read question_answers"
  ON public.question_answers FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated users can insert question_answers"
  ON public.question_answers FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Authenticated users can update question_answers"
  ON public.question_answers FOR UPDATE TO authenticated USING (true);

CREATE POLICY "Authenticated users can delete question_answers"
  ON public.question_answers FOR DELETE TO authenticated USING (true);
