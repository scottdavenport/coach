'use client';

import React from 'react';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { AdaptiveTile } from './adaptive-tile';

interface TrendsTileProps {
  weeklyTrends: {
    sleep: { date: string; value: number }[];
    energy: { date: string; value: number }[];
    activity: { date: string; value: number }[];
  };
  onEdit?: () => void;
  onChat?: () => void;
}

export function TrendsTile({ weeklyTrends, onEdit, onChat }: TrendsTileProps) {
  // Calculate trend direction and percentage change
  const calculateTrend = (data: { date: string; value: number }[]): { direction: 'up' | 'down' | 'stable'; change: number } => {
    if (data.length < 2) return { direction: 'stable', change: 0 };
    
    const recent = data.slice(-3); // Last 3 days
    const older = data.slice(-6, -3); // Previous 3 days
    
    if (recent.length === 0 || older.length === 0) return { direction: 'stable', change: 0 };
    
    const recentAvg = recent.reduce((sum, item) => sum + item.value, 0) / recent.length;
    const olderAvg = older.reduce((sum, item) => sum + item.value, 0) / older.length;
    
    const change = ((recentAvg - olderAvg) / olderAvg) * 100;
    
    if (Math.abs(change) < 5) return { direction: 'stable', change: 0 };
    return { 
      direction: change > 0 ? 'up' : 'down', 
      change: Math.abs(change) 
    };
  };

  const sleepTrend = calculateTrend(weeklyTrends.sleep);
  const energyTrend = calculateTrend(weeklyTrends.energy);
  const activityTrend = calculateTrend(weeklyTrends.activity);

  const getTrendIcon = (direction: 'up' | 'down' | 'stable') => {
    switch (direction) {
      case 'up':
        return <TrendingUp className="h-3 w-3 text-green-600" />;
      case 'down':
        return <TrendingDown className="h-3 w-3 text-red-600" />;
      default:
        return <Minus className="h-3 w-3 text-gray-400" />;
    }
  };

  const getTrendColor = (direction: 'up' | 'down' | 'stable') => {
    switch (direction) {
      case 'up':
        return 'text-green-600';
      case 'down':
        return 'text-red-600';
      default:
        return 'text-gray-500';
    }
  };

  const formatTrendText = (trend: { direction: 'up' | 'down' | 'stable'; change: number }) => {
    if (trend.direction === 'stable') return 'Stable';
    return `${trend.change.toFixed(0)}% ${trend.direction}`;
  };

  // Simple sparkline visualization
  const Sparkline = ({ data, color = 'blue' }: { data: { date: string; value: number }[]; color?: string }) => {
    if (data.length < 2) return <div className="h-8 bg-gray-100 rounded"></div>;
    
    const max = Math.max(...data.map(d => d.value));
    const min = Math.min(...data.map(d => d.value));
    const range = max - min || 1;
    
    const points = data.map((d, i) => {
      const x = (i / (data.length - 1)) * 100;
      const y = 100 - ((d.value - min) / range) * 100;
      return `${x},${y}`;
    }).join(' ');
    
    const colorClasses = {
      blue: 'stroke-blue-500',
      green: 'stroke-green-500',
      purple: 'stroke-purple-500',
    };
    
    return (
      <div className="h-8 w-full">
        <svg viewBox="0 0 100 100" className="w-full h-full">
          <polyline
            points={points}
            fill="none"
            strokeWidth="2"
            className={colorClasses[color as keyof typeof colorClasses]}
          />
        </svg>
      </div>
    );
  };

  return (
    <AdaptiveTile
      title="Weekly Trends"
      icon={<TrendingUp className="h-4 w-4 text-blue-600" />}
      color="blue"
      onEdit={onEdit}
      onChat={onChat}
      isEditable={false}
    >
      <div className="space-y-4">
        {/* Sleep Trend */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <span className="text-xs">😴</span>
              <span className="text-xs font-medium text-gray-600">Sleep</span>
            </div>
            <div className="flex items-center space-x-1">
              {getTrendIcon(sleepTrend.direction)}
              <span className={`text-xs font-medium ${getTrendColor(sleepTrend.direction)}`}>
                {formatTrendText(sleepTrend)}
              </span>
            </div>
          </div>
          <Sparkline data={weeklyTrends.sleep} color="blue" />
        </div>

        {/* Energy Trend */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <span className="text-xs">⚡</span>
              <span className="text-xs font-medium text-gray-600">Energy</span>
            </div>
            <div className="flex items-center space-x-1">
              {getTrendIcon(energyTrend.direction)}
              <span className={`text-xs font-medium ${getTrendColor(energyTrend.direction)}`}>
                {formatTrendText(energyTrend)}
              </span>
            </div>
          </div>
          <Sparkline data={weeklyTrends.energy} color="green" />
        </div>

        {/* Activity Trend */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <span className="text-xs">🏃</span>
              <span className="text-xs font-medium text-gray-600">Activity</span>
            </div>
            <div className="flex items-center space-x-1">
              {getTrendIcon(activityTrend.direction)}
              <span className={`text-xs font-medium ${getTrendColor(activityTrend.direction)}`}>
                {formatTrendText(activityTrend)}
              </span>
            </div>
          </div>
          <Sparkline data={weeklyTrends.activity} color="purple" />
        </div>

        {/* Summary */}
        <div className="mt-3 p-2 bg-white/50 rounded-lg">
          <p className="text-xs text-gray-600">
            {sleepTrend.direction === 'up' && energyTrend.direction === 'up'
              ? '📈 Great week! Both sleep and energy are trending up.'
              : sleepTrend.direction === 'down' || energyTrend.direction === 'down'
              ? '📉 Some metrics declining. Consider adjusting your routine.'
              : '📊 Steady progress. Keep maintaining your current habits.'}
          </p>
        </div>
      </div>
    </AdaptiveTile>
  );
}