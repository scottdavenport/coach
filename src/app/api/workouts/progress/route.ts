import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { logger } from '@/lib/logger';

export async function GET(request: NextRequest) {
  try {
    logger.apiRequest('GET', '/api/workouts/progress');

    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      logger.error('Authentication failed - no user found');
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const timeRange = searchParams.get('timeRange') || 'month';

    // Calculate date range based on timeRange
    const now = new Date();
    let startDate: Date;

    switch (timeRange) {
      case 'week':
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
      case 'month':
        startDate = new Date(
          now.getFullYear(),
          now.getMonth() - 1,
          now.getDate()
        );
        break;
      case 'year':
        startDate = new Date(
          now.getFullYear() - 1,
          now.getMonth(),
          now.getDate()
        );
        break;
      default:
        startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    }

    // Get workout progress data
    const { data: progressData, error: progressError } = await supabase
      .from('workout_progress')
      .select(
        `
        *,
        exercise:exercises(*)
      `
      )
      .eq('user_id', user.id)
      .gte('achieved_date', startDate.toISOString().split('T')[0])
      .order('achieved_date', { ascending: false });

    if (progressError) {
      logger.error('Failed to fetch workout progress', {
        error: progressError,
      });
      return NextResponse.json(
        { error: 'Failed to fetch progress data' },
        { status: 500 }
      );
    }

    // Get workout history for context
    const { data: workoutHistory, error: historyError } = await supabase
      .from('user_workouts')
      .select(
        `
        *,
        exercises:workout_exercises(
          *,
          exercise:exercises(*)
        )
      `
      )
      .eq('user_id', user.id)
      .gte('workout_date', startDate.toISOString().split('T')[0])
      .order('workout_date', { ascending: false });

    if (historyError) {
      logger.error('Failed to fetch workout history', { error: historyError });
      return NextResponse.json(
        { error: 'Failed to fetch workout history' },
        { status: 500 }
      );
    }

    // Calculate progress metrics
    const totalWorkouts = workoutHistory?.length || 0;
    const totalDuration =
      workoutHistory?.reduce(
        (sum, workout) => sum + (workout.total_duration || 0),
        0
      ) || 0;
    const averageDuration =
      totalWorkouts > 0 ? Math.round(totalDuration / totalWorkouts) : 0;

    // Group progress by exercise
    const exerciseProgress =
      progressData?.reduce(
        (acc, progress) => {
          const exerciseName = progress.exercise?.name || 'Unknown';
          if (!acc[exerciseName]) {
            acc[exerciseName] = {
              exercise: progress.exercise,
              records: [],
              bestValue: 0,
              improvement: 0,
            };
          }
          acc[exerciseName].records.push(progress);
          if (progress.metric_value > acc[exerciseName].bestValue) {
            acc[exerciseName].bestValue = progress.metric_value;
          }
          return acc;
        },
        {} as Record<string, any>
      ) || {};

    // Calculate improvements
    Object.values(exerciseProgress).forEach((exercise: any) => {
      if (exercise.records.length > 1) {
        const sorted = exercise.records.sort(
          (a: any, b: any) =>
            new Date(a.achieved_date).getTime() -
            new Date(b.achieved_date).getTime()
        );
        const first = sorted[0].metric_value;
        const last = sorted[sorted.length - 1].metric_value;
        exercise.improvement = last - first;
      }
    });

    const response = {
      timeRange,
      totalWorkouts,
      totalDuration,
      averageDuration,
      exerciseProgress,
      workoutHistory: workoutHistory || [],
      progressData: progressData || [],
    };

    logger.info('Workout progress fetched successfully', {
      userId: user.id,
      timeRange,
      totalWorkouts,
      totalDuration,
    });

    return NextResponse.json(response);
  } catch (error) {
    logger.error('Error fetching workout progress', { error });
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
