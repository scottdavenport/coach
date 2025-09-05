import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { logger } from '@/lib/logger';
import { 
  UserWorkout,
  WorkoutExercise,
  WorkoutProgress 
} from '@/types';
import { validateRequestBody } from '@/lib/input-validation';
import { z } from 'zod';

// Validation schemas
const workoutExerciseSchema = z.object({
  exercise_id: z.string().uuid(),
  order_index: z.number().int().min(1),
  sets_completed: z.number().int().min(0).optional(),
  reps_completed: z.number().int().min(0).optional(),
  duration_completed: z.number().int().min(0).optional(),
  weight_used: z.number().positive().optional(),
  rest_taken: z.number().int().min(0).optional(),
  notes: z.string().optional(),
  difficulty_rating: z.number().int().min(1).max(5).optional(),
});

const workoutTrackingSchema = z.object({
  workout_id: z.string().uuid().optional(),
  template_id: z.string().uuid().optional(),
  workout_name: z.string().min(1).max(200),
  workout_date: z.string(),
  category: z.string().min(1).max(50),
  total_duration: z.number().int().min(1).optional(),
  notes: z.string().optional(),
  mood_before: z.number().int().min(1).max(10).optional(),
  mood_after: z.number().int().min(1).max(10).optional(),
  energy_before: z.number().int().min(1).max(10).optional(),
  energy_after: z.number().int().min(1).max(10).optional(),
  perceived_exertion: z.number().int().min(1).max(10).optional(),
  completion_status: z.enum(['completed', 'partial', 'skipped']).default('completed'),
  exercises: z.array(workoutExerciseSchema).min(1),
});

export async function POST(request: NextRequest) {
  try {
    logger.apiRequest('POST', '/api/workouts/track');

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
    const validation = validateRequestBody(body, workoutTrackingSchema);

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

    const workoutData = validation.data;

    logger.info('Tracking workout', {
      userId: user.id,
      workoutName: workoutData.workout_name,
      exerciseCount: workoutData.exercises.length,
      completionStatus: workoutData.completion_status,
    });

    // Check if workout already exists for this date and name
    const { data: existingWorkout } = await supabase
      .from('user_workouts')
      .select('id')
      .eq('user_id', user.id)
      .eq('workout_date', workoutData.workout_date)
      .eq('workout_name', workoutData.workout_name)
      .single();

    let workoutId: string;

    if (existingWorkout) {
      // Update existing workout
      const { data: updatedWorkout, error: updateError } = await supabase
        .from('user_workouts')
        .update({
          template_id: workoutData.template_id,
          category: workoutData.category,
          total_duration: workoutData.total_duration,
          notes: workoutData.notes,
          mood_before: workoutData.mood_before,
          mood_after: workoutData.mood_after,
          energy_before: workoutData.energy_before,
          energy_after: workoutData.energy_after,
          perceived_exertion: workoutData.perceived_exertion,
          completion_status: workoutData.completion_status,
          updated_at: new Date().toISOString(),
        })
        .eq('id', existingWorkout.id)
        .select()
        .single();

      if (updateError) {
        logger.error('Failed to update workout', updateError);
        return NextResponse.json(
          { error: 'Failed to update workout' },
          { status: 500 }
        );
      }

      workoutId = updatedWorkout.id;

      // Delete existing exercises and re-insert
      const { error: deleteError } = await supabase
        .from('workout_exercises')
        .delete()
        .eq('workout_id', workoutId);

      if (deleteError) {
        logger.error('Failed to delete existing exercises', deleteError);
      }
    } else {
      // Create new workout
      const { data: newWorkout, error: createError } = await supabase
        .from('user_workouts')
        .insert({
          user_id: user.id,
          template_id: workoutData.template_id,
          workout_date: workoutData.workout_date,
          workout_name: workoutData.workout_name,
          category: workoutData.category,
          total_duration: workoutData.total_duration,
          notes: workoutData.notes,
          mood_before: workoutData.mood_before,
          mood_after: workoutData.mood_after,
          energy_before: workoutData.energy_before,
          energy_after: workoutData.energy_after,
          perceived_exertion: workoutData.perceived_exertion,
          completion_status: workoutData.completion_status,
        })
        .select()
        .single();

      if (createError) {
        logger.error('Failed to create workout', createError);
        return NextResponse.json(
          { error: 'Failed to create workout' },
          { status: 500 }
        );
      }

      workoutId = newWorkout.id;
    }

    // Insert workout exercises
    const exerciseData = workoutData.exercises.map(exercise => ({
      workout_id: workoutId,
      exercise_id: exercise.exercise_id,
      order_index: exercise.order_index,
      sets_completed: exercise.sets_completed,
      reps_completed: exercise.reps_completed,
      duration_completed: exercise.duration_completed,
      weight_used: exercise.weight_used,
      rest_taken: exercise.rest_taken,
      notes: exercise.notes,
      difficulty_rating: exercise.difficulty_rating,
    }));

    const { data: insertedExercises, error: exercisesError } = await supabase
      .from('workout_exercises')
      .insert(exerciseData)
      .select(`
        *,
        exercise:exercises(*)
      `);

    if (exercisesError) {
      logger.error('Failed to insert workout exercises', exercisesError);
      return NextResponse.json(
        { error: 'Failed to track exercises' },
        { status: 500 }
      );
    }

    // Track progress for exercises with new personal records
    await trackWorkoutProgress(user.id, workoutId, insertedExercises, supabase);

    // Update workout recommendations as completed if this was from a recommendation
    if (workoutData.template_id) {
      const { error: recommendationError } = await supabase
        .from('workout_recommendations')
        .update({ is_completed: true })
        .eq('user_id', user.id)
        .eq('recommended_template_id', workoutData.template_id)
        .eq('recommendation_date', workoutData.workout_date)
        .eq('is_completed', false);

      if (recommendationError) {
        logger.error('Failed to update workout recommendation', recommendationError);
      }
    }

    // Get the complete workout data to return
    const { data: completeWorkout, error: fetchError } = await supabase
      .from('user_workouts')
      .select(`
        *,
        exercises:workout_exercises(
          *,
          exercise:exercises(*)
        )
      `)
      .eq('id', workoutId)
      .single();

    if (fetchError) {
      logger.error('Failed to fetch complete workout', fetchError);
    }

    logger.info('Workout tracked successfully', {
      userId: user.id,
      workoutId,
      exerciseCount: insertedExercises.length,
    });

    return NextResponse.json({
      success: true,
      workout: completeWorkout,
      message: 'Workout tracked successfully',
    });

  } catch (error: any) {
    logger.error(
      'Workout tracking API error',
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

async function trackWorkoutProgress(
  userId: string,
  workoutId: string,
  exercises: any[],
  supabase: any
) {
  try {
    const progressRecords = [];

    for (const exercise of exercises) {
      const exerciseId = exercise.exercise_id;
      const weightUsed = exercise.weight_used;
      const repsCompleted = exercise.reps_completed;
      const durationCompleted = exercise.duration_completed;

      // Check for new personal records
      if (weightUsed && repsCompleted) {
        // Check if this is a new max weight for this rep range
        const { data: existingMax } = await supabase
          .from('workout_progress')
          .select('metric_value')
          .eq('user_id', userId)
          .eq('exercise_id', exerciseId)
          .eq('metric_type', 'max_weight')
          .eq('metric_unit', 'kg')
          .order('metric_value', { ascending: false })
          .limit(1)
          .single();

        if (!existingMax || weightUsed > existingMax.metric_value) {
          progressRecords.push({
            user_id: userId,
            exercise_id: exerciseId,
            metric_type: 'max_weight',
            metric_value: weightUsed,
            metric_unit: 'kg',
            achieved_date: new Date().toISOString().split('T')[0],
            workout_id: workoutId,
            notes: `New max weight: ${weightUsed}kg for ${repsCompleted} reps`,
          });
        }
      }

      if (repsCompleted && !weightUsed) {
        // Check for new max reps (bodyweight exercises)
        const { data: existingMaxReps } = await supabase
          .from('workout_progress')
          .select('metric_value')
          .eq('user_id', userId)
          .eq('exercise_id', exerciseId)
          .eq('metric_type', 'max_reps')
          .order('metric_value', { ascending: false })
          .limit(1)
          .single();

        if (!existingMaxReps || repsCompleted > existingMaxReps.metric_value) {
          progressRecords.push({
            user_id: userId,
            exercise_id: exerciseId,
            metric_type: 'max_reps',
            metric_value: repsCompleted,
            metric_unit: 'reps',
            achieved_date: new Date().toISOString().split('T')[0],
            workout_id: workoutId,
            notes: `New max reps: ${repsCompleted} reps`,
          });
        }
      }

      if (durationCompleted) {
        // Check for new max duration
        const { data: existingMaxDuration } = await supabase
          .from('workout_progress')
          .select('metric_value')
          .eq('user_id', userId)
          .eq('exercise_id', exerciseId)
          .eq('metric_type', 'max_duration')
          .eq('metric_unit', 'seconds')
          .order('metric_value', { ascending: false })
          .limit(1)
          .single();

        if (!existingMaxDuration || durationCompleted > existingMaxDuration.metric_value) {
          progressRecords.push({
            user_id: userId,
            exercise_id: exerciseId,
            metric_type: 'max_duration',
            metric_value: durationCompleted,
            metric_unit: 'seconds',
            achieved_date: new Date().toISOString().split('T')[0],
            workout_id: workoutId,
            notes: `New max duration: ${durationCompleted} seconds`,
          });
        }
      }
    }

    // Insert progress records
    if (progressRecords.length > 0) {
      const { error: progressError } = await supabase
        .from('workout_progress')
        .insert(progressRecords);

      if (progressError) {
        logger.error('Failed to track workout progress', progressError);
      } else {
        logger.info('Tracked workout progress', {
          userId,
          workoutId,
          progressRecords: progressRecords.length,
        });
      }
    }
  } catch (error) {
    logger.error('Error tracking workout progress', error);
  }
}

// GET endpoint to retrieve user's workout history
export async function GET(request: NextRequest) {
  try {
    logger.apiRequest('GET', '/api/workouts/track');

    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      logger.error('Authentication failed - no user found');
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const date = searchParams.get('date');
    const limit = parseInt(searchParams.get('limit') || '10');
    const offset = parseInt(searchParams.get('offset') || '0');

    let query = supabase
      .from('user_workouts')
      .select(`
        *,
        exercises:workout_exercises(
          *,
          exercise:exercises(*)
        )
      `)
      .eq('user_id', user.id)
      .order('workout_date', { ascending: false })
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (date) {
      query = query.eq('workout_date', date);
    }

    const { data: workouts, error } = await query;

    if (error) {
      logger.error('Failed to fetch workouts', error);
      return NextResponse.json(
        { error: 'Failed to fetch workouts' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      workouts,
      pagination: {
        limit,
        offset,
        hasMore: workouts.length === limit,
      },
    });

  } catch (error: any) {
    logger.error(
      'Workout fetch API error',
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