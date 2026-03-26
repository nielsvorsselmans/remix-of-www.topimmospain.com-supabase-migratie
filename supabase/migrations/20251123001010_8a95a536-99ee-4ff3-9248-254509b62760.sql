-- Add JSONB indexes for frequently queried metadata fields in chat_conversations
-- Index on usage_type for filtering by investment type
CREATE INDEX IF NOT EXISTS idx_chat_conversations_usage_type 
ON chat_conversations ((metadata->>'usage_type'));

-- Index on page_path for analyzing which pages generate conversations
CREATE INDEX IF NOT EXISTS idx_chat_conversations_page_path 
ON chat_conversations ((metadata->>'page_path'));

-- Index on page_url for full URL analysis
CREATE INDEX IF NOT EXISTS idx_chat_conversations_page_url 
ON chat_conversations ((metadata->>'page_url'));

-- Add JSONB indexes for frequently queried metadata fields in chat_messages
-- Index on step for analyzing conversation flow
CREATE INDEX IF NOT EXISTS idx_chat_messages_step 
ON chat_messages ((metadata->>'step'));

-- General GIN index on entire metadata for complex queries
CREATE INDEX IF NOT EXISTS idx_chat_conversations_metadata_gin 
ON chat_conversations USING gin (metadata);

CREATE INDEX IF NOT EXISTS idx_chat_messages_metadata_gin 
ON chat_messages USING gin (metadata);

-- Add comment explaining the indexes
COMMENT ON INDEX idx_chat_conversations_usage_type IS 'Speeds up queries filtering by usage_type (investment/personal/combination)';
COMMENT ON INDEX idx_chat_conversations_page_path IS 'Speeds up queries analyzing which pages generate most conversations';
COMMENT ON INDEX idx_chat_messages_step IS 'Speeds up queries analyzing conversation flow by step';