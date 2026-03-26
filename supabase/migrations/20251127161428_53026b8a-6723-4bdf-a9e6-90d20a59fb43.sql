-- Make project_id nullable in chat_conversations table
ALTER TABLE public.chat_conversations 
ALTER COLUMN project_id DROP NOT NULL;