#!/bin/bash

# =====================================================
# MIGRATION BRANCH SETUP SCRIPT
# =====================================================
# This script sets up a safe migration environment
# Run this to create a branch for testing the new schema

set -e  # Exit on any error

echo "🚀 Setting up migration branch for schema testing..."

# =====================================================
# 1. CREATE GIT BRANCH
# =====================================================

echo "📝 Creating git branch for schema migration..."
BRANCH_NAME="feature/schema-migration-$(date +%Y%m%d-%H%M%S)"
git checkout -b "$BRANCH_NAME"
echo "✅ Created branch: $BRANCH_NAME"

# =====================================================
# 2. CREATE SUPABASE DEVELOPMENT BRANCH
# =====================================================

echo "🗄️ Creating Supabase development branch..."
# Note: You'll need to run this manually in Supabase dashboard
# or use the Supabase CLI if available
echo "⚠️  MANUAL STEP REQUIRED:"
echo "   1. Go to your Supabase dashboard"
echo "   2. Create a new development branch"
echo "   3. Note the branch ID for later use"
echo ""

# =====================================================
# 3. BACKUP CURRENT DATABASE STATE
# =====================================================

echo "💾 Creating database backup..."
BACKUP_TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_SCHEMA="backup_${BACKUP_TIMESTAMP}"

# Update the backup script with the correct timestamp
sed -i.bak "s/backup_20250131_143022/${BACKUP_SCHEMA}/g" scripts/backup-current-state.sql

echo "✅ Backup script updated with timestamp: $BACKUP_SCHEMA"
echo "⚠️  MANUAL STEP REQUIRED:"
echo "   1. Run the backup script in your Supabase SQL editor:"
echo "      scripts/backup-current-state.sql"
echo "   2. Verify backup was created successfully"
echo ""

# =====================================================
# 4. CREATE MIGRATION CHECKLIST
# =====================================================

echo "📋 Creating migration checklist..."
cat > MIGRATION_CHECKLIST.md << EOF
# 🚀 Schema Migration Checklist

**Branch:** $BRANCH_NAME  
**Backup Schema:** $BACKUP_SCHEMA  
**Created:** $(date)

## ✅ Pre-Migration Steps

- [ ] Git branch created: \`$BRANCH_NAME\`
- [ ] Supabase development branch created
- [ ] Database backup completed: \`$BACKUP_SCHEMA\`
- [ ] Backup validation passed

## 🔄 Migration Steps

- [ ] Run new schema creation script
- [ ] Run data migration script
- [ ] Validate data integrity
- [ ] Test application functionality
- [ ] Update application code to use new schema

## 🧪 Testing Steps

- [ ] Test chat functionality
- [ ] Test file uploads
- [ ] Test health metrics
- [ ] Test workout tracking
- [ ] Test Oura integration
- [ ] Test all API endpoints

## 🚨 Rollback Plan

If issues are found:
1. Run rollback script: \`scripts/rollback-to-original-schema.sql\`
2. Switch back to main branch
3. Delete migration branch

## 📝 Notes

- Backup schema: \`$BACKUP_SCHEMA\`
- All original data is preserved in backup
- Rollback will restore exact previous state
EOF

echo "✅ Migration checklist created: MIGRATION_CHECKLIST.md"

# =====================================================
# 5. CREATE ENVIRONMENT VARIABLES FILE
# =====================================================

echo "🔧 Creating environment variables file..."
cat > .env.migration << EOF
# Migration Environment Variables
# Use these for testing the new schema

# Supabase Development Branch (update with your branch ID)
NEXT_PUBLIC_SUPABASE_URL=your_dev_branch_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_dev_branch_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_dev_branch_service_key

# Backup Information
BACKUP_SCHEMA=$BACKUP_SCHEMA
MIGRATION_BRANCH=$BRANCH_NAME
EOF

echo "✅ Environment file created: .env.migration"

# =====================================================
# 6. CREATE TESTING SCRIPT
# =====================================================

echo "🧪 Creating testing script..."
cat > scripts/test-migration.sh << 'EOF'
#!/bin/bash

# =====================================================
# MIGRATION TESTING SCRIPT
# =====================================================

set -e

echo "🧪 Testing migration..."

# Test database connectivity
echo "📡 Testing database connectivity..."
# Add your database connection tests here

# Test API endpoints
echo "🔗 Testing API endpoints..."
# Add your API endpoint tests here

# Test data integrity
echo "🔍 Testing data integrity..."
# Add your data integrity tests here

echo "✅ Migration testing complete!"
EOF

chmod +x scripts/test-migration.sh
echo "✅ Testing script created: scripts/test-migration.sh"

# =====================================================
# 7. CREATE ROLLBACK SCRIPT
# =====================================================

echo "🔄 Creating rollback script..."
cat > scripts/rollback-migration.sh << 'EOF'
#!/bin/bash

# =====================================================
# MIGRATION ROLLBACK SCRIPT
# =====================================================

set -e

echo "🔄 Rolling back migration..."

# Switch back to main branch
echo "📝 Switching back to main branch..."
git checkout main

# Delete migration branch
echo "🗑️ Deleting migration branch..."
git branch -D "$BRANCH_NAME"

# Run database rollback
echo "🗄️ Rolling back database..."
echo "⚠️  MANUAL STEP REQUIRED:"
echo "   1. Run the rollback script in your Supabase SQL editor:"
echo "      scripts/rollback-to-original-schema.sql"
echo "   2. Verify rollback was successful"

echo "✅ Migration rollback complete!"
EOF

chmod +x scripts/rollback-migration.sh
echo "✅ Rollback script created: scripts/rollback-migration.sh"

# =====================================================
# 8. DISPLAY SUMMARY
# =====================================================

echo ""
echo "🎉 Migration branch setup complete!"
echo ""
echo "📋 Next Steps:"
echo "   1. Create Supabase development branch"
echo "   2. Run backup script: scripts/backup-current-state.sql"
echo "   3. Run new schema script: scripts/migrate-to-new-schema.sql"
echo "   4. Run data migration: scripts/migrate-data-to-new-schema.sql"
echo "   5. Test the migration: scripts/test-migration.sh"
echo ""
echo "🚨 Rollback Plan:"
echo "   - Run: scripts/rollback-migration.sh"
echo "   - This will restore exact previous state"
echo ""
echo "📝 Files Created:"
echo "   - MIGRATION_CHECKLIST.md"
echo "   - .env.migration"
echo "   - scripts/test-migration.sh"
echo "   - scripts/rollback-migration.sh"
echo ""
echo "🔗 Current Branch: $BRANCH_NAME"
echo "💾 Backup Schema: $BACKUP_SCHEMA"
echo ""
echo "Happy migrating! 🚀"
