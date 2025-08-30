'use client'

import { useState, useEffect } from 'react'
import { ocrTrainingCollector } from '@/lib/ocr/training-data'

interface TrainingStats {
  totalSamples: number
  byAppType: Record<string, number>
  byScreenshotType: Record<string, number>
  averageConfidence: number
  averageProcessingTime: number
}

export function OcrTrainingDashboard() {
  const [stats, setStats] = useState<TrainingStats | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadStats()
  }, [])

  const loadStats = async () => {
    try {
      setLoading(true)
      const trainingStats = await ocrTrainingCollector.getTrainingStats()
      setStats(trainingStats)
    } catch (error) {
      console.error('Failed to load training stats:', error)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="p-6">
        <div className="animate-pulse">
          <div className="h-4 bg-gray-200 rounded w-1/4 mb-4"></div>
          <div className="h-4 bg-gray-200 rounded w-1/2 mb-2"></div>
          <div className="h-4 bg-gray-200 rounded w-3/4"></div>
        </div>
      </div>
    )
  }

  if (!stats) {
    return (
      <div className="p-6">
        <div className="text-red-600">Failed to load training statistics</div>
      </div>
    )
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">OCR Training Dashboard</h2>
        <button 
          onClick={loadStats}
          className="px-4 py-2 bg-primary text-white rounded hover:bg-primary/90"
        >
          Refresh
        </button>
      </div>

      {/* Overview Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-card border border-line rounded-lg p-4">
          <div className="text-2xl font-bold text-primary">{stats.totalSamples}</div>
          <div className="text-sm text-muted">Total Samples</div>
        </div>
        <div className="bg-card border border-line rounded-lg p-4">
          <div className="text-2xl font-bold text-green-600">{stats.averageConfidence.toFixed(1)}%</div>
          <div className="text-sm text-muted">Avg Confidence</div>
        </div>
        <div className="bg-card border border-line rounded-lg p-4">
          <div className="text-2xl font-bold text-blue-600">{stats.averageProcessingTime.toFixed(0)}ms</div>
          <div className="text-sm text-muted">Avg Processing Time</div>
        </div>
        <div className="bg-card border border-line rounded-lg p-4">
          <div className="text-2xl font-bold text-purple-600">{Object.keys(stats.byAppType).length}</div>
          <div className="text-sm text-muted">App Types</div>
        </div>
      </div>

      {/* App Type Breakdown */}
      <div className="bg-card border border-line rounded-lg p-6">
        <h3 className="text-lg font-semibold mb-4">Samples by App Type</h3>
        <div className="space-y-2">
          {Object.entries(stats.byAppType)
            .sort(([,a], [,b]) => b - a)
            .map(([appType, count]) => (
              <div key={appType} className="flex justify-between items-center">
                <span className="capitalize">{appType.replace('_', ' ')}</span>
                <span className="font-medium">{count}</span>
              </div>
            ))}
        </div>
      </div>

      {/* Screenshot Type Breakdown */}
      <div className="bg-card border border-line rounded-lg p-6">
        <h3 className="text-lg font-semibold mb-4">Samples by Screenshot Type</h3>
        <div className="space-y-2">
          {Object.entries(stats.byScreenshotType)
            .sort(([,a], [,b]) => b - a)
            .map(([screenshotType, count]) => (
              <div key={screenshotType} className="flex justify-between items-center">
                <span className="capitalize">{screenshotType.replace('_', ' ')}</span>
                <span className="font-medium">{count}</span>
              </div>
            ))}
        </div>
      </div>

      {/* Insights */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <h3 className="text-lg font-semibold text-blue-800 mb-2">Training Insights</h3>
        <ul className="text-sm text-blue-700 space-y-1">
          <li>• Most common app type: {Object.entries(stats.byAppType).sort(([,a], [,b]) => b - a)[0]?.[0] || 'None'}</li>
          <li>• Most common screenshot type: {Object.entries(stats.byScreenshotType).sort(([,a], [,b]) => b - a)[0]?.[0] || 'None'}</li>
          <li>• Average OCR confidence: {stats.averageConfidence.toFixed(1)}%</li>
          <li>• Average processing time: {stats.averageProcessingTime.toFixed(0)}ms</li>
        </ul>
      </div>
    </div>
  )
}
