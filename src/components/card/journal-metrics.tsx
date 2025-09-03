'use client'

import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { ChevronRight, Settings } from 'lucide-react'

interface JournalMetricsProps {
  userId: string
  date: string
}

interface MetricData {
  id: string
  metric_key: string
  display_name: string
  value: number | string | boolean
  unit: string
  source: string
  confidence: number
}

interface UserMetricPreferences {
  sleep_score: boolean
  readiness: boolean
  weight: boolean
  weekly_weight_avg: boolean
}

export function JournalMetrics({ userId, date }: JournalMetricsProps) {
  const [isExpanded, setIsExpanded] = useState(true)
  const [showConfig, setShowConfig] = useState(false)
  const [metrics, setMetrics] = useState<MetricData[]>([])
  const [preferences, setPreferences] = useState<UserMetricPreferences>({
    sleep_score: true,
    readiness: true,
    weight: true,
    weekly_weight_avg: true
  })
  const [loading, setLoading] = useState(true)

  // Load user preferences
  useEffect(() => {
    loadUserPreferences()
  }, [loadUserPreferences])

  // Load metrics data
  useEffect(() => {
    if (isExpanded) {
      loadMetricsData()
    }
  }, [isExpanded, loadMetricsData])

  const loadUserPreferences = useCallback(async () => {
    try {
      const supabase = createClient()
      const { data: prefs } = await supabase
        .from('user_metric_preferences')
        .select('metric_id, is_enabled')
        .eq('user_id', userId)

      if (prefs) {
        // Map metric IDs to our preference keys
        const newPrefs = { ...preferences }
        prefs.forEach(() => {
          // This would need to be mapped based on actual metric IDs
          // For now, we'll use the default preferences
        })
        setPreferences(newPrefs)
      }
    } catch (error) {
      console.error('Error loading user preferences:', error)
    }
  }, [userId, preferences])

  const loadMetricsData = useCallback(async () => {
    try {
      setLoading(true)
      const supabase = createClient()
      
      // Load the 4 essential metrics for the date
      const { data: metricsData } = await supabase
        .from('user_daily_metrics')
        .select(`
          id,
          metric_value,
          text_value,
          boolean_value,
          source,
          confidence,
          standard_metrics!inner (
            metric_key,
            display_name,
            unit
          )
        `)
        .eq('user_id', userId)
        .eq('metric_date', date)
        .in('standard_metrics.metric_key', ['sleep_score', 'readiness', 'weight', 'weekly_weight_avg'])

      if (metricsData) {
        const formattedMetrics = metricsData.map((metric: any) => ({
          id: metric.id,
          metric_key: metric.standard_metrics?.metric_key || '',
          display_name: metric.standard_metrics?.display_name || '',
          value: metric.metric_value || metric.text_value || metric.boolean_value || 'N/A',
          unit: metric.standard_metrics?.unit || '',
          source: metric.source,
          confidence: metric.confidence
        }))
        setMetrics(formattedMetrics)
      }
    } catch (error) {
      console.error('Error loading metrics:', error)
    } finally {
      setLoading(false)
    }
  }, [userId, date])

  const updatePreference = async (key: keyof UserMetricPreferences, value: boolean) => {
    try {
      const newPrefs = { ...preferences, [key]: value }
      setPreferences(newPrefs)
      
      // Save to database
      // This would need to be implemented based on your metric preference system
      console.log('Preference updated:', key, value)
    } catch (error) {
      console.error('Error updating preference:', error)
    }
  }

  const getMetricValue = (metricKey: string): string => {
    const metric = metrics.find(m => m.metric_key === metricKey)
    if (!metric) return 'N/A'
    
    if (typeof metric.value === 'number') {
      return `${metric.value}${metric.unit ? ` ${metric.unit}` : ''}`
    }
    return String(metric.value)
  }

  const getMetricDisplayName = (metricKey: string): string => {
    const metric = metrics.find(m => m.metric_key === metricKey)
    return metric?.display_name || metricKey.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())
  }

  if (!isExpanded) {
    return (
      <div className="bg-card-2 p-4 rounded-lg border border-line">
        <Button
          variant="ghost"
          onClick={() => setIsExpanded(true)}
          className="w-full justify-between p-0 h-auto"
        >
          <span className="text-lg font-semibold">📊 Daily Metrics</span>
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>
    )
  }

  return (
    <div className="bg-card-2 p-4 rounded-lg border border-line space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <Button
          variant="ghost"
          onClick={() => setIsExpanded(false)}
          className="p-0 h-auto text-lg font-semibold"
        >
          📊 Daily Metrics
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setShowConfig(!showConfig)}
          className="h-8 w-8 p-0"
        >
          <Settings className="h-4 w-4" />
        </Button>
      </div>

      {/* Configuration Panel */}
      {showConfig && (
        <div className="bg-card p-3 rounded-lg border border-line space-y-2">
          <h4 className="text-sm font-medium">Show Metrics:</h4>
          <div className="grid grid-cols-2 gap-2">
            <label className="flex items-center space-x-2 text-sm">
              <Checkbox
                checked={preferences.sleep_score}
                onCheckedChange={(checked) => updatePreference('sleep_score', checked as boolean)}
              />
              <span>Sleep Score</span>
            </label>
            <label className="flex items-center space-x-2 text-sm">
              <Checkbox
                checked={preferences.readiness}
                onCheckedChange={(checked) => updatePreference('readiness', checked as boolean)}
              />
              <span>Readiness</span>
            </label>
            <label className="flex items-center space-x-2 text-sm">
              <Checkbox
                checked={preferences.weight}
                onCheckedChange={(checked) => updatePreference('weight', checked as boolean)}
              />
              <span>Weight</span>
            </label>
            <label className="flex items-center space-x-2 text-sm">
              <Checkbox
                checked={preferences.weekly_weight_avg}
                onCheckedChange={(checked) => updatePreference('weekly_weight_avg', checked as boolean)}
              />
              <span>Weekly Weight Avg</span>
            </label>
          </div>
        </div>
      )}

      {/* Metrics Grid */}
      {loading ? (
        <div className="flex items-center justify-center py-8">
          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {preferences.sleep_score && (
            <div className="bg-card p-3 rounded-lg border border-line text-center">
              <div className="text-2xl font-bold text-primary">
                {getMetricValue('sleep_score')}
              </div>
              <div className="text-sm text-muted-foreground">
                {getMetricDisplayName('sleep_score')}
              </div>
            </div>
          )}
          
          {preferences.readiness && (
            <div className="bg-card p-3 rounded-lg border border-line text-center">
              <div className="text-2xl font-bold text-green-500">
                {getMetricValue('readiness')}
              </div>
              <div className="text-sm text-muted-foreground">
                {getMetricDisplayName('readiness')}
              </div>
            </div>
          )}
          
          {preferences.weight && (
            <div className="bg-card p-3 rounded-lg border border-line text-center">
              <div className="text-2xl font-bold text-blue-500">
                {getMetricValue('weight')}
              </div>
              <div className="text-sm text-muted-foreground">
                {getMetricDisplayName('weight')}
              </div>
            </div>
          )}
          
          {preferences.weekly_weight_avg && (
            <div className="bg-card p-3 rounded-lg border border-line text-center">
              <div className="text-2xl font-bold text-purple-500">
                {getMetricValue('weekly_weight_avg')}
              </div>
              <div className="text-sm text-muted-foreground">
                Weekly Weight Avg
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
