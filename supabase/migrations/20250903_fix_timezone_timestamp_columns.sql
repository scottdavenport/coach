-- Fix timezone timestamp columns migration
-- This migration converts timestamp columns to TIMESTAMP WITH TIME ZONE for proper timezone handling

-- Fix weekly_summaries table
ALTER TABLE weekly_summaries 
  ALTER COLUMN created_at TYPE TIMESTAMP WITH TIME ZONE,
  ALTER COLUMN updated_at TYPE TIMESTAMP WITH TIME ZONE;

-- Fix monthly_trends table  
ALTER TABLE monthly_trends
  ALTER COLUMN created_at TYPE TIMESTAMP WITH TIME ZONE,
  ALTER COLUMN updated_at TYPE TIMESTAMP WITH TIME ZONE;

-- Update default values to use timezone-aware NOW()
ALTER TABLE weekly_summaries 
  ALTER COLUMN created_at SET DEFAULT NOW(),
  ALTER COLUMN updated_at SET DEFAULT NOW();

ALTER TABLE monthly_trends
  ALTER COLUMN created_at SET DEFAULT NOW(),
  ALTER COLUMN updated_at SET DEFAULT NOW();

-- Add timezone-aware indexes for better performance
CREATE INDEX IF NOT EXISTS idx_weekly_summaries_created_at_tz ON weekly_summaries(created_at);
CREATE INDEX IF NOT EXISTS idx_monthly_trends_created_at_tz ON monthly_trends(created_at);

-- Add comments to clarify timezone handling
COMMENT ON COLUMN weekly_summaries.created_at IS 'Timestamp with timezone awareness for accurate tracking across regions';
COMMENT ON COLUMN weekly_summaries.updated_at IS 'Timestamp with timezone awareness for accurate tracking across regions';
COMMENT ON COLUMN monthly_trends.created_at IS 'Timestamp with timezone awareness for accurate tracking across regions';
COMMENT ON COLUMN monthly_trends.updated_at IS 'Timestamp with timezone awareness for accurate tracking across regions';