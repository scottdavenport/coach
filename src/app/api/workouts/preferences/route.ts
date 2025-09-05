import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { logger } from '@/lib/logger';
import { UserWorkoutPreferences } from '@/types';
import { validateRequestBody } from '@/lib/input-validation';
import { z } from 'zod';

// Validation schema for workout preferences
const workoutPreferencesSchema = z.object({
  fitness_level: z.enum(['beginner', 'intermediate', 'advanced']).optional(),
  primary_goals: z.array(z.string()).optional(),
  available_equipment: z.array(z.string()).optional(),
  preferred_workout_duration: z.number().int().min(5).max(180).optional(),
  preferred_workout_times: z.array(z.string()).optional(),
  workout_frequency: z.number().int().min(1).max(7).optional(),
  injury_limitations: z.array(z.string()).optional(),
  exercise_preferences: z.array(z.string()).optional(),
});

export async function GET(request: NextRequest) {
  try {
    logger.apiRequest('GET', '/api/workouts/preferences');

    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      logger.error('Authentication failed - no user found');
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data: preferences, error } = await supabase
      .from('user_workout_preferences')
      .select('*')
      .eq('user_id', user.id)
      .single();

    if (error && error.code !== 'PGRST116') {
      logger.error('Failed to fetch workout preferences', error);
      return NextResponse.json(
        { error: 'Failed to fetch preferences' },
        { status: 500 }
      );
    }

    // Return default preferences if none exist
    const defaultPreferences: UserWorkoutPreferences = {
      id: '',
      user_id: user.id,
      fitness_level: 'beginner',
      primary_goals: ['general_fitness'],
      available_equipment: ['bodyweight'],
      preferred_workout_duration: 30,
      preferred_workout_times: ['morning'],
      workout_frequency: 3,
      injury_limitations: [],
      exercise_preferences: [],
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    return NextResponse.json({
      success: true,
      preferences: preferences || defaultPreferences,
    });

  } catch (error: any) {
    logger.error(
      'Workout preferences GET API error',
      error instanceof Error ? error : new Error('Unknown error'),
      {
        timestamp: new Date().toISOString(),
      }
    );

    return NextResponse.json(
      {
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    logger.apiRequest('POST', '/api/workouts/preferences');

    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      logger.error('Authentication failed - no user found');
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Validate request body
    const body = await request.json();
    const validation = validateRequestBody(body, workoutPreferencesSchema);

    if (!validation.success) {
      logger.error('Input validation failed', {
        error: validation.error,
        details: validation.details,
      });
      return NextResponse.json(
        { error: 'Invalid input', details: (validation as any).details },
        { status: 400 }
      );
    }

    const preferencesData = validation.data;

    logger.info('Updating workout preferences', {
      userId: user.id,
      preferences: preferencesData,
    });

    // Check if preferences already exist
    const { data: existingPreferences } = await supabase
      .from('user_workout_preferences')
      .select('id')
      .eq('user_id', user.id)
      .single();

    let result;

    if (existingPreferences) {
      // Update existing preferences
      const { data: updatedPreferences, error: updateError } = await supabase
        .from('user_workout_preferences')
        .update({
          ...preferencesData,
          updated_at: new Date().toISOString(),
        })
        .eq('user_id', user.id)
        .select()
        .single();

      if (updateError) {
        logger.error('Failed to update workout preferences', updateError);
        return NextResponse.json(
          { error: 'Failed to update preferences' },
          { status: 500 }
        );
      }

      result = updatedPreferences;
    } else {
      // Create new preferences
      const { data: newPreferences, error: createError } = await supabase
        .from('user_workout_preferences')
        .insert({
          user_id: user.id,
          ...preferencesData,
        })
        .select()
        .single();

      if (createError) {
        logger.error('Failed to create workout preferences', createError);
        return NextResponse.json(
          { error: 'Failed to create preferences' },
          { status: 500 }
        );
      }

      result = newPreferences;
    }

    logger.info('Workout preferences updated successfully', {
      userId: user.id,
      preferencesId: result.id,
    });

    return NextResponse.json({
      success: true,
      preferences: result,
      message: 'Preferences updated successfully',
    });

  } catch (error: any) {
    logger.error(
      'Workout preferences POST API error',
      error instanceof Error ? error : new Error('Unknown error'),
      {
        timestamp: new Date().toISOString(),
      }
    );

    return NextResponse.json(
      {
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    );
  }
}