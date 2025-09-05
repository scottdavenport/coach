'use client';

import React from 'react';
import { Activity, Target, CheckCircle, Circle } from 'lucide-react';
import { AdaptiveTile } from './adaptive-tile';
import { DashboardMetric } from '@/hooks/use-dashboard-insights';

interface ActivityTileProps {
  activities: Array<{
    id: string;
    title: string;
    activity_type: string;
    status: 'planned' | 'completed';
    description?: string;
  }>;
  goals: Array<{
    id: string;
    title: string;
    description?: string;
    is_completed: boolean;
    goal_type: string;
  }>;
  onEdit?: () => void;
  onChat?: () => void;
}

export function ActivityTile({ activities, goals, onEdit, onChat }: ActivityTileProps) {
  const completedActivities = activities.filter(a => a.status === 'completed');
  const plannedActivities = activities.filter(a => a.status === 'planned');
  const completedGoals = goals.filter(g => g.is_completed);
  const pendingGoals = goals.filter(g => !g.is_completed);

  const getActivityIcon = (type: string) => {
    switch (type.toLowerCase()) {
      case 'workout':
      case 'strength':
      case 'cardio':
        return <Activity className="h-3 w-3 text-blue-600" />;
      case 'walk':
      case 'run':
        return <Activity className="h-3 w-3 text-green-600" />;
      case 'yoga':
        return <Activity className="h-3 w-3 text-purple-600" />;
      default:
        return <Activity className="h-3 w-3 text-gray-600" />;
    }
  };

  return (
    <AdaptiveTile
      title="Activity & Goals"
      icon={<Target className="h-4 w-4 text-green-600" />}
      color="green"
      onEdit={onEdit}
      onChat={onChat}
      isEditable={true}
    >
      <div className="space-y-3">
        {/* Activities Summary */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-gray-600">Activities</span>
            <span className="text-xs text-gray-500">
              {completedActivities.length}/{activities.length} done
            </span>
          </div>
          
          {activities.length > 0 ? (
            <div className="space-y-1">
              {activities.slice(0, 3).map(activity => (
                <div key={activity.id} className="flex items-center space-x-2">
                  {activity.status === 'completed' ? (
                    <CheckCircle className="h-3 w-3 text-green-600" />
                  ) : (
                    <Circle className="h-3 w-3 text-gray-400" />
                  )}
                  {getActivityIcon(activity.activity_type)}
                  <span className="text-xs text-gray-700 truncate">
                    {activity.title}
                  </span>
                </div>
              ))}
              {activities.length > 3 && (
                <p className="text-xs text-gray-500 ml-5">
                  +{activities.length - 3} more
                </p>
              )}
            </div>
          ) : (
            <p className="text-xs text-gray-500 ml-5">No activities planned</p>
          )}
        </div>

        {/* Goals Summary */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-gray-600">Goals</span>
            <span className="text-xs text-gray-500">
              {completedGoals.length}/{goals.length} done
            </span>
          </div>
          
          {goals.length > 0 ? (
            <div className="space-y-1">
              {goals.slice(0, 2).map(goal => (
                <div key={goal.id} className="flex items-center space-x-2">
                  {goal.is_completed ? (
                    <CheckCircle className="h-3 w-3 text-green-600" />
                  ) : (
                    <Circle className="h-3 w-3 text-gray-400" />
                  )}
                  <Target className="h-3 w-3 text-orange-600" />
                  <span className="text-xs text-gray-700 truncate">
                    {goal.title}
                  </span>
                </div>
              ))}
              {goals.length > 2 && (
                <p className="text-xs text-gray-500 ml-5">
                  +{goals.length - 2} more
                </p>
              )}
            </div>
          ) : (
            <p className="text-xs text-gray-500 ml-5">No goals set</p>
          )}
        </div>

        {/* Quick Insight */}
        {(activities.length > 0 || goals.length > 0) && (
          <div className="mt-2 p-2 bg-white/50 rounded-lg">
            <p className="text-xs text-gray-600">
              {completedActivities.length === activities.length && completedGoals.length === goals.length
                ? 'Perfect day! All activities and goals completed.'
                : completedActivities.length > 0 || completedGoals.length > 0
                ? 'Good progress! Keep it up.'
                : 'Ready to start your day?'}
            </p>
          </div>
        )}
      </div>
    </AdaptiveTile>
  );
}