import React from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Calendar, TrendingUp, RefreshCw, FileText } from 'lucide-react'
import { useWeeklySummary } from '@/hooks/use-weekly-summary'
import { formatWeekRange } from '@/lib/timezone-utils'

interface WeeklySummaryCardProps {
  weekStart: string
  onClose?: () => void
}

export function WeeklySummaryCard({ weekStart, onClose }: WeeklySummaryCardProps) {
  const { summary, loading, error, generateWeeklySummary } = useWeeklySummary(weekStart)

  const formatWeekRangeDisplay = (startDate: string) => {
    return formatWeekRange(startDate)
  }

  const renderTrends = (trends: Record<string, any>) => {
    if (!trends) return null

    return (
      <div className="space-y-3">
        <h4 className="text-sm font-semibold text-muted flex items-center gap-2">
          <TrendingUp className="w-4 h-4" />
          Weekly Trends
        </h4>
        
        <div className="grid grid-cols-1 gap-2 text-sm">
          {trends.sleep_trend && (
            <div className="flex justify-between">
              <span className="text-muted">Sleep:</span>
              <span>{trends.sleep_trend.consistency} ({trends.sleep_trend.average}h avg)</span>
            </div>
          )}
          
          {trends.energy_trend && (
            <div className="flex justify-between">
              <span className="text-muted">Energy:</span>
              <span className={`${
                trends.energy_trend.direction === 'improving' ? 'text-green-400' :
                trends.energy_trend.direction === 'declining' ? 'text-red-400' : 'text-yellow-400'
              }`}>
                {trends.energy_trend.direction} ({trends.energy_trend.average}/10 avg)
              </span>
            </div>
          )}
          
          {trends.mood_trend && (
            <div className="flex justify-between">
              <span className="text-muted">Mood:</span>
              <span className={`${
                trends.mood_trend.direction === 'improving' ? 'text-green-400' :
                trends.mood_trend.direction === 'declining' ? 'text-red-400' : 'text-yellow-400'
              }`}>
                {trends.mood_trend.direction} ({trends.mood_trend.average}/10 avg)
              </span>
            </div>
          )}
          
          {trends.workout_consistency && (
            <div className="flex justify-between">
              <span className="text-muted">Workouts:</span>
              <span className={`${
                trends.workout_consistency.rating === 'excellent' ? 'text-green-400' :
                trends.workout_consistency.rating === 'good' ? 'text-yellow-400' : 'text-red-400'
              }`}>
                {trends.workout_consistency.rating} ({trends.workout_consistency.days}/{trends.workout_consistency.total_days} days)
              </span>
            </div>
          )}
        </div>
      </div>
    )
  }

  if (loading) {
    return (
      <Card className="w-full max-w-2xl mx-auto">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="w-5 h-5" />
            Weekly Summary
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <RefreshCw className="w-6 h-6 animate-spin text-muted" />
            <span className="ml-2 text-muted">Loading weekly summary...</span>
          </div>
        </CardContent>
      </Card>
    )
  }

  if (error) {
    return (
      <Card className="w-full max-w-2xl mx-auto">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="w-5 h-5" />
            Weekly Summary
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <p className="text-red-400 mb-4">{error}</p>
            <Button 
              onClick={() => generateWeeklySummary(weekStart)}
              disabled={loading}
            >
              <RefreshCw className="w-4 h-4 mr-2" />
              Retry
            </Button>
          </div>
        </CardContent>
      </Card>
    )
  }

  if (!summary) {
    return (
      <Card className="w-full max-w-2xl mx-auto">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="w-5 h-5" />
            Weekly Summary - {formatWeekRangeDisplay(weekStart)}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <FileText className="w-12 h-12 mx-auto text-muted mb-4" />
            <p className="text-muted mb-4">No weekly summary available for this week.</p>
            <Button 
              onClick={() => generateWeeklySummary(weekStart)}
              disabled={loading}
            >
              <RefreshCw className="w-4 h-4 mr-2" />
              Generate Summary
            </Button>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="w-full max-w-2xl mx-auto">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Calendar className="w-5 h-5" />
            Weekly Summary - {formatWeekRangeDisplay(weekStart)}
          </CardTitle>
          {onClose && (
            <Button variant="ghost" size="sm" onClick={onClose}>
              ×
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* AI-Generated Summary */}
        <div>
          <h4 className="text-sm font-semibold text-muted mb-3 flex items-center gap-2">
            <FileText className="w-4 h-4" />
            Summary
          </h4>
          <div className="prose prose-sm prose-invert max-w-none">
            <p className="text-white leading-relaxed whitespace-pre-wrap">
              {summary.summary}
            </p>
          </div>
        </div>

        {/* Trends */}
        {renderTrends(summary.trends)}

        {/* Last Updated */}
        <div className="text-xs text-muted pt-4 border-t border-line">
          Last updated: {new Date(summary.updated_at).toLocaleString()}
        </div>
      </CardContent>
    </Card>
  )
}
