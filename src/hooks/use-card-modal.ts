import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { StructuredCardData } from '@/types'

interface UseCardModalProps {
  userId: string
}

interface DailyJournalEntry {
  id: string
  entry_type: string
  category: string
  content: string
  source: string
  confidence: number
  created_at: string
}

export function useCardModal({ userId }: UseCardModalProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [selectedDate, setSelectedDate] = useState('')
  const [cardData, setCardData] = useState<StructuredCardData | null>(null)
  const [loading, setLoading] = useState(false)
  const [availableDates, setAvailableDates] = useState<string[]>([])

  // Fetch available dates from user_daily_metrics table
  const fetchAvailableDates = useCallback(async () => {
    try {
      console.log('fetchAvailableDates called for userId:', userId)
      const supabase = createClient()
      const { data, error } = await supabase
        .from('user_daily_metrics')
        .select('metric_date')
        .eq('user_id', userId)
        .order('metric_date', { ascending: false })
        .limit(30)

      if (error) {
        console.error('Error fetching available dates:', error)
        return
      }

      const dates = [...new Set(data.map(row => row.metric_date))] // Remove duplicates
      console.log('Found available dates:', dates)
      setAvailableDates(dates)
      
      // Set initial date to most recent if none selected, or today if no data exists
      if (dates.length > 0 && !selectedDate) {
        console.log('Setting initial selectedDate to:', dates[0])
        setSelectedDate(dates[0])
      } else if (dates.length === 0 && !selectedDate) {
        // If no data exists, set to today's date
        const today = new Date().toISOString().split('T')[0]
        console.log('No data exists, setting selectedDate to today:', today)
        setSelectedDate(today)
      }
    } catch (error) {
      console.error('Error fetching available dates:', error)
    }
  }, [userId, selectedDate])

  // Fetch card data for a specific date from new structured tables
  const fetchCardData = useCallback(async (date: string) => {
    if (!date) return
    
    console.log('Fetching structured data for date:', date)
    setLoading(true)
    try {
      const supabase = createClient()
      
      // Fetch metrics with category information
      const { data: metrics, error: metricsError } = await supabase
        .from('user_daily_metrics')
        .select(`
          *,
          standard_metrics (
            metric_key,
            display_name,
            data_type,
            unit,
            metric_categories (
              name,
              display_name,
              icon,
              color
            )
          )
        `)
        .eq('user_id', userId)
        .eq('metric_date', date)
        .order('created_at', { ascending: false })

      if (metricsError) {
        console.error('Error fetching metrics:', metricsError)
      }

      // Fetch journal entries
      const { error: journalError } = await supabase
        .from('daily_journal')
        .select('*')
        .eq('user_id', userId)
        .eq('journal_date', date)
        .order('created_at', { ascending: false })

      if (journalError) {
        console.error('Error fetching journal entries:', journalError)
      }

      // Fetch goals (placeholder for now)
      // const goals: any[] = []

      // Transform metrics into structured format by category
      const categories: Record<string, any> = {}
      
      if (metrics) {
        // Debug: Log raw metrics to see duplicates
        console.log('Raw metrics from database:', metrics)
        
        // Create a map to deduplicate by metric_key (keep the most recent one)
        const metricMap = new Map()
        
        metrics.forEach(metric => {
          const metricKey = metric.standard_metrics?.metric_key || 'unknown'
          const existingMetric = metricMap.get(metricKey)
          
          // Keep the most recent metric (highest confidence or most recent created_at)
          if (!existingMetric || 
              metric.confidence > existingMetric.confidence ||
              (metric.confidence === existingMetric.confidence && 
               new Date(metric.created_at) > new Date(existingMetric.created_at))) {
            metricMap.set(metricKey, metric)
          }
        })
        
        // Convert map back to array and process
        const uniqueMetrics = Array.from(metricMap.values())
        console.log('Deduplicated metrics:', uniqueMetrics)
        
        uniqueMetrics.forEach(metric => {
          const categoryName = metric.standard_metrics?.metric_categories?.name || 'unknown'
          const categoryDisplayName = metric.standard_metrics?.metric_categories?.display_name || 'Unknown'
          
          if (!categories[categoryName]) {
            categories[categoryName] = {
              displayName: categoryDisplayName,
              icon: metric.standard_metrics?.metric_categories?.icon,
              color: metric.standard_metrics?.metric_categories?.color,
              metrics: []
            }
          }
          
          // Determine the actual value based on data type
          let value: number | string | boolean = metric.metric_value || 0
          if (metric.text_value !== null) value = metric.text_value
          if (metric.boolean_value !== null) value = metric.boolean_value
          
          categories[categoryName].metrics.push({
            id: metric.id,
            metric_key: metric.standard_metrics?.metric_key || 'unknown',
            display_name: metric.standard_metrics?.display_name || 'Unknown',
            value: value,
            unit: metric.standard_metrics?.unit || '',
            source: metric.source,
            confidence: metric.confidence,
            is_editable: true
          })
        })
      }

      const structuredData: StructuredCardData = {
        categories,
        journalEntries: [], // Let DailyJournal component handle its own data fetching
        date
      }

      console.log('Structured card data:', structuredData)
      setCardData(structuredData)
    } catch (error) {
      console.error('Error fetching card data:', error)
      setCardData(null)
    } finally {
      setLoading(false)
    }
  }, [userId])

  // Open modal with specific date
  const openCard = async (date?: string) => {
    if (date) {
      setSelectedDate(date)
      await fetchCardData(date)
    } else if (selectedDate) {
      await fetchCardData(selectedDate)
    }
    setIsOpen(true)
  }

  // Close modal
  const closeCard = () => {
    setIsOpen(false)
  }

  // Refresh card data
  const refreshCard = async () => {
    if (selectedDate) {
      await fetchCardData(selectedDate)
    }
  }

  // Change selected date
  const changeDate = async (date: string) => {
    setSelectedDate(date)
    await fetchCardData(date)
  }

  // Load available dates on mount
  useEffect(() => {
    fetchAvailableDates()
  }, [fetchAvailableDates])

  // Fetch card data when selected date changes
  useEffect(() => {
    if (selectedDate) {
      fetchCardData(selectedDate)
    }
  }, [selectedDate, fetchCardData])

  return {
    isOpen,
    selectedDate,
    cardData,
    loading,
    availableDates,
    openCard,
    closeCard,
    refreshCard,
    changeDate
  }
}
