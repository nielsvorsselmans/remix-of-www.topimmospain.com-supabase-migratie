-- Voeg user_id kolom toe aan chat_conversations voor authenticated users
ALTER TABLE chat_conversations 
ADD COLUMN user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE;

-- Maak index voor snelle queries op user_id
CREATE INDEX idx_chat_conversations_user_id ON chat_conversations(user_id);