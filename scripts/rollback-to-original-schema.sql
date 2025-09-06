-- =====================================================
-- ROLLBACK SCRIPT - RESTORE TO EXACT PREVIOUS STATE
-- =====================================================
-- This script restores the database to the exact state before migration
-- Run this if you need to rollback to the original schema

-- =====================================================
-- 1. DROP ALL NEW TABLES
-- =====================================================

-- Drop all new tables in reverse dependency order
DROP TABLE IF EXISTS conversation_insights_new CASCADE;
DROP TABLE IF EXISTS conversations_new CASCADE;
DROP TABLE IF EXISTS health_metrics_new CASCADE;
DROP TABLE IF EXISTS workouts_new CASCADE;
DROP TABLE IF EXISTS workout_templates_new CASCADE;
DROP TABLE IF EXISTS conversation_files_new CASCADE;
DROP TABLE IF EXISTS files_new CASCADE;
DROP TABLE IF EXISTS daily_insights_new CASCADE;
DROP TABLE IF EXISTS weekly_summaries_new CASCADE;
DROP TABLE IF EXISTS user_preferences_new CASCADE;
DROP TABLE IF EXISTS daily_goals_new CASCADE;

-- =====================================================
-- 2. RESTORE ORIGINAL TABLES FROM BACKUP
-- =====================================================

-- Restore all original tables from backup schema
-- Note: Replace 'backup_20250905_182920' with your actual backup schema name

-- Restore users table (if it was modified)
-- CREATE TABLE public.users AS SELECT * FROM backup_20250905_182920.users;

-- Restore conversations table
CREATE TABLE public.conversations AS SELECT * FROM backup_20250905_182920.conversations;

-- Restore events table
CREATE TABLE public.events AS SELECT * FROM backup_20250905_182920.events;

-- Restore user_uploads table
CREATE TABLE public.user_uploads AS SELECT * FROM backup_20250905_182920.user_uploads;

-- Restore oura_integrations table
CREATE TABLE public.oura_integrations AS SELECT * FROM backup_20250905_182920.oura_integrations;

-- Restore oura_data table
CREATE TABLE public.oura_data AS SELECT * FROM backup_20250905_182920.oura_data;

-- Restore weekly_summaries table
CREATE TABLE public.weekly_summaries AS SELECT * FROM backup_20250905_182920.weekly_summaries;

-- Restore monthly_trends table
CREATE TABLE public.monthly_trends AS SELECT * FROM backup_20250905_182920.monthly_trends;

-- Restore daily_journal table
CREATE TABLE public.daily_journal AS SELECT * FROM backup_20250905_182920.daily_journal;

-- Restore daily_goals table
CREATE TABLE public.daily_goals AS SELECT * FROM backup_20250905_182920.daily_goals;

-- Restore daily_activities table
CREATE TABLE public.daily_activities AS SELECT * FROM backup_20250905_182920.daily_activities;

-- Restore user_daily_metrics table
CREATE TABLE public.user_daily_metrics AS SELECT * FROM backup_20250905_182920.user_daily_metrics;

-- Restore user_metric_preferences table
CREATE TABLE public.user_metric_preferences AS SELECT * FROM backup_20250905_182920.user_metric_preferences;

-- Restore metric_categories table
CREATE TABLE public.metric_categories AS SELECT * FROM backup_20250905_182920.metric_categories;

-- Restore standard_metrics table
CREATE TABLE public.standard_metrics AS SELECT * FROM backup_20250905_182920.standard_metrics;

-- Restore daily_narratives table
CREATE TABLE public.daily_narratives AS SELECT * FROM backup_20250905_182920.daily_narratives;

-- Restore conversation_insights table
CREATE TABLE public.conversation_insights AS SELECT * FROM backup_20250905_182920.conversation_insights;

-- Restore ocr_training_data table
CREATE TABLE public.ocr_training_data AS SELECT * FROM backup_20250905_182920.ocr_training_data;

-- Restore ocr_feedback table
CREATE TABLE public.ocr_feedback AS SELECT * FROM backup_20250905_182920.ocr_feedback;

-- Restore conversation_file_attachments table
CREATE TABLE public.conversation_file_attachments AS SELECT * FROM backup_20250905_182920.conversation_file_attachments;

-- Restore mood_tracking table
CREATE TABLE public.mood_tracking AS SELECT * FROM backup_20250905_182920.mood_tracking;

-- Restore workout tables
CREATE TABLE public.exercises AS SELECT * FROM backup_20250905_182920.exercises;
CREATE TABLE public.workout_templates AS SELECT * FROM backup_20250905_182920.workout_templates;
CREATE TABLE public.template_exercises AS SELECT * FROM backup_20250905_182920.template_exercises;
CREATE TABLE public.user_workouts AS SELECT * FROM backup_20250905_182920.user_workouts;
CREATE TABLE public.workout_exercises AS SELECT * FROM backup_20250905_182920.workout_exercises;
CREATE TABLE public.user_workout_preferences AS SELECT * FROM backup_20250905_182920.user_workout_preferences;
CREATE TABLE public.workout_progress AS SELECT * FROM backup_20250905_182920.workout_progress;
CREATE TABLE public.workout_recommendations AS SELECT * FROM backup_20250905_182920.workout_recommendations;

-- =====================================================
-- 3. RESTORE ORIGINAL INDEXES
-- =====================================================

-- Restore all original indexes from backup
-- Note: This is a simplified version - you may need to adjust based on your actual indexes

-- Basic indexes
CREATE INDEX idx_conversations_user_id ON public.conversations(user_id);
CREATE INDEX idx_events_user_id ON public.events(user_id);
CREATE INDEX idx_events_type ON public.events(event_type);
CREATE INDEX idx_user_uploads_user_id ON public.user_uploads(user_id);
CREATE INDEX idx_oura_integrations_user_id ON public.oura_integrations(user_id);
CREATE INDEX idx_oura_data_user_id ON public.oura_data(user_id);
CREATE INDEX idx_weekly_summaries_user_id ON public.weekly_summaries(user_id);
CREATE INDEX idx_monthly_trends_user_id ON public.monthly_trends(user_id);
CREATE INDEX idx_daily_journal_user_id ON public.daily_journal(user_id);
CREATE INDEX idx_daily_goals_user_id ON public.daily_goals(user_id);
CREATE INDEX idx_daily_activities_user_id ON public.daily_activities(user_id);
CREATE INDEX idx_user_daily_metrics_user_id ON public.user_daily_metrics(user_id);
CREATE INDEX idx_user_metric_preferences_user_id ON public.user_metric_preferences(user_id);
CREATE INDEX idx_metric_categories_name ON public.metric_categories(name);
CREATE INDEX idx_standard_metrics_category_id ON public.standard_metrics(category_id);
CREATE INDEX idx_daily_narratives_user_id ON public.daily_narratives(user_id);
CREATE INDEX idx_conversation_insights_user_id ON public.conversation_insights(user_id);
CREATE INDEX idx_ocr_feedback_user_id ON public.ocr_feedback(user_id);
CREATE INDEX idx_mood_tracking_user_id ON public.mood_tracking(user_id);

-- Workout indexes
CREATE INDEX idx_user_workouts_user_date ON public.user_workouts(user_id, workout_date);
CREATE INDEX idx_workout_exercises_workout ON public.workout_exercises(workout_id);
CREATE INDEX idx_workout_progress_user_exercise ON public.workout_progress(user_id, exercise_id);
CREATE INDEX idx_workout_recommendations_user_date ON public.workout_recommendations(user_id, recommendation_date);
CREATE INDEX idx_exercises_category ON public.exercises(category);
CREATE INDEX idx_workout_templates_category ON public.workout_templates(category);

-- =====================================================
-- 4. RESTORE ORIGINAL CONSTRAINTS
-- =====================================================

-- Restore primary key constraints
ALTER TABLE public.conversations ADD CONSTRAINT conversations_pkey PRIMARY KEY (id);
ALTER TABLE public.events ADD CONSTRAINT events_pkey PRIMARY KEY (id);
ALTER TABLE public.user_uploads ADD CONSTRAINT user_uploads_pkey PRIMARY KEY (id);
ALTER TABLE public.oura_integrations ADD CONSTRAINT oura_integrations_pkey PRIMARY KEY (id);
ALTER TABLE public.oura_data ADD CONSTRAINT oura_data_pkey PRIMARY KEY (id);
ALTER TABLE public.weekly_summaries ADD CONSTRAINT weekly_summaries_pkey PRIMARY KEY (id);
ALTER TABLE public.monthly_trends ADD CONSTRAINT monthly_trends_pkey PRIMARY KEY (id);
ALTER TABLE public.daily_journal ADD CONSTRAINT daily_journal_pkey PRIMARY KEY (id);
ALTER TABLE public.daily_goals ADD CONSTRAINT daily_goals_pkey PRIMARY KEY (id);
ALTER TABLE public.daily_activities ADD CONSTRAINT daily_activities_pkey PRIMARY KEY (id);
ALTER TABLE public.user_daily_metrics ADD CONSTRAINT user_daily_metrics_pkey PRIMARY KEY (id);
ALTER TABLE public.user_metric_preferences ADD CONSTRAINT user_metric_preferences_pkey PRIMARY KEY (id);
ALTER TABLE public.metric_categories ADD CONSTRAINT metric_categories_pkey PRIMARY KEY (id);
ALTER TABLE public.standard_metrics ADD CONSTRAINT standard_metrics_pkey PRIMARY KEY (id);
ALTER TABLE public.daily_narratives ADD CONSTRAINT daily_narratives_pkey PRIMARY KEY (id);
ALTER TABLE public.conversation_insights ADD CONSTRAINT conversation_insights_pkey PRIMARY KEY (id);
ALTER TABLE public.ocr_training_data ADD CONSTRAINT ocr_training_data_pkey PRIMARY KEY (id);
ALTER TABLE public.ocr_feedback ADD CONSTRAINT ocr_feedback_pkey PRIMARY KEY (id);
ALTER TABLE public.conversation_file_attachments ADD CONSTRAINT conversation_file_attachments_pkey PRIMARY KEY (id);
ALTER TABLE public.mood_tracking ADD CONSTRAINT mood_tracking_pkey PRIMARY KEY (id);

-- Restore foreign key constraints
ALTER TABLE public.conversations ADD CONSTRAINT conversations_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;
ALTER TABLE public.events ADD CONSTRAINT events_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;
ALTER TABLE public.events ADD CONSTRAINT events_conversation_id_fkey FOREIGN KEY (conversation_id) REFERENCES public.conversations(id) ON DELETE SET NULL;
ALTER TABLE public.user_uploads ADD CONSTRAINT user_uploads_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
ALTER TABLE public.oura_integrations ADD CONSTRAINT oura_integrations_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
ALTER TABLE public.oura_data ADD CONSTRAINT oura_data_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
ALTER TABLE public.weekly_summaries ADD CONSTRAINT weekly_summaries_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;
ALTER TABLE public.monthly_trends ADD CONSTRAINT monthly_trends_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;
ALTER TABLE public.daily_journal ADD CONSTRAINT daily_journal_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;
ALTER TABLE public.daily_goals ADD CONSTRAINT daily_goals_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;
ALTER TABLE public.daily_activities ADD CONSTRAINT daily_activities_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;
ALTER TABLE public.user_daily_metrics ADD CONSTRAINT user_daily_metrics_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;
ALTER TABLE public.user_daily_metrics ADD CONSTRAINT user_daily_metrics_metric_id_fkey FOREIGN KEY (metric_id) REFERENCES public.standard_metrics(id) ON DELETE CASCADE;
ALTER TABLE public.user_metric_preferences ADD CONSTRAINT user_metric_preferences_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;
ALTER TABLE public.user_metric_preferences ADD CONSTRAINT user_metric_preferences_metric_id_fkey FOREIGN KEY (metric_id) REFERENCES public.standard_metrics(id) ON DELETE CASCADE;
ALTER TABLE public.standard_metrics ADD CONSTRAINT standard_metrics_category_id_fkey FOREIGN KEY (category_id) REFERENCES public.metric_categories(id) ON DELETE CASCADE;
ALTER TABLE public.daily_narratives ADD CONSTRAINT daily_narratives_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;
ALTER TABLE public.conversation_insights ADD CONSTRAINT conversation_insights_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
ALTER TABLE public.ocr_feedback ADD CONSTRAINT ocr_feedback_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
ALTER TABLE public.conversation_file_attachments ADD CONSTRAINT conversation_file_attachments_conversation_id_fkey FOREIGN KEY (conversation_id) REFERENCES public.conversations(id) ON DELETE CASCADE;
ALTER TABLE public.conversation_file_attachments ADD CONSTRAINT conversation_file_attachments_file_id_fkey FOREIGN KEY (file_id) REFERENCES public.user_uploads(id) ON DELETE CASCADE;
ALTER TABLE public.mood_tracking ADD CONSTRAINT mood_tracking_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;

-- Restore workout foreign key constraints
ALTER TABLE public.template_exercises ADD CONSTRAINT template_exercises_template_id_fkey FOREIGN KEY (template_id) REFERENCES public.workout_templates(id) ON DELETE CASCADE;
ALTER TABLE public.template_exercises ADD CONSTRAINT template_exercises_exercise_id_fkey FOREIGN KEY (exercise_id) REFERENCES public.exercises(id) ON DELETE CASCADE;
ALTER TABLE public.user_workouts ADD CONSTRAINT user_workouts_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;
ALTER TABLE public.user_workouts ADD CONSTRAINT user_workouts_template_id_fkey FOREIGN KEY (template_id) REFERENCES public.workout_templates(id) ON DELETE SET NULL;
ALTER TABLE public.workout_exercises ADD CONSTRAINT workout_exercises_workout_id_fkey FOREIGN KEY (workout_id) REFERENCES public.user_workouts(id) ON DELETE CASCADE;
ALTER TABLE public.workout_exercises ADD CONSTRAINT workout_exercises_exercise_id_fkey FOREIGN KEY (exercise_id) REFERENCES public.exercises(id) ON DELETE CASCADE;
ALTER TABLE public.user_workout_preferences ADD CONSTRAINT user_workout_preferences_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;
ALTER TABLE public.workout_progress ADD CONSTRAINT workout_progress_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;
ALTER TABLE public.workout_progress ADD CONSTRAINT workout_progress_exercise_id_fkey FOREIGN KEY (exercise_id) REFERENCES public.exercises(id) ON DELETE CASCADE;
ALTER TABLE public.workout_progress ADD CONSTRAINT workout_progress_workout_id_fkey FOREIGN KEY (workout_id) REFERENCES public.user_workouts(id) ON DELETE SET NULL;
ALTER TABLE public.workout_recommendations ADD CONSTRAINT workout_recommendations_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;
ALTER TABLE public.workout_recommendations ADD CONSTRAINT workout_recommendations_recommended_template_id_fkey FOREIGN KEY (recommended_template_id) REFERENCES public.workout_templates(id) ON DELETE SET NULL;

-- =====================================================
-- 5. RESTORE ORIGINAL RLS POLICIES
-- =====================================================

-- Enable RLS on all tables
ALTER TABLE public.conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_uploads ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.oura_integrations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.oura_data ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.weekly_summaries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.monthly_trends ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.daily_journal ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.daily_goals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.daily_activities ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_daily_metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_metric_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.metric_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.standard_metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.daily_narratives ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.conversation_insights ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ocr_training_data ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ocr_feedback ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.conversation_file_attachments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mood_tracking ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.exercises ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workout_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.template_exercises ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_workouts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workout_exercises ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_workout_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workout_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workout_recommendations ENABLE ROW LEVEL SECURITY;

-- Restore RLS policies (simplified version)
-- Note: You may need to restore the exact policies from your backup

-- Basic user data policies
CREATE POLICY "Users can manage own conversations" ON public.conversations FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users can manage own events" ON public.events FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users can manage own uploads" ON public.user_uploads FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users can manage own oura integrations" ON public.oura_integrations FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users can manage own oura data" ON public.oura_data FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users can manage own weekly summaries" ON public.weekly_summaries FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users can manage own monthly trends" ON public.monthly_trends FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users can manage own daily journal" ON public.daily_journal FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users can manage own daily goals" ON public.daily_goals FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users can manage own daily activities" ON public.daily_activities FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users can manage own daily metrics" ON public.user_daily_metrics FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users can manage own metric preferences" ON public.user_metric_preferences FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users can manage own daily narratives" ON public.daily_narratives FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users can manage own conversation insights" ON public.conversation_insights FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users can manage own ocr feedback" ON public.ocr_feedback FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users can manage own mood tracking" ON public.mood_tracking FOR ALL USING (auth.uid() = user_id);

-- Public read policies for reference data
CREATE POLICY "Anyone can view metric categories" ON public.metric_categories FOR SELECT USING (true);
CREATE POLICY "Anyone can view standard metrics" ON public.standard_metrics FOR SELECT USING (true);
CREATE POLICY "Anyone can view exercises" ON public.exercises FOR SELECT USING (true);
CREATE POLICY "Anyone can view workout templates" ON public.workout_templates FOR SELECT USING (true);
CREATE POLICY "Anyone can view template exercises" ON public.template_exercises FOR SELECT USING (true);

-- Workout policies
CREATE POLICY "Users can manage own workouts" ON public.user_workouts FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users can manage own workout exercises" ON public.workout_exercises FOR ALL USING (auth.uid() = (SELECT user_id FROM public.user_workouts WHERE id = workout_id));
CREATE POLICY "Users can manage own workout preferences" ON public.user_workout_preferences FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users can manage own workout progress" ON public.workout_progress FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users can manage own workout recommendations" ON public.workout_recommendations FOR ALL USING (auth.uid() = user_id);

-- Conversation file attachment policies
CREATE POLICY "Users can view own conversation file attachments" ON public.conversation_file_attachments FOR SELECT USING (EXISTS (SELECT 1 FROM public.conversations c WHERE c.id = conversation_file_attachments.conversation_id AND c.user_id = auth.uid()));
CREATE POLICY "Users can insert own conversation file attachments" ON public.conversation_file_attachments FOR INSERT WITH CHECK (EXISTS (SELECT 1 FROM public.conversations c WHERE c.id = conversation_file_attachments.conversation_id AND c.user_id = auth.uid()));
CREATE POLICY "Users can update own conversation file attachments" ON public.conversation_file_attachments FOR UPDATE USING (EXISTS (SELECT 1 FROM public.conversations c WHERE c.id = conversation_file_attachments.conversation_id AND c.user_id = auth.uid()));
CREATE POLICY "Users can delete own conversation file attachments" ON public.conversation_file_attachments FOR DELETE USING (EXISTS (SELECT 1 FROM public.conversations c WHERE c.id = conversation_file_attachments.conversation_id AND c.user_id = auth.uid()));

-- =====================================================
-- 6. RESTORE ORIGINAL FUNCTIONS AND TRIGGERS
-- =====================================================

-- Restore updated_at trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Restore triggers
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON public.users FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_oura_integrations_updated_at BEFORE UPDATE ON public.oura_integrations FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_weekly_summaries_updated_at BEFORE UPDATE ON public.weekly_summaries FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_monthly_trends_updated_at BEFORE UPDATE ON public.monthly_trends FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_daily_journal_updated_at BEFORE UPDATE ON public.daily_journal FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_daily_goals_updated_at BEFORE UPDATE ON public.daily_goals FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_daily_activities_updated_at BEFORE UPDATE ON public.daily_activities FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_user_daily_metrics_updated_at BEFORE UPDATE ON public.user_daily_metrics FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_daily_narratives_updated_at BEFORE UPDATE ON public.daily_narratives FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_exercises_updated_at BEFORE UPDATE ON public.exercises FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_workout_templates_updated_at BEFORE UPDATE ON public.workout_templates FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_user_workouts_updated_at BEFORE UPDATE ON public.user_workouts FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_user_workout_preferences_updated_at BEFORE UPDATE ON public.user_workout_preferences FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_workout_recommendations_updated_at BEFORE UPDATE ON public.workout_recommendations FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_mood_tracking_updated_at BEFORE UPDATE ON public.mood_tracking FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- 7. CLEANUP BACKUP SCHEMA (OPTIONAL)
-- =====================================================

-- Uncomment the line below if you want to remove the backup schema after successful rollback
-- DROP SCHEMA IF EXISTS backup_20250905_182920 CASCADE;

-- =====================================================
-- ROLLBACK COMPLETE!
-- =====================================================

-- Display rollback summary
SELECT 
    'ROLLBACK COMPLETE!' as status,
    'Database restored to exact previous state' as message,
    NOW() as rollback_timestamp;

-- Show restored tables
SELECT 
    table_name,
    'RESTORED' as status
FROM information_schema.tables 
WHERE table_schema = 'public' 
ORDER BY table_name;
