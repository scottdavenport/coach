'use client';

import React from 'react';
import { Lightbulb, TrendingUp, AlertCircle, Info } from 'lucide-react';
import { AdaptiveTile } from './adaptive-tile';

interface InsightsTileProps {
  recentInsights: Array<{
    type: 'sleep' | 'energy' | 'activity' | 'mood' | 'general';
    message: string;
    priority: 'high' | 'medium' | 'low';
    timestamp: string;
  }>;
  onEdit?: () => void;
  onChat?: () => void;
}

export function InsightsTile({ recentInsights, onEdit, onChat }: InsightsTileProps) {
  // Sort insights by priority and recency
  const sortedInsights = [...recentInsights].sort((a, b) => {
    const priorityOrder = { high: 3, medium: 2, low: 1 };
    if (priorityOrder[a.priority] !== priorityOrder[b.priority]) {
      return priorityOrder[b.priority] - priorityOrder[a.priority];
    }
    return new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime();
  });

  const getPriorityIcon = (priority: 'high' | 'medium' | 'low') => {
    switch (priority) {
      case 'high':
        return <AlertCircle className="h-3 w-3 text-red-600" />;
      case 'medium':
        return <TrendingUp className="h-3 w-3 text-yellow-600" />;
      case 'low':
        return <Info className="h-3 w-3 text-blue-600" />;
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'sleep':
        return '😴';
      case 'energy':
        return '⚡';
      case 'activity':
        return '🏃';
      case 'mood':
        return '😊';
      default:
        return '💡';
    }
  };

  const formatTimeAgo = (timestamp: string) => {
    const now = new Date();
    const time = new Date(timestamp);
    const diffInHours = Math.floor((now.getTime() - time.getTime()) / (1000 * 60 * 60));
    
    if (diffInHours < 1) return 'Just now';
    if (diffInHours < 24) return `${diffInHours}h ago`;
    const diffInDays = Math.floor(diffInHours / 24);
    return `${diffInDays}d ago`;
  };

  return (
    <AdaptiveTile
      title="AI Insights"
      icon={<Lightbulb className="h-4 w-4 text-orange-600" />}
      color="orange"
      onEdit={onEdit}
      onChat={onChat}
      isEditable={false}
    >
      <div className="space-y-3">
        {sortedInsights.length > 0 ? (
          <>
            {sortedInsights.slice(0, 3).map((insight, index) => (
              <div key={index} className="space-y-2">
                <div className="flex items-start space-x-2">
                  <div className="flex items-center space-x-1 mt-0.5">
                    {getPriorityIcon(insight.priority)}
                    <span className="text-xs">{getTypeIcon(insight.type)}</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs text-gray-700 leading-relaxed">
                      {insight.message.length > 100 
                        ? `${insight.message.substring(0, 100)}...`
                        : insight.message}
                    </p>
                    <p className="text-xs text-gray-500 mt-1">
                      {formatTimeAgo(insight.timestamp)}
                    </p>
                  </div>
                </div>
                {index < sortedInsights.length - 1 && index < 2 && (
                  <div className="border-b border-gray-200/50"></div>
                )}
              </div>
            ))}
            
            {sortedInsights.length > 3 && (
              <div className="text-center">
                <p className="text-xs text-gray-500">
                  +{sortedInsights.length - 3} more insights
                </p>
              </div>
            )}
          </>
        ) : (
          <div className="text-center py-4">
            <Lightbulb className="h-8 w-8 text-gray-300 mx-auto mb-2" />
            <p className="text-xs text-gray-500">
              No insights yet. Start a conversation to get personalized recommendations!
            </p>
          </div>
        )}

        {/* Quick Action */}
        {sortedInsights.length > 0 && (
          <div className="mt-3 p-2 bg-white/50 rounded-lg">
            <p className="text-xs text-gray-600">
              💡 <strong>Tip:</strong> Ask me about any of these insights for more details!
            </p>
          </div>
        )}
      </div>
    </AdaptiveTile>
  );
}