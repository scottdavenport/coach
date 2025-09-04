-- Add timezone preference to user profiles
-- This allows users to set their preferred timezone for date display and operations

-- Add timezone column to users table
ALTER TABLE users 
ADD COLUMN timezone TEXT DEFAULT 'America/New_York';

-- Add comment to clarify usage
COMMENT ON COLUMN users.timezone IS 'User preferred timezone (e.g., America/New_York, Europe/London). Used for date display and operations.';

-- Create index for timezone queries (useful for analytics)
CREATE INDEX IF NOT EXISTS idx_users_timezone ON users(timezone);

-- Update existing users to have East Coast US as default timezone
UPDATE users SET timezone = 'America/New_York' WHERE timezone IS NULL;
