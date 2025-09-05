'use client';

import React from 'react';
import { Target, CheckCircle, Circle, Plus } from 'lucide-react';
import { AdaptiveTile } from './adaptive-tile';

interface GoalsTileProps {
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

export function GoalsTile({ goals, onEdit, onChat }: GoalsTileProps) {
  const completedGoals = goals.filter(g => g.is_completed);
  const pendingGoals = goals.filter(g => !g.is_completed);
  const completionRate = goals.length > 0 ? (completedGoals.length / goals.length) * 100 : 0;

  const getGoalTypeIcon = (type: string) => {
    switch (type.toLowerCase()) {
      case 'fitness':
        return '💪';
      case 'nutrition':
        return '🥗';
      case 'sleep':
        return '😴';
      case 'wellness':
        return '🧘';
      case 'lifestyle':
        return '🌟';
      default:
        return '🎯';
    }
  };

  const getGoalTypeColor = (type: string) => {
    switch (type.toLowerCase()) {
      case 'fitness':
        return 'text-blue-600';
      case 'nutrition':
        return 'text-green-600';
      case 'sleep':
        return 'text-purple-600';
      case 'wellness':
        return 'text-pink-600';
      case 'lifestyle':
        return 'text-orange-600';
      default:
        return 'text-gray-600';
    }
  };

  const getCompletionMessage = () => {
    if (completionRate === 100) return 'Perfect! All goals completed today.';
    if (completionRate >= 75) return 'Great progress! Almost there.';
    if (completionRate >= 50) return 'Good start! Keep going.';
    if (completionRate > 0) return 'Making progress! Every step counts.';
    return 'Ready to tackle your goals today?';
  };

  return (
    <AdaptiveTile
      title="Daily Goals"
      icon={<Target className="h-4 w-4 text-orange-600" />}
      color="orange"
      onEdit={onEdit}
      onChat={onChat}
      isEditable={true}
    >
      <div className="space-y-3">
        {/* Progress Overview */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-gray-600">Progress</span>
            <span className="text-xs text-gray-500">
              {completedGoals.length}/{goals.length}
            </span>
          </div>
          
          {/* Progress Bar */}
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div 
              className="bg-orange-500 h-2 rounded-full transition-all duration-300"
              style={{ width: `${completionRate}%` }}
            ></div>
          </div>
          
          <p className="text-xs text-gray-500">
            {completionRate.toFixed(0)}% complete
          </p>
        </div>

        {/* Goals List */}
        {goals.length > 0 ? (
          <div className="space-y-2">
            {goals.slice(0, 4).map(goal => (
              <div key={goal.id} className="flex items-center space-x-2">
                {goal.is_completed ? (
                  <CheckCircle className="h-3 w-3 text-green-600 flex-shrink-0" />
                ) : (
                  <Circle className="h-3 w-3 text-gray-400 flex-shrink-0" />
                )}
                <span className="text-xs">{getGoalTypeIcon(goal.goal_type)}</span>
                <span className={`text-xs flex-1 truncate ${goal.is_completed ? 'line-through text-gray-500' : 'text-gray-700'}`}>
                  {goal.title}
                </span>
              </div>
            ))}
            
            {goals.length > 4 && (
              <p className="text-xs text-gray-500 ml-5">
                +{goals.length - 4} more goals
              </p>
            )}
          </div>
        ) : (
          <div className="text-center py-2">
            <Target className="h-6 w-6 text-gray-300 mx-auto mb-1" />
            <p className="text-xs text-gray-500">No goals set for today</p>
          </div>
        )}

        {/* Completion Message */}
        {goals.length > 0 && (
          <div className="p-2 bg-white/50 rounded-lg">
            <p className="text-xs text-gray-600">
              {getCompletionMessage()}
            </p>
          </div>
        )}

        {/* Quick Actions */}
        <div className="flex items-center justify-between pt-2 border-t border-gray-200/50">
          <button 
            onClick={onEdit}
            className="flex items-center space-x-1 text-xs text-orange-600 hover:text-orange-700"
          >
            <Plus className="h-3 w-3" />
            <span>Add Goal</span>
          </button>
          
          {goals.length > 0 && (
            <button 
              onClick={onChat}
              className="text-xs text-gray-500 hover:text-gray-700"
            >
              Get Tips
            </button>
          )}
        </div>
      </div>
    </AdaptiveTile>
  );
}