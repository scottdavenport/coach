import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const date = searchParams.get('date')

    if (!date) {
      return NextResponse.json({ error: 'Date parameter required' }, { status: 400 })
    }

    const { data: metrics, error } = await supabase
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
      .eq('user_id', user.id)
      .eq('metric_date', date)
      .order('created_at')

    if (error) {
      console.error('Error fetching daily metrics:', error)
      return NextResponse.json({ error: 'Failed to fetch metrics' }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      metrics
    })

  } catch (error) {
    console.error('Daily metrics error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { metrics } = await request.json()

    if (!Array.isArray(metrics)) {
      return NextResponse.json({ error: 'Metrics array required' }, { status: 400 })
    }

    const { data, error } = await supabase
      .from('user_daily_metrics')
      .upsert(
        metrics.map(metric => ({
          user_id: user.id,
          metric_id: metric.metric_id,
          metric_date: metric.metric_date,
          metric_value: metric.metric_value,
          text_value: metric.text_value,
          boolean_value: metric.boolean_value,
          time_value: metric.time_value,
          source: metric.source,
          confidence: metric.confidence || 1.0
        })),
        { onConflict: 'user_id,metric_id,metric_date' }
      )
      .select()

    if (error) {
      console.error('Error storing daily metrics:', error)
      return NextResponse.json({ error: 'Failed to store metrics' }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      metrics: data
    })

  } catch (error) {
    console.error('Store daily metrics error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
