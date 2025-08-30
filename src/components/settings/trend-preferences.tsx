import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Badge } from '@/components/ui/badge'
import { TrendingUp, Settings, Info } from 'lucide-react'

interface TrendPreferencesProps {
  userId: string
}

interface TrendPreferences {
  enabled_metrics: string[]
  suggested_metrics: string[]
  excluded_metrics: string[]
}

const AVAILABLE_METRICS = [
  { key: 'sleep_hours', label: 'Sleep Hours', description: 'Track your sleep duration trends' },
  { key: 'energy', label: 'Energy Level', description: 'Monitor your daily energy patterns' },
  { key: 'mood', label: 'Mood', description: 'Track your mood trends over time' },
  { key: 'workout_completed', label: 'Workouts', description: 'Monitor workout consistency' },
  { key: 'weight', label: 'Weight', description: 'Track weight trends and averages' },
  { key: 'readiness_score', label: 'Readiness Score', description: 'Monitor recovery and readiness' },
  { key: 'hrv', label: 'Heart Rate Variability', description: 'Track HRV patterns' },
  { key: 'glucose', label: 'Glucose', description: 'Monitor blood glucose trends' },
  { key: 'stress', label: 'Stress Level', description: 'Track stress patterns' },
  { key: 'sleep_quality', label: 'Sleep Quality', description: 'Monitor sleep quality trends' }
]

export function TrendPreferences({ userId }: TrendPreferencesProps) {
  const [preferences, setPreferences] = useState<TrendPreferences>({
    enabled_metrics: ['sleep_hours', 'energy', 'mood', 'workout_completed', 'weight'],
    suggested_metrics: [],
    excluded_metrics: []
  })
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetchPreferences()
  }, [])

  const fetchPreferences = async () => {
    setLoading(true)
    try {
      const response = await fetch('/api/preferences/trends')
      if (response.ok) {
        const data = await response.json()
        setPreferences(data.preferences)
      } else {
        setError('Failed to load preferences')
      }
    } catch (err) {
      setError('Failed to load preferences')
    } finally {
      setLoading(false)
    }
  }

  const handleMetricToggle = (metricKey: string) => {
    const isEnabled = preferences.enabled_metrics.includes(metricKey)
    
    if (isEnabled) {
      // Don't allow disabling if it's the last enabled metric
      if (preferences.enabled_metrics.length === 1) {
        setError('At least one metric must be enabled for trend tracking')
        return
      }
      
      setPreferences(prev => ({
        ...prev,
        enabled_metrics: prev.enabled_metrics.filter(m => m !== metricKey),
        excluded_metrics: [...prev.excluded_metrics, metricKey]
      }))
    } else {
      setPreferences(prev => ({
        ...prev,
        enabled_metrics: [...prev.enabled_metrics, metricKey],
        excluded_metrics: prev.excluded_metrics.filter(m => m !== metricKey)
      }))
    }
    setError(null)
  }

  const handleSave = async () => {
    setSaving(true)
    setError(null)
    
    try {
      const response = await fetch('/api/preferences/trends', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          enabled_metrics: preferences.enabled_metrics,
          suggested_metrics: preferences.suggested_metrics,
          excluded_metrics: preferences.excluded_metrics
        }),
      })

      if (response.ok) {
        // Success - preferences saved
      } else {
        const data = await response.json()
        setError(data.error || 'Failed to save preferences')
      }
    } catch (err) {
      setError('Failed to save preferences')
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="w-5 h-5" />
            Trend Preferences
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
            <span className="ml-2 text-muted">Loading preferences...</span>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <TrendingUp className="w-5 h-5" />
          Trend Preferences
        </CardTitle>
        <p className="text-sm text-muted">
          Choose which metrics to include in your weekly trend analysis. At least one metric must be enabled.
        </p>
      </CardHeader>
      <CardContent className="space-y-6">
        {error && (
          <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-lg">
            <p className="text-red-400 text-sm">{error}</p>
          </div>
        )}

        <div className="space-y-4">
          <h4 className="text-sm font-semibold text-muted flex items-center gap-2">
            <Settings className="w-4 h-4" />
            Available Metrics
          </h4>
          
          <div className="grid gap-3">
            {AVAILABLE_METRICS.map((metric) => {
              const isEnabled = preferences.enabled_metrics.includes(metric.key)
              const isDefault = ['sleep_hours', 'energy', 'mood', 'workout_completed', 'weight'].includes(metric.key)
              
              return (
                <div key={metric.key} className="flex items-start space-x-3 p-3 border border-line rounded-lg">
                  <Checkbox
                    id={metric.key}
                    checked={isEnabled}
                    onCheckedChange={() => handleMetricToggle(metric.key)}
                    disabled={isEnabled && preferences.enabled_metrics.length === 1}
                  />
                  <div className="flex-1 space-y-1">
                    <div className="flex items-center gap-2">
                      <label 
                        htmlFor={metric.key} 
                        className="text-sm font-medium cursor-pointer"
                      >
                        {metric.label}
                      </label>
                      {isDefault && (
                        <Badge variant="secondary" className="text-xs">Default</Badge>
                      )}
                    </div>
                    <p className="text-xs text-muted">{metric.description}</p>
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {preferences.suggested_metrics.length > 0 && (
          <div className="space-y-4">
            <h4 className="text-sm font-semibold text-muted flex items-center gap-2">
              <Info className="w-4 h-4" />
              Suggested Metrics
            </h4>
            <div className="grid gap-3">
              {preferences.suggested_metrics.map((metric) => (
                <div key={metric} className="flex items-center space-x-3 p-3 border border-line rounded-lg bg-primary/5">
                  <Checkbox
                    id={`suggested-${metric}`}
                    checked={preferences.enabled_metrics.includes(metric)}
                    onCheckedChange={() => handleMetricToggle(metric)}
                  />
                  <label 
                    htmlFor={`suggested-${metric}`} 
                    className="text-sm font-medium cursor-pointer"
                  >
                    {metric.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                  </label>
                  <Badge variant="outline" className="text-xs">New</Badge>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="flex justify-between items-center pt-4 border-t border-line">
          <div className="text-sm text-muted">
            {preferences.enabled_metrics.length} metric{preferences.enabled_metrics.length !== 1 ? 's' : ''} enabled
          </div>
          <Button 
            onClick={handleSave} 
            disabled={saving || preferences.enabled_metrics.length === 0}
            size="sm"
          >
            {saving ? 'Saving...' : 'Save Preferences'}
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
