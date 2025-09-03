import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { date } = await request.json()
    if (!date) {
      return NextResponse.json({ error: 'Date required' }, { status: 400 })
    }

    console.log(`📝 Generating daily narrative for ${date}`)

    // Fetch conversation insights for the date
    const { data: insights, error: insightsError } = await supabase
      .from('conversation_insights')
      .select('*')
      .eq('user_id', user.id)
      .eq('conversation_date', date)
      .order('created_at', { ascending: true })

    if (insightsError) {
      console.error('Error fetching insights:', insightsError)
      return NextResponse.json({ error: 'Failed to fetch insights' }, { status: 500 })
    }

    if (!insights || insights.length === 0) {
      console.log('No insights found for date:', date)
      return NextResponse.json({ message: 'No insights to process' })
    }

    // Build narrative from insights
    const narrative = buildNarrativeFromInsights(insights)

    // Check if narrative already exists for this date
    const { data: existingNarrative } = await supabase
      .from('daily_narratives')
      .select('id')
      .eq('user_id', user.id)
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
          user_id: user.id,
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

    return NextResponse.json({ 
      success: true, 
      narrative: result,
      insightsProcessed: insights.length 
    })

  } catch (error) {
    console.error('Error generating narrative:', error)
    return NextResponse.json({ 
      error: 'Failed to generate narrative',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
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
    
    // Extract activities based on insights
    insight.insights.forEach((insightText: string) => {
      if (insightText.includes('walk') || insightText.includes('hike')) {
        activities.push('Outdoor walking/hiking')
      }
      if (insightText.includes('dinner') || insightText.includes('restaurant')) {
        activities.push('Dining out')
      }
      if (insightText.includes('workout') || insightText.includes('exercise')) {
        activities.push('Exercise session')
      }
      if (insightText.includes('relax') || insightText.includes('enjoying')) {
        activities.push('Relaxation time')
      }
    })
    
    // Add insights as notes
    notes.push(...insight.insights)
  })

  // Populate narrative
  narrative.daily_schedule.activities = [...new Set(activities)].map(activity => ({
    type: 'activity',
    title: activity,
    description: 'From conversation',
    status: 'completed'
  }))

  narrative.notes_flags.flags = [...new Set(notes)]

  return narrative
}
