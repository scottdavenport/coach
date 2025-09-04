'use client'

import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'

interface UseJournalEntriesProps {
  userId: string
  year?: number
  month?: number
}

interface UseJournalEntriesReturn {
  journalEntryDates: string[]
  isLoading: boolean
  error: string | null
  refreshEntries: () => Promise<void>
}

/**
 * Hook to fetch journal entry dates for a specific month
 * Used to show dots on calendar indicating which days have journal entries
 */
export function useJournalEntries({ 
  userId, 
  year, 
  month 
}: UseJournalEntriesProps): UseJournalEntriesReturn {
  const [journalEntryDates, setJournalEntryDates] = useState<string[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetchJournalEntries = useCallback(async () => {
    if (!userId) return

    try {
      setIsLoading(true)
      setError(null)

      const supabase = createClient()
      
      let query = supabase
        .from('daily_journal')
        .select('journal_date')
        .eq('user_id', userId)
        .order('journal_date', { ascending: false })

      // If year and month are provided, filter by that month
      if (year && month) {
        const startDate = `${year}-${month.toString().padStart(2, '0')}-01`
        const endDate = `${year}-${month.toString().padStart(2, '0')}-31`
        
        query = query
          .gte('journal_date', startDate)
          .lte('journal_date', endDate)
      }

      const { data, error: fetchError } = await query

      if (fetchError) {
        console.error('Error fetching journal entries:', fetchError)
        setError('Failed to fetch journal entries')
        return
      }

      // Extract unique dates
      const uniqueDates = [...new Set(data?.map(entry => entry.journal_date) || [])]
      setJournalEntryDates(uniqueDates)

    } catch (err) {
      console.error('Error in fetchJournalEntries:', err)
      setError('Failed to fetch journal entries')
    } finally {
      setIsLoading(false)
    }
  }, [userId, year, month])

  // Refresh entries
  const refreshEntries = useCallback(async () => {
    await fetchJournalEntries()
  }, [fetchJournalEntries])

  // Fetch entries when dependencies change
  useEffect(() => {
    fetchJournalEntries()
  }, [fetchJournalEntries])

  return {
    journalEntryDates,
    isLoading,
    error,
    refreshEntries
  }
}
