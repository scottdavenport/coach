import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'

interface UseCardModalProps {
  userId: string
}

export function useCardModal({ userId }: UseCardModalProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [selectedDate, setSelectedDate] = useState('')
  const [cardData, setCardData] = useState<any>(null)
  const [loading, setLoading] = useState(false)
  const [availableDates, setAvailableDates] = useState<string[]>([])

  // Fetch available dates
  const fetchAvailableDates = async () => {
    try {
      console.log('fetchAvailableDates called for userId:', userId)
      const supabase = createClient()
      const { data, error } = await supabase
        .from('daily_log_cards')
        .select('log_date')
        .eq('user_id', userId)
        .order('log_date', { ascending: false })
        .limit(30)

      if (error) {
        console.error('Error fetching available dates:', error)
        return
      }

      const dates = data.map(row => row.log_date)
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
  }

  // Fetch card data for a specific date
  const fetchCardData = async (date: string) => {
    if (!date) return
    
    console.log('Fetching data for date:', date)
    setLoading(true)
    try {
      const supabase = createClient()
      const { data, error } = await supabase
        .from('daily_log_cards')
        .select('*')
        .eq('user_id', userId)
        .eq('log_date', date)
        .single()

      if (error && error.code !== 'PGRST116') {
        console.error('Error fetching card data:', error)
        setCardData(null)
      } else {
        console.log('Raw database data:', data)
        console.log('Summary data:', data?.summary)
        console.log('Context data from summary:', data?.summary?.context_data)
        console.log('Workout data from summary:', data?.summary?.context_data?.workout)
        setCardData(data?.summary || null)
      }
    } catch (error) {
      console.error('Error fetching card data:', error)
      setCardData(null)
    } finally {
      setLoading(false)
    }
  }

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
    }
    setIsOpen(true)
    
    // Debug logging
    console.log('openCard called with date:', date)
    console.log('availableDates:', currentAvailableDates)
    console.log('selectedDate will be:', date || (currentAvailableDates.length > 0 ? currentAvailableDates[0] : 'none'))
  }
  
  // Helper function to get available dates synchronously
  const getAvailableDates = async () => {
    try {
      const supabase = createClient()
      const { data, error } = await supabase
        .from('daily_log_cards')
        .select('log_date')
        .eq('user_id', userId)
        .order('log_date', { ascending: false })
        .limit(30)

      if (error) {
        console.error('Error fetching available dates:', error)
        return []
      }

      return data.map(row => row.log_date)
    } catch (error) {
      console.error('Error fetching available dates:', error)
      return []
    }
  }

  // Close modal
  const closeCard = () => {
    setIsOpen(false)
  }

  // Navigate to different date
  const navigateToDate = (date: string) => {
    setSelectedDate(date)
  }

  // Refresh data
  const refreshData = () => {
    fetchCardData(selectedDate)
  }

  // Initialize
  useEffect(() => {
    fetchAvailableDates()
  }, [userId])

  // Fetch data when date changes
  useEffect(() => {
    if (selectedDate) {
      fetchCardData(selectedDate)
    }
  }, [selectedDate])

  return {
    isOpen,
    selectedDate,
    cardData,
    loading,
    availableDates,
    openCard,
    closeCard,
    navigateToDate,
    refreshData,
    fetchAvailableDates
  }
}
