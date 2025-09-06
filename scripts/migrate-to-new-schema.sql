-- =====================================================
-- NEW SCHEMA MIGRATION SCRIPT
-- =====================================================
-- This script creates the new optimized schema
-- Run this AFTER creating a backup

-- =====================================================
-- 1. CREATE NEW OPTIMIZED TABLES
-- =====================================================

-- Core user management (keep existing)
-- users table already exists and is good

-- =====================================================
-- 2. CONVERSATION SYSTEM (SIMPLIFIED)
-- =====================================================

-- Drop old conversation tables
DROP TABLE IF EXISTS conversation_file_attachments CASCADE;
DROP TABLE IF EXISTS conversation_insights CASCADE;

-- Create new simplified conversation table
CREATE TABLE conversations_new (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  message TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('user', 'assistant', 'system')),
  metadata JSONB DEFAULT '{}', -- extracted data, file references, etc.
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create conversation insights table
CREATE TABLE conversation_insights_new (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID REFERENCES conversations_new(id) ON DELETE CASCADE,
  insight_type TEXT NOT NULL, -- 'health_metric', 'goal', 'preference', 'pattern'
  data JSONB NOT NULL,
  confidence DECIMAL(3,2) DEFAULT 0.8,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- 3. HEALTH METRICS SYSTEM (STREAMLINED)
-- =====================================================

-- Drop old metric tables
DROP TABLE IF EXISTS user_metric_preferences CASCADE;
DROP TABLE IF EXISTS standard_metrics CASCADE;
DROP TABLE IF EXISTS metric_categories CASCADE;
DROP TABLE IF EXISTS user_daily_metrics CASCADE;

-- Create new simplified health metrics table
CREATE TABLE health_metrics_new (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  metric_date DATE NOT NULL,
  category TEXT NOT NULL, -- 'sleep', 'activity', 'nutrition', 'wellness', 'biometric'
  metric_name TEXT NOT NULL, -- 'sleep_duration', 'heart_rate', 'steps', etc.
  value DECIMAL(10,3),
  unit TEXT, -- 'minutes', 'bpm', 'steps', 'kg', etc.
  source TEXT NOT NULL, -- 'manual', 'oura', 'ocr', 'conversation'
  confidence DECIMAL(3,2) DEFAULT 1.0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, metric_date, category, metric_name)
);

-- =====================================================
-- 4. WORKOUT SYSTEM (CONSOLIDATED)
-- =====================================================

-- Drop old workout tables
DROP TABLE IF EXISTS workout_recommendations CASCADE;
DROP TABLE IF EXISTS workout_progress CASCADE;
DROP TABLE IF EXISTS workout_exercises CASCADE;
DROP TABLE IF EXISTS template_exercises CASCADE;
DROP TABLE IF EXISTS user_workouts CASCADE;
DROP TABLE IF EXISTS user_workout_preferences CASCADE;
DROP TABLE IF EXISTS workout_templates CASCADE;
DROP TABLE IF EXISTS exercises CASCADE;

-- Create new consolidated workout system
CREATE TABLE workouts_new (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  workout_date DATE NOT NULL,
  name TEXT NOT NULL,
  category TEXT NOT NULL, -- 'strength', 'cardio', 'flexibility', 'mixed'
  exercises JSONB NOT NULL, -- Array of exercise objects
  total_duration INTEGER, -- minutes
  notes TEXT,
  mood_before INTEGER CHECK (mood_before >= 1 AND mood_before <= 10),
  mood_after INTEGER CHECK (mood_after >= 1 AND mood_after <= 10),
  energy_before INTEGER CHECK (energy_before >= 1 AND energy_before <= 10),
  energy_after INTEGER CHECK (energy_after >= 1 AND energy_after <= 10),
  perceived_exertion INTEGER CHECK (perceived_exertion >= 1 AND perceived_exertion <= 10),
  status TEXT DEFAULT 'completed' CHECK (status IN ('completed', 'partial', 'skipped')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create workout templates table
CREATE TABLE workout_templates_new (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  category TEXT NOT NULL,
  difficulty_level INTEGER CHECK (difficulty_level >= 1 AND difficulty_level <= 5),
  estimated_duration INTEGER, -- minutes
  exercises JSONB NOT NULL, -- Array of exercise objects
  equipment_required TEXT[],
  target_audience TEXT, -- 'beginner', 'intermediate', 'advanced'
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- 5. FILE MANAGEMENT (SIMPLIFIED)
-- =====================================================

-- Drop old file tables
DROP TABLE IF EXISTS user_uploads CASCADE;

-- Create new simplified file table
CREATE TABLE files_new (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  filename TEXT NOT NULL,
  file_url TEXT NOT NULL,
  file_type TEXT NOT NULL, -- 'image', 'document', 'screenshot'
  mime_type TEXT,
  file_size INTEGER,
  processing_status TEXT DEFAULT 'pending' CHECK (processing_status IN ('pending', 'processing', 'completed', 'failed')),
  extracted_content TEXT, -- OCR text or document content
  processed_data JSONB, -- Structured data extracted
  processing_error TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  processed_at TIMESTAMPTZ
);

-- Create file-conversation relationships
CREATE TABLE conversation_files_new (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID REFERENCES conversations_new(id) ON DELETE CASCADE,
  file_id UUID REFERENCES files_new(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(conversation_id, file_id)
);

-- =====================================================
-- 6. EXTERNAL INTEGRATIONS (IMPROVED)
-- =====================================================

-- Oura tables are already good, keep them

-- =====================================================
-- 7. AI-GENERATED CONTENT
-- =====================================================

-- Drop old content tables
DROP TABLE IF EXISTS daily_narratives CASCADE;
DROP TABLE IF EXISTS weekly_summaries CASCADE;
DROP TABLE IF EXISTS monthly_trends CASCADE;
DROP TABLE IF EXISTS daily_journal CASCADE;

-- Create new daily insights table
CREATE TABLE daily_insights_new (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  insight_date DATE NOT NULL,
  insight_type TEXT NOT NULL, -- 'summary', 'recommendation', 'pattern', 'goal'
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  data_sources TEXT[], -- ['conversation', 'metrics', 'workouts', 'files']
  confidence DECIMAL(3,2) DEFAULT 0.8,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, insight_date, insight_type)
);

-- Create weekly summaries table
CREATE TABLE weekly_summaries_new (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  week_start DATE NOT NULL,
  summary TEXT NOT NULL,
  trends JSONB,
  recommendations JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, week_start)
);

-- =====================================================
-- 8. USER PREFERENCES & GOALS
-- =====================================================

-- Drop old preference tables
DROP TABLE IF EXISTS daily_goals CASCADE;
DROP TABLE IF EXISTS daily_activities CASCADE;
DROP TABLE IF EXISTS mood_tracking CASCADE;

-- Create user preferences table
CREATE TABLE user_preferences_new (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE UNIQUE,
  fitness_level TEXT DEFAULT 'beginner' CHECK (fitness_level IN ('beginner', 'intermediate', 'advanced')),
  primary_goals TEXT[], -- ['strength', 'endurance', 'flexibility', 'weight_loss']
  available_equipment TEXT[],
  preferred_workout_duration INTEGER, -- minutes
  preferred_workout_times TEXT[], -- ['morning', 'afternoon', 'evening']
  workout_frequency INTEGER, -- days per week
  injury_limitations TEXT[],
  exercise_preferences TEXT[],
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create daily goals table
CREATE TABLE daily_goals_new (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  goal_date DATE NOT NULL,
  goal_type TEXT NOT NULL CHECK (goal_type IN ('fitness', 'nutrition', 'sleep', 'wellness', 'lifestyle')),
  title TEXT NOT NULL,
  description TEXT,
  is_completed BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- 9. CREATE INDEXES FOR PERFORMANCE
-- =====================================================

-- Conversation indexes
CREATE INDEX idx_conversations_new_user_id ON conversations_new(user_id);
CREATE INDEX idx_conversations_new_created_at ON conversations_new(created_at);
CREATE INDEX idx_conversation_insights_new_conversation_id ON conversation_insights_new(conversation_id);
CREATE INDEX idx_conversation_insights_new_type ON conversation_insights_new(insight_type);

-- Health metrics indexes
CREATE INDEX idx_health_metrics_new_user_date ON health_metrics_new(user_id, metric_date);
CREATE INDEX idx_health_metrics_new_category ON health_metrics_new(category);
CREATE INDEX idx_health_metrics_new_source ON health_metrics_new(source);
CREATE INDEX idx_health_metrics_new_date_source ON health_metrics_new(metric_date, source);

-- Workout indexes
CREATE INDEX idx_workouts_new_user_date ON workouts_new(user_id, workout_date);
CREATE INDEX idx_workouts_new_category ON workouts_new(category);
CREATE INDEX idx_workouts_new_status ON workouts_new(status);
CREATE INDEX idx_workout_templates_new_category ON workout_templates_new(category);

-- File indexes
CREATE INDEX idx_files_new_user_id ON files_new(user_id);
CREATE INDEX idx_files_new_processing_status ON files_new(processing_status);
CREATE INDEX idx_files_new_created_at ON files_new(created_at);
CREATE INDEX idx_conversation_files_new_conversation_id ON conversation_files_new(conversation_id);

-- Insights indexes
CREATE INDEX idx_daily_insights_new_user_date ON daily_insights_new(user_id, insight_date);
CREATE INDEX idx_daily_insights_new_type ON daily_insights_new(insight_type);
CREATE INDEX idx_weekly_summaries_new_user_week ON weekly_summaries_new(user_id, week_start);

-- Goals indexes
CREATE INDEX idx_daily_goals_new_user_date ON daily_goals_new(user_id, goal_date);
CREATE INDEX idx_daily_goals_new_type ON daily_goals_new(goal_type);

-- =====================================================
-- 10. ENABLE ROW LEVEL SECURITY
-- =====================================================

-- Enable RLS on all new tables
ALTER TABLE conversations_new ENABLE ROW LEVEL SECURITY;
ALTER TABLE conversation_insights_new ENABLE ROW LEVEL SECURITY;
ALTER TABLE health_metrics_new ENABLE ROW LEVEL SECURITY;
ALTER TABLE workouts_new ENABLE ROW LEVEL SECURITY;
ALTER TABLE workout_templates_new ENABLE ROW LEVEL SECURITY;
ALTER TABLE files_new ENABLE ROW LEVEL SECURITY;
ALTER TABLE conversation_files_new ENABLE ROW LEVEL SECURITY;
ALTER TABLE daily_insights_new ENABLE ROW LEVEL SECURITY;
ALTER TABLE weekly_summaries_new ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_preferences_new ENABLE ROW LEVEL SECURITY;
ALTER TABLE daily_goals_new ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- 11. CREATE RLS POLICIES
-- =====================================================

-- Conversation policies
CREATE POLICY "Users can manage own conversations" ON conversations_new
  FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Users can manage own conversation insights" ON conversation_insights_new
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM conversations_new c 
      WHERE c.id = conversation_insights_new.conversation_id 
      AND c.user_id = auth.uid()
    )
  );

-- Health metrics policies
CREATE POLICY "Users can manage own health metrics" ON health_metrics_new
  FOR ALL USING (auth.uid() = user_id);

-- Workout policies
CREATE POLICY "Users can manage own workouts" ON workouts_new
  FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Anyone can view workout templates" ON workout_templates_new
  FOR SELECT USING (true);

-- File policies
CREATE POLICY "Users can manage own files" ON files_new
  FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Users can manage own conversation files" ON conversation_files_new
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM conversations_new c 
      WHERE c.id = conversation_files_new.conversation_id 
      AND c.user_id = auth.uid()
    )
  );

-- Insights policies
CREATE POLICY "Users can manage own daily insights" ON daily_insights_new
  FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Users can manage own weekly summaries" ON weekly_summaries_new
  FOR ALL USING (auth.uid() = user_id);

-- Preferences policies
CREATE POLICY "Users can manage own preferences" ON user_preferences_new
  FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Users can manage own daily goals" ON daily_goals_new
  FOR ALL USING (auth.uid() = user_id);

-- =====================================================
-- 12. CREATE TRIGGERS FOR UPDATED_AT
-- =====================================================

-- Create updated_at trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Add triggers to tables with updated_at columns
CREATE TRIGGER update_health_metrics_new_updated_at 
  BEFORE UPDATE ON health_metrics_new
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_workouts_new_updated_at 
  BEFORE UPDATE ON workouts_new
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_workout_templates_new_updated_at 
  BEFORE UPDATE ON workout_templates_new
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_user_preferences_new_updated_at 
  BEFORE UPDATE ON user_preferences_new
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_daily_goals_new_updated_at 
  BEFORE UPDATE ON daily_goals_new
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- NEW SCHEMA CREATION COMPLETE!
-- =====================================================

-- Display new schema summary
SELECT 
    'NEW SCHEMA CREATED!' as status,
    COUNT(*) as table_count
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name LIKE '%_new';

-- Show all new tables
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name LIKE '%_new'
ORDER BY table_name;
