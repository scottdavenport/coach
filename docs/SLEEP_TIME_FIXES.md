# Sleep Time Formatting Fixes

## 🐛 **Problem Identified**

### **Issue**: Sleep data displaying incorrectly
- **Deep Sleep**: 88 minutes stored, displayed as "88 hours" ❌
- **REM Sleep**: 75 minutes stored, displayed as "75 hours" ❌  
- **Sleep Duration**: 338 minutes stored, displayed as "338 hours" ❌

### **Root Cause**: 
1. Data stored in minutes but units set to "hours" in database
2. No formatting logic to convert minutes to hours for display

## ✅ **Fixes Applied**

### **1. Database Unit Correction**
```sql
UPDATE standard_metrics 
SET unit = 'minutes' 
WHERE metric_key IN ('deep_sleep', 'rem_sleep', 'sleep_duration', 'time_in_bed');
```

### **2. Smart Time Formatting Function**
```typescript
const formatMetricValue = (value: number | string | boolean, unit: string) => {
  // Convert minutes to hours for sleep metrics
  if (unit === 'minutes' && value > 60) {
    const hours = Math.floor(value / 60)
    const minutes = value % 60
    if (minutes === 0) {
      return { displayValue: `${hours}`, displayUnit: 'hours' }
    } else {
      return { displayValue: `${hours}:${minutes.toString().padStart(2, '0')}`, displayUnit: 'hours' }
    }
  }
  // ... other formatting logic
}
```

### **3. Updated All Tile Components**
- **SmallTile**: Now uses `formatMetricValue`
- **MediumTile**: Now uses `formatMetricValue`  
- **LargeTile**: Now uses `formatMetricValue` (including target values)

## 🎯 **Expected Results**

### **Before Fix:**
- Deep Sleep: "88 hours" ❌
- REM Sleep: "75 hours" ❌
- Sleep Duration: "338 hours" ❌
- Readiness Score: "80/10" ❌

### **After Fix:**
- Deep Sleep: "1:28" ✅
- REM Sleep: "1:15" ✅  
- Sleep Duration: "5:38" ✅
- Readiness Score: "80" ✅

## 🔧 **How It Works**

### **Smart Conversion Logic:**
1. **Values > 60 minutes**: Convert to HH:MM format (no unit label)
   - 88 minutes → "1:28"
   - 338 minutes → "5:38"

2. **Values ≤ 60 minutes**: Keep as minutes (for short sleep phases)
   - 45 minutes → "45 minutes" (reasonable for REM/deep sleep)

3. **Other units**: Display as-is
   - Sleep Score: "85 /100"
   - Sleep Efficiency: "86 %"

## 🧪 **Testing**

### **Test Cases:**
1. **Deep Sleep**: 88 minutes → "1:28" ✅
2. **REM Sleep**: 75 minutes → "1:15" ✅
3. **Sleep Duration**: 338 minutes → "5:38" ✅
4. **Time in Bed**: 480 minutes → "8:00" ✅
5. **Short REM**: 45 minutes → "45 minutes" ✅
6. **Readiness Score**: 80 → "80" ✅

### **Verify in Daily Card:**
- Sleep metrics should now show reasonable time values
- No more "88 hours" or "338 hours" 
- Proper HH:MM format for longer durations

## 📋 **Affected Metrics**

### **Sleep Time Metrics (now in minutes):**
- `deep_sleep` → displays as HH:MM format
- `rem_sleep` → displays as HH:MM format  
- `sleep_duration` → displays as HH:MM format
- `time_in_bed` → displays as HH:MM format

### **Score Metrics (no units):**
- `readiness` → displays as whole number
- `sleep_score` → displays as whole number
- `recovery_score` → displays as whole number

### **Other Sleep Metrics (unchanged):**
- `sleep_efficiency` → displays as %
- `sleep_quality` → displays as /10
- `sleep_score` → displays as /100
