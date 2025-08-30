import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET() {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get current week trends using the database function
    const { data: trends, error } = await supabase
      .rpc('get_current_week_trends', {
        user_id_param: user.id
      })

    if (error) {
      console.error('Error fetching current week trends:', error)
      return NextResponse.json({ error: 'Failed to fetch trends' }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      trends: trends || {}
    })

  } catch (error) {
    console.error('Current week trends error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
