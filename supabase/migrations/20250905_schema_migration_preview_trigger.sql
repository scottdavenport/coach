-- =====================================================
-- SCHEMA MIGRATION PREVIEW TRIGGER
-- =====================================================
-- This migration file is created to trigger Supabase preview branch creation
-- for testing the database schema migration safely.

-- This file will be removed after the migration is complete
-- It serves only to trigger the automatic preview branch creation

-- No actual schema changes are made in this file
-- The real migration scripts are in the scripts/ directory

-- This ensures we can test the migration in an isolated environment
-- before applying changes to production

-- Migration will be tested in preview branch:
-- 1. Run scripts/backup-current-state.sql
-- 2. Run scripts/migrate-to-new-schema.sql  
-- 3. Run scripts/migrate-data-to-new-schema.sql
-- 4. Test application functionality
-- 5. Merge PR if successful, or rollback if issues found

-- Rollback script available: scripts/rollback-to-original-schema.sql
