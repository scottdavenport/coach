import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'

interface WeeklySummary {
  id: string
  user_id: string
  week_start: string
  summary: string
  trends: Record<string, any>
  created_at: string
  updated_at: string
}

export function useWeeklySummary(weekStart?: string) {
  const [summary, setSummary] = useState<WeeklySummary | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const supabase = createClient()

  const fetchWeeklySummary = async (startDate: string) => {
    setLoading(true)
    setError(null)
    
    try {
      const { data, error } = await supabase
        .from('weekly_summaries')
        .select('*')
        .eq('week_start', startDate)
        .single()

      if (error) {
        if (error.code === 'PGRST116') {
          // No summary found for this week
          setSummary(null)
        } else {
          setError(error.message)
        }
      } else {
        setSummary(data)
      }
    } catch (err) {
      setError('Failed to fetch weekly summary')
    } finally {
      setLoading(false)
    }
  }

  const generateWeeklySummary = async (startDate: string) => {
    setLoading(true)
    setError(null)
    
    try {
      const response = await fetch('/api/summaries/weekly', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ weekStart: startDate }),
      })

      if (!response.ok) {
        throw new Error('Failed to generate weekly summary')
      }

      const result = await response.json()
      setSummary(result.summary)
    } catch (err) {
      setError('Failed to generate weekly summary')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (weekStart) {
      fetchWeeklySummary(weekStart)
    }
  }, [weekStart])

  return {
    summary,
    loading,
    error,
    generateWeeklySummary,
    refreshSummary: () => weekStart ? fetchWeeklySummary(weekStart) : null
  }
}
