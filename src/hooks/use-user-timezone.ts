'use client'

import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { getUserTimezone } from '@/lib/timezone-utils'
import { useAuth } from '@/components/providers/auth-provider'

interface UseUserTimezoneReturn {
  userTimezone: string
  detectedTimezone: string
  isLoading: boolean
  error: string | null
  updateTimezone: (timezone: string) => Promise<void>
  refreshTimezone: () => Promise<void>
}

/**
 * Hook to manage user's timezone preference
 * Automatically detects browser timezone and stores it in user profile
 */
export function useUserTimezone(): UseUserTimezoneReturn {
  const { user } = useAuth()
  const [userTimezone, setUserTimezone] = useState<string>('UTC')
  const [detectedTimezone, setDetectedTimezone] = useState<string>('UTC')
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Detect browser timezone
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const detected = getUserTimezone()
      setDetectedTimezone(detected)
    }
  }, [])

  // Load user's timezone preference
  const loadUserTimezone = useCallback(async () => {
    if (!user?.id) {
      setIsLoading(false)
      return
    }

    try {
      setIsLoading(true)
      setError(null)
      
      const supabase = createClient()
      
      // Try to fetch timezone, but gracefully handle if column doesn't exist
      const { data, error: fetchError } = await supabase
        .from('users')
        .select('timezone')
        .eq('id', user.id)
        .single()

      if (fetchError) {
        // If the error is about the column not existing, that's expected for new migrations
        if (fetchError.code === 'PGRST116' || 
            fetchError.message?.includes('column') || 
            fetchError.message?.includes('does not exist') ||
            fetchError.message?.includes('timezone')) {
          console.log('Timezone column not found, using detected timezone as default')
          setUserTimezone(detectedTimezone)
          return
        }
        console.error('Error fetching user timezone:', fetchError)
        setError('Failed to load timezone preference')
        setUserTimezone('UTC')
        return
      }

      const storedTimezone = data?.timezone || detectedTimezone
      setUserTimezone(storedTimezone)

      // If user doesn't have a timezone set, auto-detect and save it
      if (!data?.timezone && detectedTimezone !== 'UTC') {
        await updateTimezone(detectedTimezone)
      }

    } catch (err) {
      console.error('Error in loadUserTimezone:', err)
      setError('Failed to load timezone preference')
      setUserTimezone(detectedTimezone) // Fall back to detected timezone
    } finally {
      setIsLoading(false)
    }
  }, [user?.id, detectedTimezone])

  // Update user's timezone preference
  const updateTimezone = useCallback(async (timezone: string) => {
    if (!user?.id) {
      setError('User not authenticated')
      return
    }

    try {
      setError(null)
      
      const supabase = createClient()
      const { error: updateError } = await supabase
        .from('users')
        .update({ timezone })
        .eq('id', user.id)

      if (updateError) {
        console.error('Error updating user timezone:', updateError)
        // If the error is about the column not existing, that's expected for new migrations
        if (updateError.code === 'PGRST116' || 
            updateError.message?.includes('column') || 
            updateError.message?.includes('does not exist') ||
            updateError.message?.includes('timezone')) {
          console.log('Timezone column not found, cannot update timezone preference')
          setError('Timezone feature not available yet - migration may not be applied')
          return
        }
        setError('Failed to update timezone preference')
        return
      }

      setUserTimezone(timezone)
      console.log('✅ User timezone updated to:', timezone)

    } catch (err) {
      console.error('Error in updateTimezone:', err)
      setError('Failed to update timezone preference')
    }
  }, [user?.id])

  // Refresh timezone data
  const refreshTimezone = useCallback(async () => {
    await loadUserTimezone()
  }, [loadUserTimezone])

  // Load timezone on mount and when user changes
  useEffect(() => {
    loadUserTimezone()
  }, [loadUserTimezone])

  return {
    userTimezone,
    detectedTimezone,
    isLoading,
    error,
    updateTimezone,
    refreshTimezone
  }
}
