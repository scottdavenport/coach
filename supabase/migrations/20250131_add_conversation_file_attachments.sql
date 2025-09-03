-- Add support for multiple file attachments per conversation

-- Create conversation_file_attachments junction table
CREATE TABLE conversation_file_attachments (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  conversation_id UUID REFERENCES conversations(id) ON DELETE CASCADE,
  file_id UUID REFERENCES user_uploads(id) ON DELETE CASCADE,
  attachment_order INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(conversation_id, file_id)
);

-- Add indexes for better performance
CREATE INDEX idx_conversation_file_attachments_conversation_id ON conversation_file_attachments(conversation_id);
CREATE INDEX idx_conversation_file_attachments_file_id ON conversation_file_attachments(file_id);

-- Update user_uploads table to support more file types
ALTER TABLE user_uploads 
DROP CONSTRAINT IF EXISTS user_uploads_file_type_check;

ALTER TABLE user_uploads 
ADD CONSTRAINT user_uploads_file_type_check 
CHECK (file_type IN ('image', 'document', 'screenshot', 'pdf', 'docx', 'csv', 'xlsx', 'txt', 'markdown'));

-- Add new columns for enhanced file metadata
ALTER TABLE user_uploads 
ADD COLUMN IF NOT EXISTS mime_type TEXT,
ADD COLUMN IF NOT EXISTS processing_status TEXT DEFAULT 'pending' CHECK (processing_status IN ('pending', 'processing', 'completed', 'failed')),
ADD COLUMN IF NOT EXISTS processing_error TEXT,
ADD COLUMN IF NOT EXISTS extracted_content TEXT;

-- Create conversation_insights table if it doesn't exist
CREATE TABLE IF NOT EXISTS conversation_insights (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  conversation_date DATE NOT NULL,
  message TEXT NOT NULL,
  insights TEXT[] DEFAULT '{}',
  data_types JSONB DEFAULT '{}',
  follow_up_questions TEXT[] DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable Row Level Security for new tables
ALTER TABLE conversation_file_attachments ENABLE ROW LEVEL SECURITY;
ALTER TABLE conversation_insights ENABLE ROW LEVEL SECURITY;

-- RLS Policies for conversation_file_attachments
CREATE POLICY "Users can view own conversation file attachments" ON conversation_file_attachments
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM conversations c 
      WHERE c.id = conversation_file_attachments.conversation_id 
      AND c.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert own conversation file attachments" ON conversation_file_attachments
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM conversations c 
      WHERE c.id = conversation_file_attachments.conversation_id 
      AND c.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update own conversation file attachments" ON conversation_file_attachments
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM conversations c 
      WHERE c.id = conversation_file_attachments.conversation_id 
      AND c.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete own conversation file attachments" ON conversation_file_attachments
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM conversations c 
      WHERE c.id = conversation_file_attachments.conversation_id 
      AND c.user_id = auth.uid()
    )
  );

-- RLS Policies for conversation_insights
CREATE POLICY "Users can manage own conversation insights" ON conversation_insights
  FOR ALL USING (user_id = auth.uid());

-- Add indexes for conversation_insights
CREATE INDEX idx_conversation_insights_user_id ON conversation_insights(user_id);
CREATE INDEX idx_conversation_insights_date ON conversation_insights(conversation_date);