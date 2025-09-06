import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { logger } from '@/lib/logger';

export async function POST(request: NextRequest) {
  try {
    logger.apiRequest('POST', '/api/preferences/reset');

    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      logger.error('Authentication failed - no user found');
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    logger.info('Starting user data reset', { userId: user.id });

    // List of tables to clear user data from (in dependency order)
    const tablesToReset = [
      // Workout-related data
      'workout_progress',
      'workout_exercises',
      'user_workouts',
      'workout_recommendations',
      'user_workout_preferences',

      // Activity and goal data
      'daily_activities',
      'daily_goals',

      // Journal and mood data
      'mood_tracking',
      'daily_journal',
      'daily_narratives',

      // Metrics and insights
      'user_daily_metrics',
      'user_metric_preferences',
      'conversation_insights',

      // Conversation data
      'conversation_file_attachments',
      'conversations',
      'events',

      // Weekly and monthly summaries
      'weekly_summaries',
      'monthly_trends',

      // File uploads
      'user_uploads',

      // Oura integration data
      'oura_data',
      'oura_integrations',

      // OCR feedback and training data
      'ocr_feedback',
      'ocr_training_data',
    ];

    const resetResults = [];
    let totalDeleted = 0;

    // Clear data from each table
    for (const tableName of tablesToReset) {
      try {
        const { data, error, count } = await supabase
          .from(tableName)
          .delete()
          .eq('user_id', user.id)
          .select('id', { count: 'exact' });

        if (error) {
          logger.error(`Error clearing table ${tableName}`, {
            error: error.message,
          });
          resetResults.push({
            table: tableName,
            success: false,
            error: error.message,
          });
        } else {
          const deletedCount = count || 0;
          totalDeleted += deletedCount;
          logger.info(`Cleared table ${tableName}`, { deletedCount });
          resetResults.push({ table: tableName, success: true, deletedCount });
        }
      } catch (err) {
        const errorMessage =
          err instanceof Error ? err.message : 'Unknown error';
        logger.error(`Exception clearing table ${tableName}`, {
          error: errorMessage,
        });
        resetResults.push({
          table: tableName,
          success: false,
          error: errorMessage,
        });
      }
    }

    // Reset user profile to defaults (keep the user record but reset profile data)
    try {
      const { error: profileError } = await supabase
        .from('users')
        .update({
          profile: {},
          timezone: 'America/New_York', // Reset to default timezone
          updated_at: new Date().toISOString(),
        })
        .eq('id', user.id);

      if (profileError) {
        logger.error('Error resetting user profile', {
          error: profileError.message,
        });
        resetResults.push({
          table: 'users',
          success: false,
          error: profileError.message,
        });
      } else {
        logger.info('Reset user profile to defaults');
        resetResults.push({ table: 'users', success: true, deletedCount: 1 });
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      logger.error('Exception resetting user profile', { error: errorMessage });
      resetResults.push({
        table: 'users',
        success: false,
        error: errorMessage,
      });
    }

    const successCount = resetResults.filter(r => r.success).length;
    const failureCount = resetResults.filter(r => !r.success).length;

    logger.info('User data reset completed', {
      userId: user.id,
      totalDeleted,
      successCount,
      failureCount,
      results: resetResults,
    });

    return NextResponse.json({
      success: true,
      message: 'User data reset successfully',
      summary: {
        totalRecordsDeleted: totalDeleted,
        tablesProcessed: resetResults.length,
        successfulTables: successCount,
        failedTables: failureCount,
      },
      details: resetResults,
    });
  } catch (error) {
    logger.error('Error in reset endpoint', { error });
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to reset user data',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
