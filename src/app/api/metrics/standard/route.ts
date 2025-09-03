import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET() {
  try {
    const supabase = await createClient()
    
    const { data: metrics, error } = await supabase
      .from('standard_metrics')
      .select(`
        *,
        metric_categories (
          name,
          display_name,
          icon,
          color
        )
      `)
      .order('sort_order')

    if (error) {
      console.error('Error fetching standard metrics:', error)
      return NextResponse.json({ error: 'Failed to fetch metrics' }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      metrics
    })

  } catch (error) {
    console.error('Standard metrics error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
