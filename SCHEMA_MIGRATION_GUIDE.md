# 🏗️ **SCHEMA MIGRATION GUIDE**

## 🎯 **Overview**

This guide provides a complete, safe migration strategy to transform your Coach app's database schema from the current complex structure to an optimized, simplified design.

## 🛡️ **Safety Features**

- **Complete Backup**: Full database state backup before any changes
- **Branch Isolation**: Test in separate git and Supabase branches
- **Rollback Capability**: Restore to exact previous state if needed
- **Data Preservation**: All existing data is preserved and migrated

## 📋 **Migration Strategy**

### **Phase 1: Preparation**

1. Create git branch for migration
2. Create Supabase development branch
3. Backup current database state
4. Validate backup integrity

### **Phase 2: Schema Migration**

1. Create new optimized tables
2. Migrate data from old to new structure
3. Validate data integrity
4. Test application functionality

### **Phase 3: Rollback (if needed)**

1. Run rollback script
2. Restore exact previous state
3. Switch back to main branch

## 🚀 **Quick Start**

```bash
# 1. Run the setup script
./scripts/setup-migration-branch.sh

# 2. Follow the checklist in MIGRATION_CHECKLIST.md

# 3. If rollback needed:
./scripts/rollback-migration.sh
```

## 📊 **Schema Improvements**

### **Before (Current)**

- 25+ tables with complex relationships
- Inconsistent naming conventions
- Multiple workout tracking systems
- Complex metric categorization
- Scattered file management

### **After (Optimized)**

- 12 core tables with clear purposes
- Consistent naming conventions
- Unified workout system
- Simplified health metrics
- Streamlined file management

## 🔧 **Files Created**

- `scripts/backup-current-state.sql` - Complete database backup
- `scripts/migrate-to-new-schema.sql` - New schema creation
- `scripts/migrate-data-to-new-schema.sql` - Data migration
- `scripts/rollback-to-original-schema.sql` - Rollback script
- `scripts/setup-migration-branch.sh` - Setup automation
- `MIGRATION_CHECKLIST.md` - Step-by-step checklist

## 🎯 **Benefits**

1. **Simpler Queries**: Fewer JOINs, clearer relationships
2. **Better Performance**: Optimized indexes, reduced complexity
3. **Easier Maintenance**: Clear table purposes, consistent naming
4. **Scalable**: Easy to add new metrics, workout types, etc.
5. **Type-Safe**: Better TypeScript integration
6. **Future-Proof**: Flexible JSONB fields for extensibility

## 🚨 **Rollback Plan**

If any issues are encountered:

1. **Immediate Rollback**: Run `scripts/rollback-to-original-schema.sql`
2. **Git Rollback**: Switch back to main branch
3. **Cleanup**: Delete migration branch

The rollback will restore your database to the exact state before migration.

## 📝 **Next Steps**

1. **Review the migration plan** - Ensure it meets your needs
2. **Run the setup script** - Create the migration environment
3. **Follow the checklist** - Execute each step carefully
4. **Test thoroughly** - Validate all functionality
5. **Deploy gradually** - Use feature flags if needed

## 🤝 **Support**

If you encounter any issues during migration:

1. Check the migration checklist
2. Review the rollback plan
3. Test in the development branch first
4. Use the rollback script if needed

---

**Remember**: This migration is designed to be completely reversible. Your data is safe! 🛡️
