-- Update default timezone to East Coast US for better user experience
-- This migration updates the default timezone from UTC to America/New_York

-- Update the column default for new users
ALTER TABLE users 
ALTER COLUMN timezone SET DEFAULT 'America/New_York';

-- Update existing users who have UTC as their timezone (indicating no preference was set)
UPDATE users 
SET timezone = 'America/New_York' 
WHERE timezone = 'UTC' OR timezone IS NULL;

-- Add comment to clarify the change
COMMENT ON COLUMN users.timezone IS 'User preferred timezone (e.g., America/New_York, Europe/London). Defaults to East Coast US for better user experience.';
