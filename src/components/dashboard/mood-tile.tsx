'use client';

import React from 'react';
import { Heart, Smile, Frown, Meh } from 'lucide-react';
import { AdaptiveTile } from './adaptive-tile';
import { DashboardMetric } from '@/hooks/use-dashboard-insights';

interface MoodTileProps {
  metrics: DashboardMetric[];
  recentInsights: Array<{
    type: 'sleep' | 'energy' | 'activity' | 'mood' | 'general';
    message: string;
    priority: 'high' | 'medium' | 'low';
    timestamp: string;
  }>;
  onEdit?: () => void;
  onChat?: () => void;
}

export function MoodTile({ metrics, recentInsights, onEdit, onChat }: MoodTileProps) {
  // Find mood-related metrics
  const moodScore = metrics.find(m => m.metric_key === 'mood' || m.metric_key === 'mood_score');
  const stressLevel = metrics.find(m => m.metric_key === 'stress_level' || m.metric_key === 'stress');
  const anxietyLevel = metrics.find(m => m.metric_key === 'anxiety_level' || m.metric_key === 'anxiety');

  // Extract mood-related insights
  const moodInsights = recentInsights.filter(insight => 
    insight.type === 'mood' || 
    insight.message.toLowerCase().includes('mood') ||
    insight.message.toLowerCase().includes('feel') ||
    insight.message.toLowerCase().includes('emotion')
  );

  const getMoodIcon = (score: number | undefined) => {
    if (!score) return <Meh className="h-4 w-4 text-gray-400" />;
    if (score >= 7) return <Smile className="h-4 w-4 text-green-600" />;
    if (score >= 4) return <Meh className="h-4 w-4 text-yellow-600" />;
    return <Frown className="h-4 w-4 text-red-600" />;
  };

  const getMoodColor = (score: number | undefined) => {
    if (!score) return 'text-gray-400';
    if (score >= 7) return 'text-green-600';
    if (score >= 4) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getMoodDescription = (score: number | undefined) => {
    if (!score) return 'No mood data';
    if (score >= 8) return 'Excellent';
    if (score >= 7) return 'Good';
    if (score >= 6) return 'Okay';
    if (score >= 4) return 'Low';
    return 'Poor';
  };

  return (
    <AdaptiveTile
      title="Mood & Wellbeing"
      icon={<Heart className="h-4 w-4 text-purple-600" />}
      color="purple"
      onEdit={onEdit}
      onChat={onChat}
      isEditable={true}
    >
      <div className="space-y-3">
        {/* Mood Score */}
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            {getMoodIcon(moodScore?.metric_value)}
            <span className="text-xs text-gray-600">Mood</span>
          </div>
          <div className="flex items-center space-x-1">
            <span className={`text-sm font-medium ${getMoodColor(moodScore?.metric_value)}`}>
              {moodScore?.metric_value ? `${moodScore.metric_value}/10` : '--'}
            </span>
          </div>
        </div>

        {/* Stress Level */}
        {stressLevel && (
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <div className="h-3 w-3 rounded-full bg-orange-500"></div>
              <span className="text-xs text-gray-600">Stress</span>
            </div>
            <span className={`text-sm font-medium ${getMoodColor(10 - (stressLevel.metric_value || 0))}`}>
              {stressLevel.metric_value ? `${stressLevel.metric_value}/10` : '--'}
            </span>
          </div>
        )}

        {/* Anxiety Level */}
        {anxietyLevel && (
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <div className="h-3 w-3 rounded-full bg-red-500"></div>
              <span className="text-xs text-gray-600">Anxiety</span>
            </div>
            <span className={`text-sm font-medium ${getMoodColor(10 - (anxietyLevel.metric_value || 0))}`}>
              {anxietyLevel.metric_value ? `${anxietyLevel.metric_value}/10` : '--'}
            </span>
          </div>
        )}

        {/* Mood Description */}
        {moodScore?.metric_value && (
          <div className="p-2 bg-white/50 rounded-lg">
            <p className="text-xs text-gray-600">
              <span className="font-medium">{getMoodDescription(moodScore.metric_value)}</span>
              {moodScore.metric_value >= 7 
                ? ' - You\'re feeling great today!'
                : moodScore.metric_value >= 4
                ? ' - Consider some self-care activities.'
                : ' - Take it easy and be kind to yourself.'}
            </p>
          </div>
        )}

        {/* Recent Mood Insights */}
        {moodInsights.length > 0 && (
          <div className="space-y-1">
            <span className="text-xs font-medium text-gray-600">Recent Notes</span>
            {moodInsights.slice(0, 2).map((insight, index) => (
              <div key={index} className="p-2 bg-white/30 rounded text-xs text-gray-600">
                {insight.message.length > 60 
                  ? `${insight.message.substring(0, 60)}...`
                  : insight.message}
              </div>
            ))}
          </div>
        )}

        {/* No Data State */}
        {!moodScore && !stressLevel && !anxietyLevel && moodInsights.length === 0 && (
          <div className="p-2 bg-white/50 rounded-lg">
            <p className="text-xs text-gray-500">
              How are you feeling today? Share your mood to get personalized insights.
            </p>
          </div>
        )}
      </div>
    </AdaptiveTile>
  );
}