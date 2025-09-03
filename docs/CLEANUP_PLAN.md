# Database Schema Cleanup Plan

## 🚨 Current Issues

### 1. Duplicate Tables
- `daily_metrics` (old) - 0 rows
- `user_daily_metrics` (new structured) - 0 rows  
- `daily_log_cards` (old JSONB) - 1 row (contains old OCR data)

### 2. Schema Misalignment
- Local `schema.sql` doesn't match actual database
- Migration files don't reflect current state
- Code references both old and new systems

### 3. Data Flow Confusion
- OCR data stored in `daily_log_cards` (old)
- Conversation data stored in `user_daily_metrics` (new)
- Different storage patterns for same data type

## 🎯 Cleanup Strategy

### Phase 1: Remove Old Tables
1. **Drop `daily_metrics` table** (unused, 0 rows)
2. **Drop `daily_log_cards` table** (old system, 1 row)
3. **Keep `user_daily_metrics`** (new structured system)

### Phase 2: Update Schema Files
1. **Update local `schema.sql`** to match actual database
2. **Create new migration** to document current state
3. **Remove outdated migration files**

### Phase 3: Verify Data Flow
1. **OCR data** → `user_daily_metrics` (via `/api/metrics/daily`)
2. **Conversation data** → `user_daily_metrics` (via `/api/health/store`)
3. **Daily Card** reads from `user_daily_metrics` only

### Phase 4: Code Cleanup
1. **Remove references** to old tables
2. **Update all data access** to use new structured system
3. **Test data flow** end-to-end

## 📋 Implementation Steps

### Step 1: Drop Old Tables
```sql
-- Drop old metrics table (unused)
DROP TABLE IF EXISTS daily_metrics;

-- Drop old log cards table (contains old data)
DROP TABLE IF EXISTS daily_log_cards;
```

### Step 2: Update Schema Documentation
- Update `src/lib/supabase/schema.sql`
- Create new migration file
- Remove outdated migrations

### Step 3: Verify Code Alignment
- All data storage uses `user_daily_metrics`
- All data retrieval uses `user_daily_metrics`
- No references to old tables

### Step 4: Test Data Flow
- OCR upload → structured storage → Daily Card display
- Conversation → structured storage → Daily Card display
- No duplicate key errors
- Clean data organization

## ✅ Success Criteria

1. **Single source of truth** for daily metrics (`user_daily_metrics`)
2. **Consistent data flow** from all sources
3. **Clean schema** with no duplicate tables
4. **Working Daily Card** with beautiful tile layout
5. **No React key errors** or duplicate data issues
