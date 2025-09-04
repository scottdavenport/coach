import { createClient } from '@/lib/supabase/server'

export async function generateDailyNarrative(userId: string, date: string) {
  try {
    const supabase = await createClient()
    
    console.log(`📝 Generating daily narrative for ${date}`)

    // Fetch conversation insights for the date
    const { data: insights, error: insightsError } = await supabase
      .from('conversation_insights')
      .select('*')
      .eq('user_id', userId)
      .eq('conversation_date', date)
      .order('created_at', { ascending: true })

    if (insightsError) {
      console.error('Error fetching insights:', insightsError)
      return { success: false, error: 'Failed to fetch insights' }
    }

    if (!insights || insights.length === 0) {
      console.log('No insights found for date:', date)
      return { success: true, message: 'No insights to process' }
    }

    // Build narrative from insights using the same logic as the component
    const narrative = buildNarrativeFromInsights(insights)

    // Check if narrative already exists for this date
    const { data: existingNarrative } = await supabase
      .from('daily_narratives')
      .select('id')
      .eq('user_id', userId)
      .eq('narrative_date', date)
      .single()

    let result
    if (existingNarrative) {
      // Update existing narrative
      const { data, error } = await supabase
        .from('daily_narratives')
        .update({
          morning_checkin: narrative.morning_checkin,
          daily_schedule: narrative.daily_schedule,
          session_data: narrative.session_data,
          notes_flags: narrative.notes_flags,
          data_sources: ['conversation'],
          last_updated: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .eq('id', existingNarrative.id)
        .select()
        .single()

      result = data
      if (error) throw error
      console.log('✅ Updated existing daily narrative')
    } else {
      // Create new narrative
      const { data, error } = await supabase
        .from('daily_narratives')
        .insert({
          user_id: userId,
          narrative_date: date,
          morning_checkin: narrative.morning_checkin,
          daily_schedule: narrative.daily_schedule,
          session_data: narrative.session_data,
          notes_flags: narrative.notes_flags,
          feedback_log: narrative.feedback_log,
          weekly_averages: narrative.weekly_averages,
          data_sources: ['conversation'],
          is_complete: false
        })
        .select()
        .single()

      result = data
      if (error) throw error
      console.log('✅ Created new daily narrative')
    }

    return { success: true, narrative: result, insightsProcessed: insights.length }

  } catch (error) {
    console.error('Error generating narrative:', error)
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    }
  }
}

function buildNarrativeFromInsights(insights: any[]) {
  const narrative = {
    morning_checkin: {},
    daily_schedule: { activities: [] },
    session_data: {},
    notes_flags: { flags: [] },
    feedback_log: {},
    weekly_averages: {}
  }

  const activities: string[] = []
  const notes: string[] = []

  insights.forEach(insight => {
    const message = insight.message.toLowerCase()
    
    // Extract activities based on insights and message content
    if (insight.data_types?.activity) {
      if (message.includes('dinner') || message.includes('restaurant') || message.includes('grill')) {
        activities.push('Dining out')
      }
      if (message.includes('uptown') || message.includes('shops') || message.includes('shopping')) {
        activities.push('Exploring town')
      }
      if (message.includes('golf') || message.includes('hike') || message.includes('walk') || message.includes('run')) {
        activities.push('Outdoor activity')
      }
      if (message.includes('workout') || message.includes('exercise') || message.includes('training')) {
        activities.push('Exercise session')
      }
      if (message.includes('resort') || message.includes('sedona') || message.includes('views')) {
        activities.push('Resort time')
      }
      if (message.includes('relax') || message.includes('chill') || message.includes('enjoying')) {
        activities.push('Relaxation time')
      }
    }
    
    // Add insights as notes
    notes.push(...insight.insights)
  })

  // Populate narrative with unique activities
  narrative.daily_schedule.activities = [...new Set(activities)].map(activity => ({
    type: 'activity',
    title: activity,
    description: getActivityDescription(activity),
    status: 'completed'
  }))

  narrative.notes_flags.flags = [...new Set(notes)]

  return narrative
}

function getActivityDescription(activity: string): string {
  const descriptions: { [key: string]: string } = {
    'Dining out': 'Enjoying a meal at a nice restaurant',
    'Exploring town': 'Walking around and taking in the local sights',
    'Outdoor activity': 'Time spent in nature and fresh air',
    'Exercise session': 'Physical activity and movement',
    'Resort time': 'Enjoying the beautiful resort surroundings',
    'Relaxation time': 'Taking time to unwind and enjoy'
  }
  return descriptions[activity] || 'Activity from natural conversation'
}
