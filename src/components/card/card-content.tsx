'use client'

import { useState, useMemo } from 'react'

import { createClient } from '@/lib/supabase/client'
import { 
  Heart, 
  Activity, 
  Coffee, 
  Brain,
  Thermometer,
  Target,
  Moon,
  Dumbbell,
  Utensils,
  Plane
} from 'lucide-react'

interface CardContentProps {
  userId: string
  date: string
  data: any
  onDataUpdate: () => void
}

// Dynamic category configuration
const CATEGORY_CONFIG = {
  sleep: { title: 'Sleep', icon: Moon, color: 'text-blue-400' },
  heart: { title: 'Heart Health', icon: Heart, color: 'text-red-400' },
  readiness: { title: 'Readiness', icon: Target, color: 'text-green-400' },
  activity: { title: 'Activity', icon: Activity, color: 'text-orange-400' },
  biometrics: { title: 'Biometrics', icon: Thermometer, color: 'text-purple-400' },
  wellness: { title: 'Wellness', icon: Brain, color: 'text-indigo-400' },
  nutrition: { title: 'Nutrition', icon: Utensils, color: 'text-yellow-400' },
  body: { title: 'Body', icon: Target, color: 'text-emerald-400' },
  workout: { title: 'Daily Workout', icon: Dumbbell, color: 'text-pink-400' },
  travel: { title: 'Travel', icon: Plane, color: 'text-cyan-400' },
  data_sources: { title: 'Data Sources', icon: Coffee, color: 'text-blue-400' }
}

// Helper function to categorize any metric
const categorizeMetric = (metricKey: string, value: any): string => {
  // AI-powered categorization based on metric name and value
  const lowerKey = metricKey.toLowerCase()
  
  if (lowerKey.includes('sleep') || lowerKey.includes('bed') || lowerKey.includes('rem') || lowerKey.includes('deep')) {
    return 'sleep'
  }
  if (lowerKey.includes('heart') || lowerKey.includes('hr') || lowerKey.includes('hrv') || lowerKey.includes('bpm')) {
    return 'heart'
  }
  if (lowerKey.includes('readiness') || lowerKey.includes('recovery')) {
    return 'readiness'
  }
  if (lowerKey.includes('activity') || lowerKey.includes('steps') || lowerKey.includes('calories') || lowerKey.includes('exercise_completed')) {
    return 'activity'
  }
  if (lowerKey.includes('temp') || lowerKey.includes('respiratory') || lowerKey.includes('glucose') || lowerKey.includes('oxygen')) {
    return 'biometrics'
  }
  if (lowerKey.includes('weight') || lowerKey.includes('body') || lowerKey.includes('congestion') || lowerKey.includes('health_status')) {
    return 'body'
  }
  if (lowerKey.includes('mood') || lowerKey.includes('energy') || lowerKey.includes('stress') || lowerKey.includes('anxiety') || lowerKey.includes('focus')) {
    return 'wellness'
  }
  if (lowerKey.includes('nutrition') || lowerKey.includes('food') || lowerKey.includes('water') || lowerKey.includes('vitamin')) {
    return 'nutrition'
  }
  if (lowerKey.includes('workout') || lowerKey.includes('exercise_plan') || lowerKey.includes('training') || lowerKey.includes('gym')) {
    return 'workout'
  }
  if (lowerKey.includes('travel') || lowerKey.includes('location') || lowerKey.includes('timezone')) {
    return 'travel'
  }
  if (lowerKey.includes('oura') || lowerKey.includes('apple_health') || lowerKey.includes('google_fit') || lowerKey.includes('samsung_health') || 
      lowerKey.includes('fitbit') || lowerKey.includes('garmin') || lowerKey.includes('whoop') || lowerKey.includes('polar') || 
      lowerKey.includes('suunto') || lowerKey.includes('coros') || lowerKey.includes('strava') || lowerKey.includes('nike_run_club') || 
      lowerKey.includes('mapmyrun') || lowerKey.includes('myfitnesspal') || lowerKey.includes('cronometer') || lowerKey.includes('lose_it') || 
      lowerKey.includes('noom') || lowerKey.includes('weight_watchers') || lowerKey.includes('peloton') || lowerKey.includes('zwift') || 
      lowerKey.includes('fitness_plus') || lowerKey.includes('fiton') || lowerKey.includes('freeletics') || lowerKey.includes('strong') || 
      lowerKey.includes('jefit') || lowerKey.includes('sleep_cycle') || lowerKey.includes('sleepscore') || lowerKey.includes('pillow') || 
      lowerKey.includes('autosleep') || lowerKey.includes('cal_ai') || lowerKey.includes('manual_entry') ||
      lowerKey.includes('data_source')) {
    return 'data_sources'
  }
  
  // Default to wellness for unknown metrics
  return 'wellness'
}

// Helper function to generate clean, non-redundant labels
const generateCleanLabel = (key: string, category: string): string => {
  // Remove redundant words based on category
  let cleanKey = key.replace(/_/g, ' ')
  
  // Remove category-specific redundant words
  if (category === 'wellness') {
    cleanKey = cleanKey.replace(/\b(today|level)\b/gi, '').trim()
  }
  if (category === 'body') {
    cleanKey = cleanKey.replace(/\b(health)\b/gi, '').trim()
  }
  if (category === 'sleep') {
    cleanKey = cleanKey.replace(/\b(sleep)\b/gi, '').trim()
  }
  if (category === 'heart') {
    cleanKey = cleanKey.replace(/\b(heart|hr)\b/gi, '').trim()
  }
  if (category === 'activity') {
    cleanKey = cleanKey.replace(/\b(activity)\b/gi, '').trim()
  }
  if (category === 'readiness') {
    cleanKey = cleanKey.replace(/\b(readiness)\b/gi, '').trim()
  }
  if (category === 'workout') {
    cleanKey = cleanKey.replace(/\b(workout)\b/gi, '').trim()
  }
  if (category === 'data_sources') {
    // Keep the original app names for data sources
    return cleanKey.replace(/_/g, ' ').replace(/\b\w/g, (l: string) => l.toUpperCase())
  }
  
  // Handle specific cases
  if (cleanKey.toLowerCase().includes('mood_today') || cleanKey.toLowerCase().includes('mood_mood')) return 'Mood'
  if (cleanKey.toLowerCase().includes('energy_level_today') || cleanKey.toLowerCase().includes('energy_energy')) return 'Energy'
  if (cleanKey.toLowerCase().includes('health_weight')) return 'Weight'
  if (cleanKey.toLowerCase().includes('health_congestion')) return 'Congestion'
  if (cleanKey.toLowerCase().includes('exercise_plan')) return 'Plan'
  if (cleanKey.toLowerCase().includes('workout_type')) return 'Type'
  if (cleanKey.toLowerCase().includes('workout_duration')) return 'Duration'
  if (cleanKey.toLowerCase().includes('workout_intensity')) return 'Intensity'
  if (cleanKey.toLowerCase().includes('heart_rate') || cleanKey.toLowerCase().includes('resting_heart_rate')) return 'Heart Rate'
  
  // Capitalize and clean up
  return cleanKey.replace(/\b\w/g, (l: string) => l.toUpperCase())
}

// Helper function to format metric values
const formatMetricValue = (key: string, value: any): { displayValue: string, unit: string } => {
  if (!value || value === '—') {
    return { displayValue: '—', unit: '' }
  }
  
  const lowerKey = key.toLowerCase()
  
  // Time-based metrics
  if ((lowerKey.includes('sleep') || lowerKey.includes('bed') || lowerKey.includes('rem') || lowerKey.includes('deep')) && 
      typeof value === 'number' && value > 60) {
    const hours = Math.floor(value / 60)
    const minutes = value % 60
    return { displayValue: `${hours}h ${minutes}m`, unit: '' }
  }
  
  // Percentage metrics
  if (lowerKey.includes('efficiency') || lowerKey.includes('score') && typeof value === 'number' && value <= 100) {
    return { displayValue: value.toString(), unit: '%' }
  }
  
  // Heart rate metrics
  if (lowerKey.includes('heart') || lowerKey.includes('hr') || lowerKey.includes('bpm')) {
    return { displayValue: value.toString(), unit: 'bpm' }
  }
  
  // HRV metrics
  if (lowerKey.includes('hrv') || lowerKey.includes('variability')) {
    return { displayValue: value.toString(), unit: 'ms' }
  }
  
  // Glucose metrics
  if (lowerKey.includes('glucose')) {
    return { displayValue: value.toString(), unit: 'mg/dL' }
  }
  
  // Temperature metrics
  if (lowerKey.includes('temp') || lowerKey.includes('temperature')) {
    return { displayValue: value.toString(), unit: '°F' }
  }
  
  // Respiratory rate
  if (lowerKey.includes('respiratory')) {
    return { displayValue: value.toString(), unit: '/min' }
  }
  
  // Rating metrics (1-10 scale)
  if (lowerKey.includes('mood') || lowerKey.includes('energy') || lowerKey.includes('stress')) {
    return { displayValue: value.toString(), unit: '/10' }
  }
  
  // Steps
  if (lowerKey.includes('steps')) {
    return { displayValue: value.toString(), unit: 'steps' }
  }
  
  // Calories
  if (lowerKey.includes('calories')) {
    return { displayValue: value.toString(), unit: 'cal' }
  }
  
  // Weight
  if (lowerKey.includes('weight')) {
    return { displayValue: value.toString(), unit: 'lbs' }
  }
  
  // Exercise plans and text-based metrics
  if (lowerKey.includes('exercise_plan') || lowerKey.includes('congestion_status') || lowerKey.includes('health_status')) {
    return { displayValue: value.toString(), unit: '' }
  }
  
  // Default
  return { displayValue: value.toString(), unit: '' }
}

export function CardContent({ userId, date, data, onDataUpdate }: CardContentProps) {
  const [editingField, setEditingField] = useState<string | null>(null)
  const [editValue, setEditValue] = useState('')

  // Debug logging
  console.log('CardContent data:', data)



  const handleEdit = (field: string, value: any) => {
    setEditingField(field)
    setEditValue(value?.toString() || '')
  }

  const handleSave = async (field: string) => {
    try {
      const supabase = createClient()
      
      const updatedSummary = { ...data }
      const fieldPath = field.split('.')
      let current = updatedSummary
      
      for (let i = 0; i < fieldPath.length - 1; i++) {
        if (!current[fieldPath[i]]) {
          current[fieldPath[i]] = {}
        }
        current = current[fieldPath[i]]
      }
      
      current[fieldPath[fieldPath.length - 1]] = editValue

      const { error } = await supabase
        .from('daily_log_cards')
        .update({ 
          summary: updatedSummary,
          last_updated: new Date().toISOString()
        })
        .eq('user_id', userId)
        .eq('log_date', date)

      if (error) {
        console.error('Error updating field:', error)
        return
      }

      setEditingField(null)
      setEditValue('')
      onDataUpdate()
    } catch (error) {
      console.error('Error saving field:', error)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent, field: string) => {
    if (e.key === 'Enter') {
      handleSave(field)
    } else if (e.key === 'Escape') {
      setEditingField(null)
      setEditValue('')
    }
  }

  // Dynamic metric categorization
  const categorizedMetrics = useMemo(() => {
    if (!data) return {}
    
    const categories: any = {}
    
    // Fields to exclude from categorization (metadata, not actual metrics)
    const excludedFields = [
      'context', 'created_at', 'updated_at', 'id', 'user_id', 'log_date',
      'source', 'app_name', 'last_updated', 'ocr_confidence', 'data_quality'
    ]
    
    console.log('🔍 Processing data for categorization:', data)
    
    // Process all data fields
    Object.entries(data).forEach(([key, value]) => {
      // Skip excluded fields and null/undefined values
      if (excludedFields.includes(key) || value === null || value === undefined || value === '—') {
        return
      }
      
      // Handle context_data specially - extract nested metrics
      if (key === 'context_data' && typeof value === 'object' && value !== null) {
        console.log('🔍 Processing context_data:', value)
        Object.entries(value).forEach(([categoryKey, categoryData]: [string, any]) => {
          if (typeof categoryData === 'object' && categoryData !== null) {
            Object.entries(categoryData).forEach(([metricKey, metricData]: [string, any]) => {
              if (typeof metricData === 'object' && metricData !== null && metricData.value !== undefined) {
                const fullKey = `${categoryKey}_${metricKey}`
                const category = categorizeMetric(fullKey, metricData.value)
                console.log(`🔍 Categorized ${fullKey} (${metricData.value}) as ${category}`)
                if (!categories[category]) {
                  categories[category] = []
                }
                categories[category].push({
                  key: fullKey,
                  value: metricData.value
                })
              }
            })
          }
        })
        return
      }
      
      // Skip other complex objects
      if (typeof value === 'object' && value !== null) {
        return
      }
      
      const category = categorizeMetric(key, value)
      if (!categories[category]) {
        categories[category] = []
      }
      categories[category].push({ key, value })
    })
    
    console.log('🔍 Final categorized metrics:', categories)
    return categories
  }, [data])

  const MetricCard = ({ icon: Icon, label, value, unit, field, category }: any) => {
    const isEditing = editingField === field
    const hasData = value && value !== '—'
    const categoryConfig = CATEGORY_CONFIG[category as keyof typeof CATEGORY_CONFIG]
    
    return (
      <div className="bg-card/60 backdrop-blur-sm border border-line/40 rounded-lg p-3 hover:border-primary/30 transition-colors min-h-[80px] max-h-[120px] flex flex-col overflow-hidden">
        {/* Header with icon and label */}
        <div className="flex items-center gap-2 mb-2 min-h-[20px]">
          <Icon className={`h-3 w-3 flex-shrink-0 ${categoryConfig?.color || 'text-primary'}`} />
          <span className="text-xs font-medium text-muted uppercase tracking-wide truncate">
            {label}
          </span>
        </div>
        
        {/* Value section - takes remaining space */}
        <div className="flex-1 flex items-end">
          <div className="w-full">
            {isEditing ? (
              <input
                type="text"
                value={editValue}
                onChange={(e) => setEditValue(e.target.value)}
                onBlur={() => handleSave(field)}
                onKeyDown={(e) => handleKeyDown(e, field)}
                className="w-full bg-transparent text-base font-semibold focus:outline-none focus:ring-2 focus:ring-primary/50 rounded px-2 py-1"
                autoFocus
              />
            ) : (
                          <div 
              className="text-base font-semibold cursor-pointer hover:text-primary transition-colors break-words leading-tight"
              onClick={() => handleEdit(field, value)}
            >
              {value || '—'}
            </div>
            )}
            {hasData && unit && (
              <div className="text-xs text-muted-foreground mt-1">
                {unit}
              </div>
            )}
          </div>
        </div>
      </div>
    )
  }

  const CategorySection = ({ category, metrics }: { category: string, metrics: any[] }) => {
    const categoryConfig = CATEGORY_CONFIG[category as keyof typeof CATEGORY_CONFIG]
    if (!categoryConfig || metrics.length === 0) return null
    
    const Icon = categoryConfig.icon
    
    return (
      <div className="space-y-4">
        <div className="flex items-center gap-3">
          <Icon className={`h-5 w-5 ${categoryConfig.color}`} />
          <h2 className="text-xl font-semibold">{categoryConfig.title}</h2>
        </div>
        
        <div className={`grid gap-3 ${
          category === 'data_sources' 
            ? 'grid-cols-1' // Full width for data sources
            : 'grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5'
        }`}>
          {metrics.map(({ key, value }) => {
            const { displayValue, unit } = formatMetricValue(key, value)
            
            // Generate clean, non-redundant labels
            const cleanLabel = generateCleanLabel(key, category)
            
            return (
              <MetricCard
                key={key}
                icon={Icon}
                label={cleanLabel}
                value={displayValue}
                unit={unit}
                field={key}
                category={category}
              />
            )
          })}
        </div>
      </div>
    )
  }

  return (
    <div className="h-full flex flex-col">
      {/* Content */}
      <div className="flex-1 overflow-y-auto p-6">
        {data ? (
          <div className="space-y-8">
            {/* Dynamic Category Sections */}
            {Object.entries(categorizedMetrics).map(([category, metrics]) => (
              <CategorySection
                key={category}
                category={category}
                metrics={metrics as any[]}
              />
            ))}
            


            {/* Last Updated */}
            {data?.last_updated && (
              <div className="text-xs text-muted-foreground text-center pt-4 border-t border-line/20">
                Last updated: {new Date(data.last_updated).toLocaleString()}
              </div>
            )}
          </div>
        ) : (
          <div className="flex items-center justify-center h-full min-h-[400px]">
            <div className="text-center text-muted-foreground max-w-md">
              <div className="w-16 h-16 bg-card/60 rounded-full flex items-center justify-center mx-auto mb-4">
                <Activity className="h-8 w-8 text-muted" />
              </div>
              <p className="text-xl font-medium mb-3">No data for this date</p>
              <p className="text-base mb-4">Your daily card will populate as soon as you start sharing data with Coach!</p>
              <div className="text-sm space-y-2">
                <p>💡 <strong>Get started:</strong></p>
                <p>• Upload a screenshot from your health app</p>
                <p>• Or chat with Coach about how you're feeling</p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
