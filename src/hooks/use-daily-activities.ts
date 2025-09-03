import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'

interface DailyActivity {
  id: string
  user_id: string
  activity_date: string
  activity_type: string
  status: 'planned' | 'completed'
  title: string
  description?: string
  planned_data: any
  completed_data: any
  planned_activity_id?: string
  source: string
  screenshot_url?: string
  screenshot_metadata?: any
  created_at: string
  updated_at: string
}

interface UseDailyActivitiesProps {
  userId: string
}

export function useDailyActivities({ userId }: UseDailyActivitiesProps) {
  const [activities, setActivities] = useState<DailyActivity[]>([])
  const [loading, setLoading] = useState(false)
  const [selectedDate, setSelectedDate] = useState('')

  // Fetch activities for a specific date
  const fetchActivities = useCallback(async (date: string) => {
    if (!date) return
    
    setLoading(true)
    try {
      const supabase = createClient()
      
      const { data, error } = await supabase
        .from('daily_activities')
        .select('*')
        .eq('user_id', userId)
        .eq('activity_date', date)
        .order('created_at', { ascending: false })

      if (error) {
        console.error('Error fetching activities:', error)
        return
      }

      setActivities(data || [])
    } catch (error) {
      console.error('Error fetching activities:', error)
    } finally {
      setLoading(false)
    }
  }, [userId])

  // Create a new planned activity (AI-generated workout)
  const createPlannedActivity = async (activityData: {
    activity_type: string
    title: string
    description?: string
    planned_data: any
    activity_date: string
  }) => {
    try {
      const supabase = createClient()
      
      const { data, error } = await supabase
        .from('daily_activities')
        .insert({
          user_id: userId,
          activity_date: activityData.activity_date,
          activity_type: activityData.activity_type,
          status: 'planned',
          title: activityData.title,
          description: activityData.description,
          planned_data: activityData.planned_data,
          source: 'ai_generated'
        })
        .select()
        .single()

      if (error) {
        console.error('Error creating planned activity:', error)
        return null
      }

      // Refresh activities for the date
      await fetchActivities(activityData.activity_date)
      return data
    } catch (error) {
      console.error('Error creating planned activity:', error)
      return null
    }
  }

  // Mark an activity as completed
  const markActivityCompleted = async (activityId: string, completedData?: any) => {
    try {
      const supabase = createClient()
      
      const { error } = await supabase
        .from('daily_activities')
        .update({
          status: 'completed',
          completed_data: completedData || {},
          updated_at: new Date().toISOString()
        })
        .eq('id', activityId)

      if (error) {
        console.error('Error marking activity completed:', error)
        return false
      }

      // Refresh activities
      await fetchActivities(selectedDate)
      return true
    } catch (error) {
      console.error('Error marking activity completed:', error)
      return false
    }
  }

  // Create a completed activity from screenshot upload
  const createCompletedActivityFromScreenshot = async (activityData: {
    activity_type: string
    title: string
    description?: string
    completed_data: any
    activity_date: string
    screenshot_url: string
    screenshot_metadata?: any
  }) => {
    try {
      const supabase = createClient()
      
      const { data, error } = await supabase
        .from('daily_activities')
        .insert({
          user_id: userId,
          activity_date: activityData.activity_date,
          activity_type: activityData.activity_type,
          status: 'completed',
          title: activityData.title,
          description: activityData.description,
          completed_data: activityData.completed_data,
          screenshot_url: activityData.screenshot_url,
          screenshot_metadata: activityData.screenshot_metadata,
          source: 'screenshot_upload'
        })
        .select()
        .single()

      if (error) {
        console.error('Error creating completed activity:', error)
        return null
      }

      // Refresh activities for the date
      await fetchActivities(activityData.activity_date)
      return data
    } catch (error) {
      console.error('Error creating completed activity:', error)
      return null
    }
  }

  // Delete an activity
  const deleteActivity = async (activityId: string) => {
    try {
      const supabase = createClient()
      
      const { error } = await supabase
        .from('daily_activities')
        .delete()
        .eq('id', activityId)

      if (error) {
        console.error('Error deleting activity:', error)
        return false
      }

      // Refresh activities
      await fetchActivities(selectedDate)
      return true
    } catch (error) {
      console.error('Error deleting activity:', error)
      return false
    }
  }

  // Get planned activities for a date
  const getPlannedActivities = () => {
    return activities.filter(activity => activity.status === 'planned')
  }

  // Get completed activities for a date
  const getCompletedActivities = () => {
    return activities.filter(activity => activity.status === 'completed')
  }

  // Fetch activities when date changes
  useEffect(() => {
    if (selectedDate) {
      fetchActivities(selectedDate)
    }
  }, [selectedDate]) // PERFORMANCE FIX: Removed fetchActivities from dependencies to prevent infinite loop

  return {
    activities,
    loading,
    selectedDate,
    setSelectedDate,
    fetchActivities,
    createPlannedActivity,
    markActivityCompleted,
    createCompletedActivityFromScreenshot,
    deleteActivity,
    getPlannedActivities,
    getCompletedActivities
  }
}
