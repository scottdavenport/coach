'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  TrendingUp, 
  Calendar, 
  Target, 
  Award,
  BarChart3,
  Dumbbell,
  Clock,
  Zap
} from 'lucide-react';
import { WorkoutProgress as WorkoutProgressType, UserWorkout } from '@/types';

interface WorkoutProgressProps {
  userId: string;
  timeRange?: 'week' | 'month' | 'quarter' | 'year';
}

export function WorkoutProgress({ userId, timeRange = 'month' }: WorkoutProgressProps) {
  const [progress, setProgress] = useState<WorkoutProgressType[]>([]);
  const [workouts, setWorkouts] = useState<UserWorkout[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedTimeRange, setSelectedTimeRange] = useState(timeRange);

  useEffect(() => {
    loadProgressData();
  }, [userId, selectedTimeRange]);

  const loadProgressData = async () => {
    setIsLoading(true);
    try {
      // Load workout progress records
      const progressResponse = await fetch(`/api/workouts/progress?timeRange=${selectedTimeRange}`);
      const progressData = await progressResponse.json();
      
      if (progressData.success) {
        setProgress(progressData.progress || []);
      }

      // Load recent workouts
      const workoutsResponse = await fetch(`/api/workouts/track?limit=20`);
      const workoutsData = await workoutsResponse.json();
      
      if (workoutsData.success) {
        setWorkouts(workoutsData.workouts || []);
      }
    } catch (error) {
      console.error('Failed to load progress data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const getTimeRangeLabel = (range: string) => {
    switch (range) {
      case 'week': return 'Last 7 days';
      case 'month': return 'Last 30 days';
      case 'quarter': return 'Last 3 months';
      case 'year': return 'Last year';
      default: return 'Last 30 days';
    }
  };

  const getTimeRangeDays = (range: string) => {
    switch (range) {
      case 'week': return 7;
      case 'month': return 30;
      case 'quarter': return 90;
      case 'year': return 365;
      default: return 30;
    }
  };

  const calculateStats = () => {
    const days = getTimeRangeDays(selectedTimeRange);
    const cutoffDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    
    const recentWorkouts = workouts.filter(w => w.workout_date >= cutoffDate);
    const recentProgress = progress.filter(p => p.achieved_date >= cutoffDate);

    const totalWorkouts = recentWorkouts.length;
    const completedWorkouts = recentWorkouts.filter(w => w.completion_status === 'completed').length;
    const totalDuration = recentWorkouts.reduce((sum, w) => sum + (w.total_duration || 0), 0);
    const averageIntensity = recentWorkouts.reduce((sum, w) => sum + (w.perceived_exertion || 0), 0) / Math.max(totalWorkouts, 1);
    
    const personalRecords = recentProgress.filter(p => p.metric_type === 'personal_record').length;
    const strengthGains = recentProgress.filter(p => p.metric_type === 'max_weight').length;
    const enduranceGains = recentProgress.filter(p => p.metric_type === 'max_duration').length;

    return {
      totalWorkouts,
      completedWorkouts,
      completionRate: totalWorkouts > 0 ? (completedWorkouts / totalWorkouts) * 100 : 0,
      totalDuration,
      averageIntensity: Math.round(averageIntensity * 10) / 10,
      personalRecords,
      strengthGains,
      enduranceGains,
    };
  };

  const getCategoryStats = () => {
    const days = getTimeRangeDays(selectedTimeRange);
    const cutoffDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    
    const recentWorkouts = workouts.filter(w => w.workout_date >= cutoffDate);
    const categoryCounts = recentWorkouts.reduce((acc: any, workout) => {
      acc[workout.category] = (acc[workout.category] || 0) + 1;
      return acc;
    }, {});

    return Object.entries(categoryCounts).map(([category, count]) => ({
      category,
      count: count as number,
      percentage: (count as number) / recentWorkouts.length * 100,
    }));
  };

  const getRecentPersonalRecords = () => {
    return progress
      .filter(p => p.metric_type === 'personal_record' || p.metric_type === 'max_weight' || p.metric_type === 'max_reps')
      .sort((a, b) => new Date(b.achieved_date).getTime() - new Date(a.achieved_date).getTime())
      .slice(0, 5);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
    });
  };

  const formatMetricValue = (progress: WorkoutProgressType) => {
    const value = progress.metric_value;
    const unit = progress.metric_unit || '';
    
    switch (progress.metric_type) {
      case 'max_weight':
        return `${value}${unit}`;
      case 'max_reps':
        return `${value} reps`;
      case 'max_duration':
        const minutes = Math.floor(value / 60);
        const seconds = value % 60;
        return `${minutes}:${seconds.toString().padStart(2, '0')}`;
      default:
        return `${value}${unit}`;
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  const stats = calculateStats();
  const categoryStats = getCategoryStats();
  const recentPRs = getRecentPersonalRecords();

  return (
    <div className="space-y-6">
      {/* Time Range Selector */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5" />
            Workout Progress
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-2">
            {['week', 'month', 'quarter', 'year'].map((range) => (
              <Button
                key={range}
                variant={selectedTimeRange === range ? 'default' : 'outline'}
                size="sm"
                onClick={() => setSelectedTimeRange(range as any)}
              >
                {getTimeRangeLabel(range)}
              </Button>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Overview Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4 text-blue-500" />
              <div>
                <p className="text-2xl font-bold">{stats.totalWorkouts}</p>
                <p className="text-xs text-muted-foreground">Total Workouts</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Target className="h-4 w-4 text-green-500" />
              <div>
                <p className="text-2xl font-bold">{Math.round(stats.completionRate)}%</p>
                <p className="text-xs text-muted-foreground">Completion Rate</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-orange-500" />
              <div>
                <p className="text-2xl font-bold">{Math.round(stats.totalDuration)}</p>
                <p className="text-xs text-muted-foreground">Total Minutes</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Zap className="h-4 w-4 text-purple-500" />
              <div>
                <p className="text-2xl font-bold">{stats.averageIntensity}</p>
                <p className="text-xs text-muted-foreground">Avg Intensity</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Personal Records */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Award className="h-5 w-5" />
            Recent Personal Records
          </CardTitle>
        </CardHeader>
        <CardContent>
          {recentPRs.length > 0 ? (
            <div className="space-y-3">
              {recentPRs.map((pr, index) => (
                <div key={index} className="flex items-center justify-between p-3 border rounded-lg">
                  <div>
                    <p className="font-medium">{pr.exercise.name}</p>
                    <p className="text-sm text-muted-foreground">
                      {pr.metric_type.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-lg">{formatMetricValue(pr)}</p>
                    <p className="text-xs text-muted-foreground">{formatDate(pr.achieved_date)}</p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-muted-foreground text-center py-4">
              No personal records set in this time period
            </p>
          )}
        </CardContent>
      </Card>

      {/* Workout Categories */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Dumbbell className="h-5 w-5" />
            Workout Categories
          </CardTitle>
        </CardHeader>
        <CardContent>
          {categoryStats.length > 0 ? (
            <div className="space-y-3">
              {categoryStats.map((stat, index) => (
                <div key={index} className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="capitalize font-medium">{stat.category}</span>
                    <span className="text-sm text-muted-foreground">
                      {stat.count} workouts ({Math.round(stat.percentage)}%)
                    </span>
                  </div>
                  <div className="w-full bg-muted rounded-full h-2">
                    <div
                      className="bg-primary h-2 rounded-full transition-all duration-300"
                      style={{ width: `${stat.percentage}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-muted-foreground text-center py-4">
              No workout data available for this time period
            </p>
          )}
        </CardContent>
      </Card>

      {/* Progress Insights */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            Progress Insights
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {stats.completionRate >= 80 && (
              <div className="flex items-center gap-2 p-3 bg-green-50 border border-green-200 rounded-lg">
                <div className="w-2 h-2 bg-green-500 rounded-full" />
                <p className="text-sm text-green-800">
                  Excellent workout consistency! You're completing {Math.round(stats.completionRate)}% of your planned workouts.
                </p>
              </div>
            )}

            {stats.completionRate < 50 && (
              <div className="flex items-center gap-2 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                <div className="w-2 h-2 bg-yellow-500 rounded-full" />
                <p className="text-sm text-yellow-800">
                  Consider reducing workout intensity or duration to improve completion rate.
                </p>
              </div>
            )}

            {stats.personalRecords > 0 && (
              <div className="flex items-center gap-2 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                <div className="w-2 h-2 bg-blue-500 rounded-full" />
                <p className="text-sm text-blue-800">
                  Great progress! You've set {stats.personalRecords} personal records in this period.
                </p>
              </div>
            )}

            {stats.averageIntensity > 7 && (
              <div className="flex items-center gap-2 p-3 bg-orange-50 border border-orange-200 rounded-lg">
                <div className="w-2 h-2 bg-orange-500 rounded-full" />
                <p className="text-sm text-orange-800">
                  High intensity workouts detected. Make sure to include adequate recovery time.
                </p>
              </div>
            )}

            {stats.totalWorkouts === 0 && (
              <div className="flex items-center gap-2 p-3 bg-gray-50 border border-gray-200 rounded-lg">
                <div className="w-2 h-2 bg-gray-500 rounded-full" />
                <p className="text-sm text-gray-800">
                  No workouts recorded in this time period. Start with small, achievable goals!
                </p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}