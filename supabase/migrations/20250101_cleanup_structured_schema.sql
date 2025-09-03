-- Cleanup and finalize structured metrics schema
-- This migration documents the current state after removing duplicate tables

-- Drop old tables that are no longer needed
DROP TABLE IF EXISTS daily_metrics;
DROP TABLE IF EXISTS daily_log_cards;

-- Verify the current schema is clean and aligned
-- All data now flows through the structured metrics system:
-- 1. OCR data → user_daily_metrics (via /api/metrics/daily)
-- 2. Conversation data → user_daily_metrics (via /api/health/store)
-- 3. Daily Card reads from user_daily_metrics only

-- The structured metrics system provides:
-- - metric_categories: Predefined categories (sleep, health, activity, etc.)
-- - standard_metrics: Standard metrics for each category
-- - user_daily_metrics: User-specific daily metric values
-- - user_metric_preferences: User preferences for metric display

-- This ensures:
-- - Single source of truth for daily metrics
-- - Consistent data structure across all sources
-- - No duplicate tables or conflicting data flows
-- - Clean, maintainable schema
