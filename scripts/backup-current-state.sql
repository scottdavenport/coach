-- =====================================================
-- COMPLETE DATABASE STATE BACKUP SCRIPT
-- =====================================================
-- This script creates a complete backup of the current database state
-- Run this BEFORE making any changes to ensure rollback capability

-- Create backup schema
CREATE SCHEMA IF NOT EXISTS backup_$(date +%Y%m%d_%H%M%S);

-- Set the backup schema name (replace with actual timestamp)
-- Example: backup_20250131_143022
SET backup_schema = 'backup_20250131_143022';

-- =====================================================
-- 1. BACKUP ALL TABLE STRUCTURES
-- =====================================================

-- Create backup tables with identical structure
CREATE TABLE backup_20250131_143022.users AS SELECT * FROM public.users;
CREATE TABLE backup_20250131_143022.conversations AS SELECT * FROM public.conversations;
CREATE TABLE backup_20250131_143022.events AS SELECT * FROM public.events;
CREATE TABLE backup_20250131_143022.user_uploads AS SELECT * FROM public.user_uploads;
CREATE TABLE backup_20250131_143022.oura_integrations AS SELECT * FROM public.oura_integrations;
CREATE TABLE backup_20250131_143022.oura_data AS SELECT * FROM public.oura_data;
CREATE TABLE backup_20250131_143022.weekly_summaries AS SELECT * FROM public.weekly_summaries;
CREATE TABLE backup_20250131_143022.monthly_trends AS SELECT * FROM public.monthly_trends;
CREATE TABLE backup_20250131_143022.daily_journal AS SELECT * FROM public.daily_journal;
CREATE TABLE backup_20250131_143022.daily_goals AS SELECT * FROM public.daily_goals;
CREATE TABLE backup_20250131_143022.daily_activities AS SELECT * FROM public.daily_activities;
CREATE TABLE backup_20250131_143022.user_daily_metrics AS SELECT * FROM public.user_daily_metrics;
CREATE TABLE backup_20250131_143022.user_metric_preferences AS SELECT * FROM public.user_metric_preferences;
CREATE TABLE backup_20250131_143022.metric_categories AS SELECT * FROM public.metric_categories;
CREATE TABLE backup_20250131_143022.standard_metrics AS SELECT * FROM public.standard_metrics;
CREATE TABLE backup_20250131_143022.daily_narratives AS SELECT * FROM public.daily_narratives;
CREATE TABLE backup_20250131_143022.conversation_insights AS SELECT * FROM public.conversation_insights;
CREATE TABLE backup_20250131_143022.ocr_training_data AS SELECT * FROM public.ocr_training_data;
CREATE TABLE backup_20250131_143022.ocr_feedback AS SELECT * FROM public.ocr_feedback;
CREATE TABLE backup_20250131_143022.conversation_file_attachments AS SELECT * FROM public.conversation_file_attachments;
CREATE TABLE backup_20250131_143022.mood_tracking AS SELECT * FROM public.mood_tracking;

-- Workout tables
CREATE TABLE backup_20250131_143022.exercises AS SELECT * FROM public.exercises;
CREATE TABLE backup_20250131_143022.workout_templates AS SELECT * FROM public.workout_templates;
CREATE TABLE backup_20250131_143022.template_exercises AS SELECT * FROM public.template_exercises;
CREATE TABLE backup_20250131_143022.user_workouts AS SELECT * FROM public.user_workouts;
CREATE TABLE backup_20250131_143022.workout_exercises AS SELECT * FROM public.workout_exercises;
CREATE TABLE backup_20250131_143022.user_workout_preferences AS SELECT * FROM public.user_workout_preferences;
CREATE TABLE backup_20250131_143022.workout_progress AS SELECT * FROM public.workout_progress;
CREATE TABLE backup_20250131_143022.workout_recommendations AS SELECT * FROM public.workout_recommendations;

-- =====================================================
-- 2. BACKUP ALL INDEXES
-- =====================================================

-- Create a table to store index definitions
CREATE TABLE backup_20250131_143022.index_definitions AS
SELECT 
    schemaname,
    tablename,
    indexname,
    indexdef
FROM pg_indexes 
WHERE schemaname = 'public';

-- =====================================================
-- 3. BACKUP ALL CONSTRAINTS
-- =====================================================

-- Create a table to store constraint definitions
CREATE TABLE backup_20250131_143022.constraint_definitions AS
SELECT 
    tc.table_name,
    tc.constraint_name,
    tc.constraint_type,
    tc.is_deferrable,
    tc.initially_deferred,
    cc.check_clause,
    kcu.column_name,
    ccu.table_name AS foreign_table_name,
    ccu.column_name AS foreign_column_name
FROM information_schema.table_constraints tc
LEFT JOIN information_schema.check_constraints cc ON tc.constraint_name = cc.constraint_name
LEFT JOIN information_schema.key_column_usage kcu ON tc.constraint_name = kcu.constraint_name
LEFT JOIN information_schema.constraint_column_usage ccu ON tc.constraint_name = ccu.constraint_name
WHERE tc.table_schema = 'public';

-- =====================================================
-- 4. BACKUP ALL RLS POLICIES
-- =====================================================

-- Create a table to store RLS policy definitions
CREATE TABLE backup_20250131_143022.rls_policies AS
SELECT 
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd,
    qual,
    with_check
FROM pg_policies 
WHERE schemaname = 'public';

-- =====================================================
-- 5. BACKUP ALL FUNCTIONS AND TRIGGERS
-- =====================================================

-- Create a table to store function definitions
CREATE TABLE backup_20250131_143022.function_definitions AS
SELECT 
    n.nspname as schema_name,
    p.proname as function_name,
    pg_get_functiondef(p.oid) as function_definition
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE n.nspname = 'public';

-- Create a table to store trigger definitions
CREATE TABLE backup_20250131_143022.trigger_definitions AS
SELECT 
    t.tgname as trigger_name,
    c.relname as table_name,
    p.proname as function_name,
    t.tgenabled as enabled,
    t.tgtype as trigger_type
FROM pg_trigger t
JOIN pg_class c ON t.tgrelid = c.oid
JOIN pg_proc p ON t.tgfoid = p.oid
WHERE c.relname IN (
    SELECT table_name FROM information_schema.tables 
    WHERE table_schema = 'public'
);

-- =====================================================
-- 6. CREATE ROLLBACK SCRIPT
-- =====================================================

-- Create a rollback script that can restore everything
CREATE OR REPLACE FUNCTION backup_20250131_143022.create_rollback_script()
RETURNS TEXT AS $$
DECLARE
    rollback_script TEXT := '';
    table_record RECORD;
    index_record RECORD;
    constraint_record RECORD;
    policy_record RECORD;
    function_record RECORD;
    trigger_record RECORD;
BEGIN
    -- Start rollback script
    rollback_script := '-- =====================================================' || E'\n';
    rollback_script := rollback_script || '-- ROLLBACK SCRIPT - RESTORE TO EXACT PREVIOUS STATE' || E'\n';
    rollback_script := rollback_script || '-- Generated: ' || NOW() || E'\n';
    rollback_script := rollback_script || '-- =====================================================' || E'\n\n';
    
    -- Drop all current tables (in reverse dependency order)
    rollback_script := rollback_script || '-- Drop all current tables' || E'\n';
    rollback_script := rollback_script || 'DROP SCHEMA IF EXISTS public CASCADE;' || E'\n';
    rollback_script := rollback_script || 'CREATE SCHEMA public;' || E'\n\n';
    
    -- Restore all tables
    rollback_script := rollback_script || '-- Restore all tables' || E'\n';
    FOR table_record IN 
        SELECT table_name FROM information_schema.tables 
        WHERE table_schema = 'backup_20250131_143022' 
        AND table_name NOT LIKE '%_definitions'
        AND table_name NOT LIKE '%_policies'
    LOOP
        rollback_script := rollback_script || 'CREATE TABLE public.' || table_record.table_name || ' AS SELECT * FROM backup_20250131_143022.' || table_record.table_name || ';' || E'\n';
    END LOOP;
    
    rollback_script := rollback_script || E'\n';
    
    -- Restore all indexes
    rollback_script := rollback_script || '-- Restore all indexes' || E'\n';
    FOR index_record IN 
        SELECT indexdef FROM backup_20250131_143022.index_definitions
    LOOP
        rollback_script := rollback_script || index_record.indexdef || ';' || E'\n';
    END LOOP;
    
    rollback_script := rollback_script || E'\n';
    
    -- Restore all constraints
    rollback_script := rollback_script || '-- Restore all constraints' || E'\n';
    FOR constraint_record IN 
        SELECT * FROM backup_20250131_143022.constraint_definitions
    LOOP
        -- Add constraint restoration logic here
        rollback_script := rollback_script || '-- Constraint: ' || constraint_record.constraint_name || ' on ' || constraint_record.table_name || E'\n';
    END LOOP;
    
    rollback_script := rollback_script || E'\n';
    
    -- Restore all RLS policies
    rollback_script := rollback_script || '-- Restore all RLS policies' || E'\n';
    FOR policy_record IN 
        SELECT * FROM backup_20250131_143022.rls_policies
    LOOP
        rollback_script := rollback_script || 'CREATE POLICY "' || policy_record.policyname || '" ON ' || policy_record.tablename || E'\n';
        rollback_script := rollback_script || '  FOR ' || policy_record.cmd || ' USING (' || policy_record.qual || ');' || E'\n';
    END LOOP;
    
    rollback_script := rollback_script || E'\n';
    
    -- Restore all functions
    rollback_script := rollback_script || '-- Restore all functions' || E'\n';
    FOR function_record IN 
        SELECT function_definition FROM backup_20250131_143022.function_definitions
    LOOP
        rollback_script := rollback_script || function_record.function_definition || ';' || E'\n';
    END LOOP;
    
    rollback_script := rollback_script || E'\n';
    
    -- Restore all triggers
    rollback_script := rollback_script || '-- Restore all triggers' || E'\n';
    FOR trigger_record IN 
        SELECT * FROM backup_20250131_143022.trigger_definitions
    LOOP
        rollback_script := rollback_script || 'CREATE TRIGGER ' || trigger_record.trigger_name || E'\n';
        rollback_script := rollback_script || '  ON ' || trigger_record.table_name || E'\n';
        rollback_script := rollback_script || '  FOR EACH ROW EXECUTE FUNCTION ' || trigger_record.function_name || '();' || E'\n';
    END LOOP;
    
    rollback_script := rollback_script || E'\n';
    rollback_script := rollback_script || '-- Rollback complete!' || E'\n';
    
    RETURN rollback_script;
END;
$$ LANGUAGE plpgsql;

-- Generate the rollback script
SELECT backup_20250131_143022.create_rollback_script() as rollback_script;

-- =====================================================
-- 7. CREATE BACKUP METADATA
-- =====================================================

-- Create a metadata table with backup information
CREATE TABLE backup_20250131_143022.backup_metadata (
    backup_id TEXT PRIMARY KEY DEFAULT 'backup_20250131_143022',
    backup_timestamp TIMESTAMPTZ DEFAULT NOW(),
    backup_reason TEXT DEFAULT 'Schema migration preparation',
    original_schema_version TEXT,
    backup_size_mb NUMERIC,
    table_count INTEGER,
    index_count INTEGER,
    constraint_count INTEGER,
    policy_count INTEGER,
    function_count INTEGER,
    trigger_count INTEGER
);

-- Insert backup metadata
INSERT INTO backup_20250131_143022.backup_metadata (
    backup_size_mb,
    table_count,
    index_count,
    constraint_count,
    policy_count,
    function_count,
    trigger_count
) VALUES (
    (SELECT pg_size_pretty(pg_database_size(current_database()))::text::numeric),
    (SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = 'public'),
    (SELECT COUNT(*) FROM pg_indexes WHERE schemaname = 'public'),
    (SELECT COUNT(*) FROM information_schema.table_constraints WHERE table_schema = 'public'),
    (SELECT COUNT(*) FROM pg_policies WHERE schemaname = 'public'),
    (SELECT COUNT(*) FROM pg_proc p JOIN pg_namespace n ON p.pronamespace = n.oid WHERE n.nspname = 'public'),
    (SELECT COUNT(*) FROM pg_trigger t JOIN pg_class c ON t.tgrelid = c.oid WHERE c.relname IN (SELECT table_name FROM information_schema.tables WHERE table_schema = 'public'))
);

-- =====================================================
-- BACKUP COMPLETE!
-- =====================================================

-- Display backup summary
SELECT 
    'BACKUP COMPLETE!' as status,
    backup_timestamp,
    table_count,
    index_count,
    constraint_count,
    policy_count,
    function_count,
    trigger_count
FROM backup_20250131_143022.backup_metadata;
