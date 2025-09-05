'use client';

import React, { useState } from 'react';
import { useDashboardInsights } from '@/hooks/use-dashboard-insights';
import { HealthTile } from './health-tile';
import { ActivityTile } from './activity-tile';
import { MoodTile } from './mood-tile';
import { InsightsTile } from './insights-tile';
import { TrendsTile } from './trends-tile';
import { GoalsTile } from './goals-tile';
import { Loader2 } from 'lucide-react';

interface DashboardInsightsProps {
  userId: string;
  selectedDate?: string;
  onChatMessage?: (message: string) => void;
}

export function DashboardInsights({ 
  userId, 
  selectedDate, 
  onChatMessage 
}: DashboardInsightsProps) {
  const { insights, loading, error, updateMetric } = useDashboardInsights(userId, selectedDate);
  const [editingTile, setEditingTile] = useState<string | null>(null);

  const handleChatAbout = (tileType: string, context: string) => {
    const messages = {
      health: `Tell me more about my health metrics and how I can improve them.`,
      activity: `I'd like to discuss my activity goals and workout plans.`,
      mood: `Can you help me understand my mood patterns and wellbeing?`,
      insights: `I want to learn more about these AI insights and recommendations.`,
      trends: `Help me analyze these trends and what they mean for my health.`,
      goals: `I need help with my daily goals and how to achieve them better.`,
    };
    
    const message = messages[tileType as keyof typeof messages] || context;
    onChatMessage?.(message);
  };

  const handleEditTile = (tileType: string) => {
    setEditingTile(tileType);
    // In a real implementation, this would open an edit modal or inline editor
    console.log(`Editing ${tileType} tile`);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto mb-4" />
          <p className="text-sm text-muted">Loading your insights...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <p className="text-sm text-red-600 mb-2">Failed to load insights</p>
          <p className="text-xs text-muted">{error}</p>
        </div>
      </div>
    );
  }

  if (!insights) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <p className="text-sm text-muted">No insights available</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="text-center">
        <h2 className="text-lg font-semibold text-gray-800 mb-1">
          Your Health Dashboard
        </h2>
        <p className="text-sm text-gray-600">
          {selectedDate 
            ? new Date(selectedDate).toLocaleDateString('en-US', { 
                weekday: 'long', 
                year: 'numeric', 
                month: 'long', 
                day: 'numeric' 
              })
            : 'Today\'s insights and progress'
          }
        </p>
      </div>

      {/* Tiles Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {/* Health Tile */}
        <HealthTile
          metrics={insights.todayMetrics}
          onEdit={() => handleEditTile('health')}
          onChat={() => handleChatAbout('health', 'health metrics')}
        />

        {/* Activity Tile */}
        <ActivityTile
          activities={insights.activities}
          goals={insights.goals}
          onEdit={() => handleEditTile('activity')}
          onChat={() => handleChatAbout('activity', 'activity goals')}
        />

        {/* Mood Tile */}
        <MoodTile
          metrics={insights.todayMetrics}
          recentInsights={insights.recentInsights}
          onEdit={() => handleEditTile('mood')}
          onChat={() => handleChatAbout('mood', 'mood patterns')}
        />

        {/* Insights Tile */}
        <InsightsTile
          recentInsights={insights.recentInsights}
          onEdit={() => handleEditTile('insights')}
          onChat={() => handleChatAbout('insights', 'AI insights')}
        />

        {/* Trends Tile */}
        <TrendsTile
          weeklyTrends={insights.weeklyTrends}
          onEdit={() => handleEditTile('trends')}
          onChat={() => handleChatAbout('trends', 'weekly trends')}
        />

        {/* Goals Tile */}
        <GoalsTile
          goals={insights.goals}
          onEdit={() => handleEditTile('goals')}
          onChat={() => handleChatAbout('goals', 'daily goals')}
        />
      </div>

      {/* Quick Actions */}
      <div className="flex justify-center space-x-4 pt-4">
        <button
          onClick={() => handleChatAbout('general', 'How can I improve my health today?')}
          className="px-4 py-2 bg-primary text-white rounded-lg text-sm hover:bg-primary/90 transition-colors"
        >
          Ask Coach Anything
        </button>
        <button
          onClick={() => handleEditTile('general')}
          className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg text-sm hover:bg-gray-50 transition-colors"
        >
          Add Data
        </button>
      </div>
    </div>
  );
}