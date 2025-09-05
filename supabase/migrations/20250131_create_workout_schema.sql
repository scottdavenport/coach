-- Create comprehensive workout tracking schema
-- This migration adds workout-related tables to support the workout companion feature

-- Exercise database - comprehensive exercise library
CREATE TABLE IF NOT EXISTS exercises (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  category TEXT NOT NULL, -- 'strength', 'cardio', 'flexibility', 'sports_specific'
  muscle_groups TEXT[], -- ['chest', 'shoulders', 'triceps']
  equipment_needed TEXT[], -- ['dumbbells', 'bodyweight', 'resistance_bands']
  difficulty_level INTEGER CHECK (difficulty_level >= 1 AND difficulty_level <= 5),
  instructions TEXT[],
  tips TEXT[],
  variations TEXT[],
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Workout templates - predefined workout routines
CREATE TABLE IF NOT EXISTS workout_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  category TEXT NOT NULL, -- 'strength', 'cardio', 'flexibility', 'mixed'
  difficulty_level INTEGER CHECK (difficulty_level >= 1 AND difficulty_level <= 5),
  estimated_duration INTEGER, -- minutes
  equipment_required TEXT[],
  target_audience TEXT, -- 'beginner', 'intermediate', 'advanced', 'recovery'
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Template exercises - exercises within workout templates
CREATE TABLE IF NOT EXISTS template_exercises (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id UUID REFERENCES workout_templates(id) ON DELETE CASCADE,
  exercise_id UUID REFERENCES exercises(id) ON DELETE CASCADE,
  order_index INTEGER NOT NULL,
  sets INTEGER,
  reps INTEGER,
  duration_seconds INTEGER, -- for time-based exercises
  weight_kg DECIMAL(5,2),
  rest_seconds INTEGER,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(template_id, order_index)
);

-- User workout sessions - actual workout instances
CREATE TABLE IF NOT EXISTS user_workouts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  template_id UUID REFERENCES workout_templates(id) ON DELETE SET NULL,
  workout_date DATE NOT NULL,
  workout_name TEXT NOT NULL,
  category TEXT NOT NULL,
  total_duration INTEGER, -- minutes
  notes TEXT,
  mood_before INTEGER CHECK (mood_before >= 1 AND mood_before <= 10),
  mood_after INTEGER CHECK (mood_after >= 1 AND mood_after <= 10),
  energy_before INTEGER CHECK (energy_before >= 1 AND energy_before <= 10),
  energy_after INTEGER CHECK (energy_after >= 1 AND energy_after <= 10),
  perceived_exertion INTEGER CHECK (perceived_exertion >= 1 AND perceived_exertion <= 10),
  completion_status TEXT DEFAULT 'completed' CHECK (completion_status IN ('completed', 'partial', 'skipped')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, workout_date, workout_name)
);

-- Workout exercises - exercises performed in a specific workout session
CREATE TABLE IF NOT EXISTS workout_exercises (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workout_id UUID REFERENCES user_workouts(id) ON DELETE CASCADE,
  exercise_id UUID REFERENCES exercises(id) ON DELETE CASCADE,
  order_index INTEGER NOT NULL,
  sets_completed INTEGER,
  reps_completed INTEGER,
  duration_completed INTEGER, -- seconds
  weight_used DECIMAL(5,2),
  rest_taken INTEGER, -- seconds
  notes TEXT,
  difficulty_rating INTEGER CHECK (difficulty_rating >= 1 AND difficulty_rating <= 5),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(workout_id, order_index)
);

-- User workout preferences and goals
CREATE TABLE IF NOT EXISTS user_workout_preferences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE UNIQUE,
  fitness_level TEXT DEFAULT 'beginner' CHECK (fitness_level IN ('beginner', 'intermediate', 'advanced')),
  primary_goals TEXT[], -- ['strength', 'endurance', 'flexibility', 'weight_loss']
  available_equipment TEXT[],
  preferred_workout_duration INTEGER, -- minutes
  preferred_workout_times TEXT[], -- ['morning', 'afternoon', 'evening']
  workout_frequency INTEGER, -- days per week
  injury_limitations TEXT[],
  exercise_preferences TEXT[], -- preferred exercise types
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Workout progress tracking
CREATE TABLE IF NOT EXISTS workout_progress (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  exercise_id UUID REFERENCES exercises(id) ON DELETE CASCADE,
  metric_type TEXT NOT NULL, -- 'max_weight', 'max_reps', 'max_duration', 'personal_record'
  metric_value DECIMAL(8,2) NOT NULL,
  metric_unit TEXT, -- 'kg', 'lbs', 'reps', 'seconds', 'minutes'
  achieved_date DATE NOT NULL,
  workout_id UUID REFERENCES user_workouts(id) ON DELETE SET NULL,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, exercise_id, metric_type, achieved_date)
);

-- Workout recommendations based on health data
CREATE TABLE IF NOT EXISTS workout_recommendations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  recommendation_date DATE NOT NULL,
  recommendation_type TEXT NOT NULL, -- 'daily', 'weekly', 'adaptive'
  recommended_template_id UUID REFERENCES workout_templates(id) ON DELETE SET NULL,
  reasoning TEXT NOT NULL,
  health_context JSONB, -- store the health metrics that influenced this recommendation
  priority_score INTEGER CHECK (priority_score >= 1 AND priority_score <= 10),
  is_completed BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_user_workouts_user_date ON user_workouts(user_id, workout_date);
CREATE INDEX IF NOT EXISTS idx_workout_exercises_workout ON workout_exercises(workout_id);
CREATE INDEX IF NOT EXISTS idx_workout_progress_user_exercise ON workout_progress(user_id, exercise_id);
CREATE INDEX IF NOT EXISTS idx_workout_recommendations_user_date ON workout_recommendations(user_id, recommendation_date);
CREATE INDEX IF NOT EXISTS idx_exercises_category ON exercises(category);
CREATE INDEX IF NOT EXISTS idx_workout_templates_category ON workout_templates(category);

-- Add workout-related metrics to standard_metrics if they don't exist
INSERT INTO standard_metrics (metric_key, display_name, unit, category, data_type)
VALUES 
  ('workout_duration', 'Workout Duration', 'minutes', 'activity', 'numeric'),
  ('workout_frequency', 'Workout Frequency', 'sessions/week', 'activity', 'numeric'),
  ('workout_intensity', 'Workout Intensity', 'RPE', 'activity', 'numeric'),
  ('workout_satisfaction', 'Workout Satisfaction', 'rating', 'activity', 'numeric')
ON CONFLICT (metric_key) DO NOTHING;

-- Create RLS policies
ALTER TABLE exercises ENABLE ROW LEVEL SECURITY;
ALTER TABLE workout_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE template_exercises ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_workouts ENABLE ROW LEVEL SECURITY;
ALTER TABLE workout_exercises ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_workout_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE workout_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE workout_recommendations ENABLE ROW LEVEL SECURITY;

-- Exercises and templates are public (read-only for all users)
CREATE POLICY "Anyone can view exercises" ON exercises FOR SELECT USING (true);
CREATE POLICY "Anyone can view workout templates" ON workout_templates FOR SELECT USING (true);
CREATE POLICY "Anyone can view template exercises" ON template_exercises FOR SELECT USING (true);

-- User-specific data policies
CREATE POLICY "Users can manage their own workouts" ON user_workouts 
  FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Users can manage their own workout exercises" ON workout_exercises 
  FOR ALL USING (auth.uid() = (SELECT user_id FROM user_workouts WHERE id = workout_id));

CREATE POLICY "Users can manage their own workout preferences" ON user_workout_preferences 
  FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Users can manage their own workout progress" ON workout_progress 
  FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Users can manage their own workout recommendations" ON workout_recommendations 
  FOR ALL USING (auth.uid() = user_id);

-- Add triggers for updated_at timestamps
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_exercises_updated_at BEFORE UPDATE ON exercises
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_workout_templates_updated_at BEFORE UPDATE ON workout_templates
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_user_workouts_updated_at BEFORE UPDATE ON user_workouts
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_user_workout_preferences_updated_at BEFORE UPDATE ON user_workout_preferences
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_workout_recommendations_updated_at BEFORE UPDATE ON workout_recommendations
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();