import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { events, contextData, dailySummary } = await request.json()

    console.log('💾 **STORING RICH CONTEXT DATA:**')
    console.log('User ID:', user.id)
    if (events && events.length > 0) {
      console.log('Events to store:', JSON.stringify(events, null, 2))
    }
    if (contextData && contextData.length > 0) {
      console.log('Context data to store:', JSON.stringify(contextData, null, 2))
    }
    if (dailySummary) {
      console.log('Daily summary to store:', JSON.stringify(dailySummary, null, 2))
    }
    console.log('---')

    // Ensure user exists in the users table
    const { error: userError } = await supabase
      .from('users')
      .select('id')
      .eq('id', user.id)
      .single()

    if (userError && userError.code === 'PGRST116') {
      // User doesn't exist, create them
      const { error: createUserError } = await supabase
        .from('users')
        .insert({
          id: user.id,
          email: user.email
        })

      if (createUserError) {
        console.error('Error creating user:', createUserError)
        return NextResponse.json({ error: 'Failed to create user' }, { status: 500 })
      }
    } else if (userError) {
      console.error('Error checking user:', userError)
      return NextResponse.json({ error: 'Failed to verify user' }, { status: 500 })
    }

    const today = new Date().toISOString().split('T')[0]
    const storedMetrics = []
    const storedJournalEntries = []

    // Store metrics in the new daily_metrics table
    if (dailySummary) {
      const metricMappings = [
        { key: 'mood', type: 'mood', unit: '/10' },
        { key: 'energy', type: 'energy', unit: '/10' },
        { key: 'stress', type: 'stress', unit: '/10' },
        { key: 'readiness', type: 'readiness', unit: '' },
        { key: 'sleep_hours', type: 'sleep_hours', unit: 'hours' },
        { key: 'sleep_quality', type: 'sleep_quality', unit: '/10' },
        { key: 'resting_heart_rate', type: 'heart_rate', unit: 'bpm' },
        { key: 'weight', type: 'weight', unit: 'lbs' }
      ]

      for (const mapping of metricMappings) {
        if (dailySummary[mapping.key] !== null && dailySummary[mapping.key] !== undefined) {
          const { data: metricData, error: metricError } = await supabase
            .from('daily_metrics')
            .upsert({
              user_id: user.id,
              metric_date: today,
              metric_type: mapping.type,
              metric_value: dailySummary[mapping.key],
              metric_unit: mapping.unit,
              source: 'conversation',
              confidence: 1.0
            }, {
              onConflict: 'user_id,metric_date,metric_type'
            })
            .select()
            .single()

          if (metricError) {
            console.error(`Error storing metric ${mapping.key}:`, metricError)
          } else {
            storedMetrics.push(metricData)
          }
        }
      }
    }

    // Store context data as journal entries
    if (contextData && contextData.length > 0) {
      for (const context of contextData) {
        // Determine entry type based on category and key
        let entryType = 'note'
        if (context.key.includes('tip') || context.key.includes('advice')) {
          entryType = 'tip'
        } else if (context.key.includes('goal') || context.key.includes('intention')) {
          entryType = 'goal'
        }

        // Determine category
        let category = 'lifestyle'
        if (context.category === 'sleep' || context.category === 'wellness') {
          category = 'wellness'
        } else if (context.category === 'workout' || context.category === 'fitness') {
          category = 'fitness'
        } else if (context.category === 'biometric' || context.category === 'health') {
          category = 'health'
        }

        const { data: journalData, error: journalError } = await supabase
          .from('daily_journal')
          .insert({
            user_id: user.id,
            journal_date: today,
            entry_type: entryType,
            category: category,
            content: Array.isArray(context.value) ? context.value.join('\n') : context.value,
            source: 'conversation',
            confidence: context.confidence || 0.8
          })
          .select()
          .single()

        if (journalError) {
          console.error('Error storing journal entry:', journalError)
        } else {
          storedJournalEntries.push(journalData)
        }
      }
    }

    // Store workout events as daily activities
    const storedActivities = []
    if (events && events.length > 0) {
      for (const event of events) {
        if (event.event_type === 'workout') {
          // Create a completed activity from workout event
          const { data: activityData, error: activityError } = await supabase
            .from('daily_activities')
            .insert({
              user_id: user.id,
              activity_date: today,
              activity_type: 'workout',
              status: 'completed',
              title: `Workout - ${event.data.duration || 'Unknown duration'}`,
              description: `Completed workout from conversation`,
              completed_data: event.data,
              source: 'conversation'
            })
            .select()
            .single()

          if (activityError) {
            console.error('Error storing workout activity:', activityError)
          } else {
            storedActivities.push(activityData)
          }
        }
      }
    }

    // Store individual health events (keep for historical tracking)
    const storedEvents = []
    if (events && events.length > 0) {
      for (const event of events) {
        const { data: eventData, error: eventError } = await supabase
          .from('events')
          .insert({
            user_id: user.id,
            conversation_id: null,
            event_type: event.event_type,
            data: event.data
          })
          .select()
          .single()

        if (eventError) {
          console.error('Error storing event:', eventError)
        } else {
          storedEvents.push(eventData)
        }
      }
    }

    console.log('✅ **STORAGE COMPLETE:**')
    console.log(`Stored ${storedMetrics.length} metrics`)
    console.log(`Stored ${storedJournalEntries.length} journal entries`)
    console.log(`Stored ${storedActivities.length} activities`)
    console.log(`Stored ${storedEvents.length} events`)

    return NextResponse.json({ 
      success: true,
      storedMetrics,
      storedJournalEntries,
      storedActivities,
      storedEvents,
      message: `Successfully stored ${storedMetrics.length} metrics, ${storedJournalEntries.length} journal entries, ${storedActivities.length} activities, and ${storedEvents.length} events`
    })

  } catch (error) {
    console.error('Health store API error:', error)
    return NextResponse.json(
      { error: 'Internal server error' }, 
      { status: 500 }
    )
  }
}
