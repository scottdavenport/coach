'use client'

import { useState, useMemo } from 'react'

import { createClient } from '@/lib/supabase/client'
import { separateDataByType, ClassifiedData } from '@/lib/data-classification'
import { DailyJournal } from './daily-journal'
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
  Plane,
  Edit3,
  Trash2
} from 'lucide-react'

// Types are used in the interface definitions

interface CardContentProps {
  userId: string
  date: string
  data: {
    metrics: Array<{
      id: string
      metric_type: string
      metric_value: number
      metric_unit: string
      source: string
      confidence: number
      created_at: string
    }>
    journalEntries: Array<{
      id: string
      entry_type: string
      category: string
      content: string
      source: string
      confidence: number
      created_at: string
    }>
    goals: any[]
    date: string
  } | null
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
const categorizeMetric = (metricKey: string): string => {
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
  if (value === null || value === undefined || value === '—') {
    return { displayValue: '—', unit: '' }
  }
  
  const lowerKey = key.toLowerCase()
  
  // Boolean values (like workout_completed)
  if (typeof value === 'boolean') {
    return { displayValue: value ? 'Completed' : 'Not Completed', unit: '' }
  }
  
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
      
      // Update the metric in the daily_metrics table
      const { error } = await supabase
        .from('daily_metrics')
        .update({ 
          metric_value: parseFloat(editValue),
          updated_at: new Date().toISOString()
        })
        .eq('user_id', userId)
        .eq('metric_date', date)
        .eq('metric_type', field)

      if (error) {
        console.error('Error updating metric:', error)
        return
      }

      setEditingField(null)
      setEditValue('')
      onDataUpdate()
    } catch (error) {
      console.error('Error saving metric:', error)
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

  // Helper functions for categorization
  const getMetricCategory = (metricType: string): string => {
    if (['weight', 'heart_rate', 'blood_pressure', 'temperature', 'glucose'].includes(metricType)) {
      return 'biometric'
    }
    if (['mood', 'energy', 'stress', 'readiness', 'sleep_hours', 'sleep_quality'].includes(metricType)) {
      return 'wellness'
    }
    if (['steps', 'calories', 'workout_duration', 'workout_intensity'].includes(metricType)) {
      return 'fitness'
    }
    return 'wellness'
  }

  const getMetricPriority = (metricType: string): number => {
    const priorities: Record<string, number> = {
      weight: 1,
      heart_rate: 1,
      mood: 2,
      energy: 2,
      stress: 2,
      readiness: 2,
      sleep_hours: 2,
      sleep_quality: 2,
      steps: 3,
      calories: 3
    }
    return priorities[metricType] || 10
  }

  const getJournalPriority = (entryType: string): number => {
    const priorities: Record<string, number> = {
      goal: 1,
      tip: 2,
      advice: 3,
      note: 4,
      reflection: 5
    }
    return priorities[entryType] || 10
  }

  // Process structured data from new schema
  const { dailyCard, journal } = useMemo(() => {
    if (!data) return { dailyCard: [], journal: [] }
    
    console.log('🔍 Processing structured data:', data)
    
    // Convert metrics to ClassifiedData format
    const dailyCard: ClassifiedData[] = data.metrics.map(metric => ({
      key: metric.metric_type,
      value: metric.metric_value,
      classification: {
        type: 'metric',
        category: getMetricCategory(metric.metric_type),
        displayType: 'card',
        priority: getMetricPriority(metric.metric_type),
        editable: true,
        deletable: true
      },
      metadata: {
        source: metric.source,
        confidence: metric.confidence,
        timestamp: metric.created_at
      }
    }))
    
    // Convert journal entries to ClassifiedData format
    const journal: ClassifiedData[] = data.journalEntries.map(entry => ({
      key: `${entry.entry_type}_${entry.id}`,
      value: entry.content,
      classification: {
        type: entry.entry_type as any,
        category: entry.category as any,
        displayType: 'journal',
        priority: getJournalPriority(entry.entry_type),
        editable: entry.entry_type !== 'tip', // Tips are read-only
        deletable: true
      },
      metadata: {
        source: entry.source,
        confidence: entry.confidence,
        timestamp: entry.created_at
      }
    }))
    
    console.log('🔍 Processed structured data:', { dailyCard, journal })
    return { dailyCard, journal }
  }, [data])

  // Group daily card data by category for display
  const categorizedMetrics = useMemo(() => {
    const categories: any = {}
    
    console.log('🔍 Processing dailyCard items:', dailyCard)
    
    dailyCard.forEach((item: ClassifiedData) => {
      const category = item.classification.category
      if (!categories[category]) {
        categories[category] = []
      }
      categories[category].push({
        key: item.key,
        value: item.value,
        classification: item.classification,
        metadata: item.metadata
      })
    })
    
    console.log('🔍 Final categorized metrics:', categories)
    return categories
  }, [dailyCard])

  const MetricCard = ({ icon: Icon, label, value, unit, field, category, classification, metadata }: any) => {
    const isEditing = editingField === field
    const hasData = value && value !== '—'
    const categoryConfig = CATEGORY_CONFIG[category as keyof typeof CATEGORY_CONFIG]
    
    const handleDelete = async () => {
      if (!classification?.deletable) return
      
      try {
        const supabase = createClient()
        
        // Delete from daily_metrics table
        const { error } = await supabase
          .from('daily_metrics')
          .delete()
          .eq('user_id', userId)
          .eq('metric_date', date)
          .eq('metric_type', field)
        
        if (error) {
          console.error('Error deleting metric:', error)
        } else {
          onDataUpdate()
        }
      } catch (error) {
        console.error('Error deleting metric:', error)
      }
    }
    
    return (
      <div className="bg-card/60 backdrop-blur-sm border border-line/40 rounded-lg p-3 hover:border-primary/30 transition-colors min-h-[80px] max-h-[120px] flex flex-col overflow-hidden relative group">
        {/* Header with icon, label, and action buttons */}
        <div className="flex items-center justify-between mb-2 min-h-[20px]">
          <div className="flex items-center gap-2">
            <Icon className={`h-3 w-3 flex-shrink-0 ${categoryConfig?.color || 'text-primary'}`} />
            <span className="text-xs font-medium text-muted uppercase tracking-wide truncate">
              {label}
            </span>
          </div>
          
          {/* Action buttons - only show on hover */}
          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
            {classification?.editable && (
              <button
                onClick={() => handleEdit(field, value)}
                className="p-1 hover:bg-primary/10 rounded transition-colors"
                title="Edit"
              >
                <Edit3 className="h-3 w-3 text-muted-foreground hover:text-primary" />
              </button>
            )}
            {classification?.deletable && (
              <button
                onClick={handleDelete}
                className="p-1 hover:bg-destructive/10 rounded transition-colors"
                title="Delete"
              >
                <Trash2 className="h-3 w-3 text-muted-foreground hover:text-destructive" />
              </button>
            )}
          </div>
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
        <div className="space-y-12">
          {/* Daily Card Metrics Section */}
          <div className="space-y-6">
            <div className="flex items-center gap-3">
              <div className="h-px flex-1 bg-gradient-to-r from-transparent via-line/30 to-transparent"></div>
              <h2 className="text-lg font-semibold text-primary px-4">Daily Metrics</h2>
              <div className="h-px flex-1 bg-gradient-to-r from-transparent via-line/30 to-transparent"></div>
            </div>
            
            {data && Object.keys(categorizedMetrics).length > 0 ? (
              <div className="space-y-8">
                {/* Dynamic Category Sections */}
                {Object.entries(categorizedMetrics).map(([category, metrics]) => (
                  <CategorySection
                    key={category}
                    category={category}
                    metrics={metrics as any[]}
                  />
                ))}
              </div>
            ) : data ? (
              // Fallback: Show raw data if classification failed
              <div className="space-y-4">
                <div className="text-sm text-muted-foreground mb-4">
                  Debug: Raw data available but classification failed. Showing fallback view.
                </div>
                <div className="grid gap-3 grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
                  {Object.entries(data).map(([key, value]) => {
                    if (value !== null && value !== undefined && 
                        typeof value !== 'object' && 
                        !['id', 'user_id', 'log_date', 'created_at', 'updated_at', 'last_updated'].includes(key)) {
                      const { displayValue, unit } = formatMetricValue(key, value)
                      return (
                        <div key={key} className="bg-card/60 backdrop-blur-sm border border-line/40 rounded-lg p-3">
                          <div className="text-xs font-medium text-muted uppercase tracking-wide mb-2">
                            {key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                          </div>
                          <div className="text-base font-semibold">
                            {displayValue}
                            {unit && <span className="text-xs text-muted-foreground ml-1">{unit}</span>}
                          </div>
                        </div>
                      )
                    }
                    return null
                  })}
                </div>
              </div>
            ) : (
              <div className="flex items-center justify-center min-h-[200px] bg-card/20 rounded-lg border border-line/20">
                <div className="text-center text-muted-foreground max-w-md">
                  <div className="w-16 h-16 bg-card/60 rounded-full flex items-center justify-center mx-auto mb-4">
                    <Activity className="h-8 w-8 text-muted" />
                  </div>
                  <p className="text-xl font-medium mb-3">No metrics for this date</p>
                  <p className="text-base mb-4">Your daily metrics will populate as you share data with Coach!</p>
                </div>
              </div>
            )}
          </div>

          {/* Visual Separator */}
          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-line/20"></div>
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-background px-3 text-muted-foreground">Daily Journal</span>
            </div>
          </div>

          {/* Daily Journal Section */}
          <div className="space-y-6">
            <DailyJournal
              userId={userId}
              date={date}
              journalEntries={journal}
              onDataUpdate={onDataUpdate}
            />
          </div>

          {/* Last Updated */}
          {data?.metrics.length > 0 && (
            <div className="text-xs text-muted-foreground text-center pt-4 border-t border-line/20">
              Last updated: {new Date(data.metrics[0].created_at).toLocaleString()}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
