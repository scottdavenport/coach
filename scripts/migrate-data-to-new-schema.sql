-- =====================================================
-- DATA MIGRATION SCRIPT
-- =====================================================
-- This script migrates data from old tables to new tables
-- Run this AFTER creating the new schema

-- =====================================================
-- 1. MIGRATE CONVERSATION DATA
-- =====================================================

-- Migrate conversations (combine user and assistant messages)
INSERT INTO conversations_new (id, user_id, message, role, metadata, created_at)
SELECT 
    id,
    user_id,
    message,
    CASE 
        WHEN message_type = 'system' THEN 'system'
        ELSE 'user' -- Assume all old messages are user messages
    END as role,
    metadata,
    created_at
FROM conversations
WHERE message IS NOT NULL;

-- =====================================================
-- 2. MIGRATE HEALTH METRICS DATA
-- =====================================================

-- Migrate user_daily_metrics to new health_metrics format
INSERT INTO health_metrics_new (
    user_id, 
    metric_date, 
    category, 
    metric_name, 
    value, 
    unit, 
    source, 
    confidence, 
    created_at, 
    updated_at
)
SELECT 
    udm.user_id,
    udm.metric_date,
    COALESCE(mc.name, 'unknown') as category,
    sm.metric_key as metric_name,
    udm.metric_value as value,
    sm.unit,
    udm.source,
    udm.confidence,
    udm.created_at,
    udm.updated_at
FROM user_daily_metrics udm
JOIN standard_metrics sm ON udm.metric_id = sm.id
LEFT JOIN metric_categories mc ON sm.category_id = mc.id
WHERE udm.metric_value IS NOT NULL;

-- Migrate text values
INSERT INTO health_metrics_new (
    user_id, 
    metric_date, 
    category, 
    metric_name, 
    value, 
    unit, 
    source, 
    confidence, 
    created_at, 
    updated_at
)
SELECT 
    udm.user_id,
    udm.metric_date,
    COALESCE(mc.name, 'unknown') as category,
    sm.metric_key as metric_name,
    NULL as value, -- Text values don't have numeric values
    sm.unit,
    udm.source,
    udm.confidence,
    udm.created_at,
    udm.updated_at
FROM user_daily_metrics udm
JOIN standard_metrics sm ON udm.metric_id = sm.id
LEFT JOIN metric_categories mc ON sm.category_id = mc.id
WHERE udm.text_value IS NOT NULL;

-- =====================================================
-- 3. MIGRATE WORKOUT DATA
-- =====================================================

-- Migrate user_workouts to new workouts format
INSERT INTO workouts_new (
    id,
    user_id,
    workout_date,
    name,
    category,
    exercises,
    total_duration,
    notes,
    mood_before,
    mood_after,
    energy_before,
    energy_after,
    perceived_exertion,
    status,
    created_at,
    updated_at
)
SELECT 
    uw.id,
    uw.user_id,
    uw.workout_date,
    uw.workout_name,
    uw.category,
    -- Convert workout_exercises to JSONB format
    COALESCE(
        (
            SELECT jsonb_agg(
                jsonb_build_object(
                    'exercise_id', we.exercise_id,
                    'exercise_name', e.name,
                    'order_index', we.order_index,
                    'sets_completed', we.sets_completed,
                    'reps_completed', we.reps_completed,
                    'duration_completed', we.duration_completed,
                    'weight_used', we.weight_used,
                    'rest_taken', we.rest_taken,
                    'notes', we.notes,
                    'difficulty_rating', we.difficulty_rating
                )
                ORDER BY we.order_index
            )
            FROM workout_exercises we
            LEFT JOIN exercises e ON we.exercise_id = e.id
            WHERE we.workout_id = uw.id
        ),
        '[]'::jsonb
    ) as exercises,
    uw.total_duration,
    uw.notes,
    uw.mood_before,
    uw.mood_after,
    uw.energy_before,
    uw.energy_after,
    uw.perceived_exertion,
    uw.completion_status,
    uw.created_at,
    uw.updated_at
FROM user_workouts uw;

-- Migrate workout templates
INSERT INTO workout_templates_new (
    id,
    name,
    description,
    category,
    difficulty_level,
    estimated_duration,
    exercises,
    equipment_required,
    target_audience,
    created_at,
    updated_at
)
SELECT 
    wt.id,
    wt.name,
    wt.description,
    wt.category,
    wt.difficulty_level,
    wt.estimated_duration,
    -- Convert template_exercises to JSONB format
    COALESCE(
        (
            SELECT jsonb_agg(
                jsonb_build_object(
                    'exercise_id', te.exercise_id,
                    'exercise_name', e.name,
                    'order_index', te.order_index,
                    'sets', te.sets,
                    'reps', te.reps,
                    'duration_seconds', te.duration_seconds,
                    'weight_kg', te.weight_kg,
                    'rest_seconds', te.rest_seconds,
                    'notes', te.notes
                )
                ORDER BY te.order_index
            )
            FROM template_exercises te
            LEFT JOIN exercises e ON te.exercise_id = e.id
            WHERE te.template_id = wt.id
        ),
        '[]'::jsonb
    ) as exercises,
    wt.equipment_required,
    wt.target_audience,
    wt.created_at,
    wt.updated_at
FROM workout_templates wt;

-- =====================================================
-- 4. MIGRATE FILE DATA
-- =====================================================

-- Migrate user_uploads to new files format
INSERT INTO files_new (
    id,
    user_id,
    filename,
    file_url,
    file_type,
    mime_type,
    file_size,
    processing_status,
    extracted_content,
    processed_data,
    processing_error,
    created_at,
    processed_at
)
SELECT 
    uu.id,
    uu.user_id,
    uu.file_name,
    uu.file_url,
    uu.file_type,
    uu.mime_type,
    uu.file_size,
    COALESCE(uu.processing_status, 'completed') as processing_status,
    uu.ocr_text as extracted_content,
    uu.processed_data,
    uu.processing_error,
    uu.created_at,
    uu.processed_at
FROM user_uploads uu;

-- Migrate conversation file attachments
INSERT INTO conversation_files_new (
    conversation_id,
    file_id,
    created_at
)
SELECT 
    cfa.conversation_id,
    cfa.file_id,
    cfa.created_at
FROM conversation_file_attachments cfa;

-- =====================================================
-- 5. MIGRATE AI-GENERATED CONTENT
-- =====================================================

-- Migrate daily_journal to daily_insights
INSERT INTO daily_insights_new (
    user_id,
    insight_date,
    insight_type,
    title,
    content,
    data_sources,
    confidence,
    created_at
)
SELECT 
    dj.user_id,
    dj.journal_date,
    dj.entry_type as insight_type,
    dj.category as title,
    dj.content,
    ARRAY[dj.source] as data_sources,
    dj.confidence,
    dj.created_at
FROM daily_journal dj;

-- Migrate weekly_summaries
INSERT INTO weekly_summaries_new (
    user_id,
    week_start,
    summary,
    trends,
    recommendations,
    created_at
)
SELECT 
    ws.user_id,
    ws.week_start,
    ws.summary,
    ws.trends,
    NULL as recommendations, -- No recommendations field in old table
    ws.created_at
FROM weekly_summaries ws;

-- =====================================================
-- 6. MIGRATE USER PREFERENCES AND GOALS
-- =====================================================

-- Migrate user_workout_preferences to user_preferences
INSERT INTO user_preferences_new (
    user_id,
    fitness_level,
    primary_goals,
    available_equipment,
    preferred_workout_duration,
    preferred_workout_times,
    workout_frequency,
    injury_limitations,
    exercise_preferences,
    created_at,
    updated_at
)
SELECT 
    uwp.user_id,
    uwp.fitness_level,
    uwp.primary_goals,
    uwp.available_equipment,
    uwp.preferred_workout_duration,
    uwp.preferred_workout_times,
    uwp.workout_frequency,
    uwp.injury_limitations,
    uwp.exercise_preferences,
    uwp.created_at,
    uwp.updated_at
FROM user_workout_preferences uwp;

-- Migrate daily_goals
INSERT INTO daily_goals_new (
    user_id,
    goal_date,
    goal_type,
    title,
    description,
    is_completed,
    created_at,
    updated_at
)
SELECT 
    dg.user_id,
    dg.goal_date,
    dg.goal_type,
    dg.goal_title,
    dg.goal_description,
    dg.is_completed,
    dg.created_at,
    dg.updated_at
FROM daily_goals dg;

-- =====================================================
-- 7. MIGRATE CONVERSATION INSIGHTS
-- =====================================================

-- Migrate conversation_insights
INSERT INTO conversation_insights_new (
    conversation_id,
    insight_type,
    data,
    confidence,
    created_at
)
SELECT 
    ci.conversation_id,
    'conversation_insight' as insight_type,
    jsonb_build_object(
        'insights', ci.insights,
        'data_types', ci.data_types,
        'follow_up_questions', ci.follow_up_questions
    ) as data,
    0.8 as confidence,
    ci.created_at
FROM conversation_insights ci;

-- =====================================================
-- 8. DATA MIGRATION SUMMARY
-- =====================================================

-- Display migration summary
SELECT 
    'DATA MIGRATION COMPLETE!' as status,
    (SELECT COUNT(*) FROM conversations_new) as conversations_migrated,
    (SELECT COUNT(*) FROM health_metrics_new) as health_metrics_migrated,
    (SELECT COUNT(*) FROM workouts_new) as workouts_migrated,
    (SELECT COUNT(*) FROM workout_templates_new) as workout_templates_migrated,
    (SELECT COUNT(*) FROM files_new) as files_migrated,
    (SELECT COUNT(*) FROM conversation_files_new) as conversation_files_migrated,
    (SELECT COUNT(*) FROM daily_insights_new) as daily_insights_migrated,
    (SELECT COUNT(*) FROM weekly_summaries_new) as weekly_summaries_migrated,
    (SELECT COUNT(*) FROM user_preferences_new) as user_preferences_migrated,
    (SELECT COUNT(*) FROM daily_goals_new) as daily_goals_migrated,
    (SELECT COUNT(*) FROM conversation_insights_new) as conversation_insights_migrated;

-- =====================================================
-- 9. VALIDATION QUERIES
-- =====================================================

-- Validate data integrity
SELECT 
    'VALIDATION RESULTS' as check_type,
    CASE 
        WHEN (SELECT COUNT(*) FROM conversations) = (SELECT COUNT(*) FROM conversations_new) 
        THEN 'PASS' 
        ELSE 'FAIL' 
    END as conversations_check,
    CASE 
        WHEN (SELECT COUNT(*) FROM user_daily_metrics) = (SELECT COUNT(*) FROM health_metrics_new) 
        THEN 'PASS' 
        ELSE 'FAIL' 
    END as health_metrics_check,
    CASE 
        WHEN (SELECT COUNT(*) FROM user_workouts) = (SELECT COUNT(*) FROM workouts_new) 
        THEN 'PASS' 
        ELSE 'FAIL' 
    END as workouts_check,
    CASE 
        WHEN (SELECT COUNT(*) FROM user_uploads) = (SELECT COUNT(*) FROM files_new) 
        THEN 'PASS' 
        ELSE 'FAIL' 
    END as files_check;
