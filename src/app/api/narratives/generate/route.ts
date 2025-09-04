import { NextRequest, NextResponse } from 'next/server';
import { generateDailyNarrative } from '@/lib/narrative-generator';
import { createClient } from '@/lib/supabase/server';

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { date } = await request.json();
    if (!date) {
      return NextResponse.json({ error: 'Date required' }, { status: 400 });
    }

    console.log(`📝 API: Generating daily narrative for ${date}`);

    // Call the enhanced narrative generator
    const result = await generateDailyNarrative(user.id, date);

    if (result.success) {
      return NextResponse.json(result);
    } else {
      return NextResponse.json(
        {
          error: 'Failed to generate narrative',
          details: result.error,
        },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error('Error in narrative generation API:', error);
    return NextResponse.json(
      {
        error: 'Failed to generate narrative',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

// This function is no longer used - replaced by rich AI-powered generation in narrative-generator.ts
