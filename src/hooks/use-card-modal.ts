import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'

interface UseCardModalProps {
  userId: string
}

interface DailyMetric {
  id: string
  metric_type: string
  metric_value: number
  metric_unit: string
  source: string
  confidence: number
  created_at: string
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

interface StructuredCardData {
  metrics: DailyMetric[]
  journalEntries: DailyJournalEntry[]
  goals: any[]
  date: string
}

export function useCardModal({ userId }: UseCardModalProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [selectedDate, setSelectedDate] = useState('')
  const [cardData, setCardData] = useState<StructuredCardData | null>(null)
  const [loading, setLoading] = useState(false)
  const [availableDates, setAvailableDates] = useState<string[]>([])

  // Fetch available dates from daily_metrics table
  const fetchAvailableDates = useCallback(async () => {
    try {
      console.log('fetchAvailableDates called for userId:', userId)
      const supabase = createClient()
      const { data, error } = await supabase
        .from('daily_metrics')
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
      
      // Fetch metrics
      const { data: metrics, error: metricsError } = await supabase
        .from('daily_metrics')
        .select('*')
        .eq('user_id', userId)
        .eq('metric_date', date)
        .order('created_at', { ascending: false })

      if (metricsError) {
        console.error('Error fetching metrics:', metricsError)
      }

      // Fetch journal entries
      const { data: journalEntries, error: journalError } = await supabase
        .from('daily_journal')
        .select('*')
        .eq('user_id', userId)
        .eq('journal_date', date)
        .order('created_at', { ascending: false })

      if (journalError) {
        console.error('Error fetching journal entries:', journalError)
      }

      // Fetch goals (placeholder for now)
      const goals: any[] = []

      const structuredData: StructuredCardData = {
        metrics: metrics || [],
        journalEntries: journalEntries || [],
        goals,
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
    // If no specific date provided and no available dates yet, fetch them first
    if (!date && availableDates.length === 0) {
      console.log('No available dates yet, fetching them first...')
      await fetchAvailableDates()
      // Wait a bit for state to update, then check again
      await new Promise(resolve => setTimeout(resolve, 100))
    }
    
    // Get the current available dates (they might have been updated)
    const currentAvailableDates = availableDates.length > 0 ? availableDates : await getAvailableDates()
    
    if (date) {
      setSelectedDate(date)
    } else if (currentAvailableDates.length > 0 && !selectedDate) {
      setSelectedDate(currentAvailableDates[0])
    } else if (!selectedDate) {
      // Fallback to today
      const today = new Date().toISOString().split('T')[0]
      setSelectedDate(today)
    }
    
    setIsOpen(true)
  }

  // Close modal
  const closeCard = () => {
    setIsOpen(false)
  }

  // Navigate to a specific date
  const navigateToDate = async (date: string) => {
    setSelectedDate(date)
    await fetchCardData(date)
  }

  // Refresh data for current date
  const refreshData = async () => {
    if (selectedDate) {
      await fetchCardData(selectedDate)
    }
  }

  // Helper function to get available dates
  const getAvailableDates = async (): Promise<string[]> => {
    try {
      const supabase = createClient()
      const { data, error } = await supabase
        .from('daily_metrics')
        .select('metric_date')
        .eq('user_id', userId)
        .order('metric_date', { ascending: false })
        .limit(30)

      if (error) {
        console.error('Error fetching available dates:', error)
        return []
      }

      return [...new Set(data.map(row => row.metric_date))]
    } catch (error) {
      console.error('Error getting available dates:', error)
      return []
    }
  }

  // Fetch data when selected date changes
  useEffect(() => {
    if (selectedDate) {
      fetchCardData(selectedDate)
    }
  }, [selectedDate, fetchCardData])

  // Fetch available dates on mount
  useEffect(() => {
    fetchAvailableDates()
  }, [fetchAvailableDates])

  return {
    isOpen,
    selectedDate,
    cardData,
    loading,
    availableDates,
    openCard,
    closeCard,
    navigateToDate,
    refreshData
  }
}
