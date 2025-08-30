import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get user's trend preferences
    const { data: userData, error } = await supabase
      .from('users')
      .select('profile')
      .eq('id', user.id)
      .single()

    if (error) {
      console.error('Error fetching user preferences:', error)
      return NextResponse.json({ error: 'Failed to fetch preferences' }, { status: 500 })
    }

    const trendPreferences = userData.profile?.trend_preferences || {
      enabled_metrics: ['sleep_hours', 'energy', 'mood', 'workout_completed', 'weight'],
      suggested_metrics: [],
      excluded_metrics: []
    }

    return NextResponse.json({
      success: true,
      preferences: trendPreferences
    })

  } catch (error) {
    console.error('Trend preferences error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function PUT(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { enabled_metrics, suggested_metrics, excluded_metrics } = await request.json()

    // Validate that at least one metric is enabled
    if (!enabled_metrics || enabled_metrics.length === 0) {
      return NextResponse.json({ 
        error: 'At least one metric must be enabled for trend tracking' 
      }, { status: 400 })
    }

    // Update user's trend preferences
    const { error } = await supabase
      .from('users')
      .update({
        profile: {
          trend_preferences: {
            enabled_metrics,
            suggested_metrics: suggested_metrics || [],
            excluded_metrics: excluded_metrics || []
          }
        }
      })
      .eq('id', user.id)

    if (error) {
      console.error('Error updating trend preferences:', error)
      return NextResponse.json({ error: 'Failed to update preferences' }, { status: 500 })
    }

    // Trigger recalculation of current week trends with new preferences
    const currentWeekStart = new Date()
    currentWeekStart.setDate(currentWeekStart.getDate() - currentWeekStart.getDay() + 1) // Monday
    
    await supabase.rpc('get_or_create_weekly_summary', {
      user_id_param: user.id,
      week_start_date: currentWeekStart.toISOString().split('T')[0]
    })

    return NextResponse.json({
      success: true,
      message: 'Trend preferences updated successfully'
    })

  } catch (error) {
    console.error('Update trend preferences error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
