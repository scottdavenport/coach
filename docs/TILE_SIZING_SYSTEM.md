# New Tile Sizing System

## 🎯 **Consistent Tile Sizes**

### **Small Tiles** (Square - 1x1 grid cell)
- **Grid Span**: `col-span-1 row-span-1`
- **Shape**: Square (`aspect-square`)
- **Padding**: `p-4`
- **Font Size**: `text-xl` (consistent)
- **Use**: Simple metrics that fit well in a compact space
- **Current Examples**: All sleep metrics (same size)

### **Medium Tiles** (Rectangle - 2x1 grid cell)
- **Grid Span**: `col-span-2 row-span-1`
- **Shape**: Rectangle (`aspect-[2/1]`)
- **Padding**: `p-4`
- **Font Size**: `text-xl` (consistent)
- **Features**: Progress bar
- **Use**: Metrics that need more horizontal space

### **Large Tiles** (Square - 2x2 grid cell)
- **Grid Span**: `col-span-2 row-span-2`
- **Shape**: Square (`aspect-square`)
- **Padding**: `p-6`
- **Font Size**: `text-xl` (consistent)
- **Features**: Target section + progress bar
- **Use**: Complex metrics with additional features

## 🔍 **New Size Assignment Logic**

```typescript
const getTileSize = (metricKey: string, value: any): 'small' | 'medium' | 'large' => {
  const key = metricKey.toLowerCase()
  
  // For now, all sleep metrics are small tiles (same size)
  if (key.includes('sleep')) {
    return 'small'
  }
  
  // Large tiles for complex metrics with targets/progress
  if (key.includes('weight') || key.includes('vo2_max') || key.includes('workout')) {
    return 'large'
  }
  
  // Medium tiles for metrics that need more horizontal space
  if (key.includes('steps') || key.includes('calories') || key.includes('distance')) {
    return 'medium'
  }
  
  // Small tiles for everything else
  return 'small'
}
```

## 📊 **Current Metric Assignments**

### **Small Tiles (All Sleep Metrics):**
- `sleep_score` → Small (square)
- `deep_sleep` → Small (square)
- `rem_sleep` → Small (square)
- `sleep_duration` → Small (square)
- `sleep_efficiency` → Small (square)
- `sleep_quality` → Small (square)
- `time_in_bed` → Small (square)

### **Medium Tiles:**
- `steps` → Medium (rectangle, 2 cells wide)
- `calories` → Medium (rectangle, 2 cells wide)
- `distance` → Medium (rectangle, 2 cells wide)

### **Large Tiles:**
- `weight` → Large (2x2 square)
- `vo2_max` → Large (2x2 square)
- `workout` → Large (2x2 square)

## 🎨 **Grid Layout**

### **Base Grid:**
```css
grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4
```

### **Tile Spans:**
- **Small**: 1x1 cell
- **Medium**: 2x1 cells (2 wide, 1 tall)
- **Large**: 2x2 cells (2 wide, 2 tall)

## 🧪 **Testing**

### **Check Console:**
Look for debug logs like:
```
🔍 sleep_score: small tile
🔍 deep_sleep: small tile
🔍 steps: medium tile
```

### **Visual Verification:**
1. **All sleep metrics** should be the same size (small squares)
2. **Medium tiles** should be rectangles (2 cells wide, 1 cell tall)
3. **Large tiles** should be squares (2x2 cells)
4. **Font sizes** should be consistent across all tiles (`text-xl`)

## 🔧 **Key Improvements**

### **1. Consistent Sizing**
- All tiles use consistent font sizes (`text-xl`)
- Clear aspect ratios for each size
- Uniform padding and spacing

### **2. Logical Grid System**
- Small: 1x1 grid cell (square)
- Medium: 2x1 grid cell (rectangle)
- Large: 2x2 grid cell (square)

### **3. Sleep Metrics Uniformity**
- All sleep metrics are now the same size
- Creates a clean, consistent appearance
- No more confusing size variations

### **4. Better Visual Hierarchy**
- Clear distinction between tile sizes
- Logical progression from small to large
- Consistent styling across all sizes
