-- Drop existing restrictive policies
DROP POLICY IF EXISTS "Admin can read chat sessions" ON public.chat_sessions;
DROP POLICY IF EXISTS "Admin can read chat messages" ON public.chat_messages;

-- Create new policies that allow authenticated users to read chat analytics
CREATE POLICY "Authenticated users can read chat sessions" 
  ON public.chat_sessions
  FOR SELECT 
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can read chat messages" 
  ON public.chat_messages
  FOR SELECT 
  USING (auth.uid() IS NOT NULL);