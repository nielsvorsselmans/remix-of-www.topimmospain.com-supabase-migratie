-- Create conversation_topics table for social proof widget
CREATE TABLE public.conversation_topics (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  topic_question TEXT NOT NULL,
  topic_category TEXT,
  discussion_count INTEGER DEFAULT 1,
  last_discussed_at TIMESTAMPTZ DEFAULT now(),
  is_active BOOLEAN DEFAULT true,
  display_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.conversation_topics ENABLE ROW LEVEL SECURITY;

-- Public read policy (anyone can see active topics)
CREATE POLICY "Anyone can read active conversation topics"
ON public.conversation_topics
FOR SELECT
USING (is_active = true);

-- Only authenticated admins can manage topics (for now, we'll manage via Supabase)
-- In the future, add admin-specific policies

-- Create updated_at trigger
CREATE TRIGGER update_conversation_topics_updated_at
BEFORE UPDATE ON public.conversation_topics
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Seed with initial topics based on common investor questions
INSERT INTO public.conversation_topics (topic_question, topic_category, discussion_count, display_order) VALUES
('Hoe vergelijk ik het rendement tussen nieuwbouw en bestaande bouw?', 'rendement', 12, 1),
('Wat als mijn hypotheekaanvraag wordt afgewezen in Spanje?', 'financiering', 9, 2),
('Hoe bescherm ik mijn investering juridisch?', 'juridisch', 8, 3),
('Welke regio past het beste bij mijn budget en wensen?', 'regio', 11, 4),
('Wat zijn de verborgen kosten bij een aankoop in Spanje?', 'financiering', 15, 5),
('Hoe werkt de verhuur en wat zijn realistische huuropbrengsten?', 'rendement', 7, 6);