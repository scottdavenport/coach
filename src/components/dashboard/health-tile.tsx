'use client';

import React from 'react';
import { Moon, Zap, TrendingUp, TrendingDown } from 'lucide-react';
import { AdaptiveTile } from './adaptive-tile';
import { DashboardMetric } from '@/hooks/use-dashboard-insights';

interface HealthTileProps {
  metrics: DashboardMetric[];
  onEdit?: () => void;
  onChat?: () => void;
}

export function HealthTile({ metrics, onEdit, onChat }: HealthTileProps) {
  // Find key health metrics
  const sleepScore = metrics.find(m => m.metric_key === 'sleep_score' || m.metric_key === 'sleep_quality');
  const energyLevel = metrics.find(m => m.metric_key === 'energy_level' || m.metric_key === 'energy');
  const readinessScore = metrics.find(m => m.metric_key === 'readiness_score' || m.metric_key === 'readiness');
  const heartRate = metrics.find(m => m.metric_key === 'resting_heart_rate' || m.metric_key === 'heart_rate');

  const getScoreColor = (score: number | undefined) => {
    if (!score) return 'text-gray-400';
    if (score >= 80) return 'text-green-600';
    if (score >= 60) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getScoreIcon = (score: number | undefined) => {
    if (!score) return null;
    if (score >= 80) return <TrendingUp className="h-3 w-3 text-green-600" />;
    if (score >= 60) return <TrendingUp className="h-3 w-3 text-yellow-600" />;
    return <TrendingDown className="h-3 w-3 text-red-600" />;
  };

  const getEnergyIcon = (level: number | undefined) => {
    if (!level) return <Zap className="h-4 w-4 text-gray-400" />;
    if (level >= 7) return <Zap className="h-4 w-4 text-green-600" />;
    if (level >= 4) return <Zap className="h-4 w-4 text-yellow-600" />;
    return <Zap className="h-4 w-4 text-red-600" />;
  };

  return (
    <AdaptiveTile
      title="Health"
      icon={<Moon className="h-4 w-4 text-blue-600" />}
      color="blue"
      onEdit={onEdit}
      onChat={onChat}
      isEditable={true}
    >
      <div className="space-y-3">
        {/* Sleep Score */}
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Moon className="h-3 w-3 text-gray-500" />
            <span className="text-xs text-gray-600">Sleep</span>
          </div>
          <div className="flex items-center space-x-1">
            {getScoreIcon(sleepScore?.metric_value)}
            <span className={`text-sm font-medium ${getScoreColor(sleepScore?.metric_value)}`}>
              {sleepScore?.metric_value || '--'}
            </span>
          </div>
        </div>

        {/* Energy Level */}
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            {getEnergyIcon(energyLevel?.metric_value)}
            <span className="text-xs text-gray-600">Energy</span>
          </div>
          <div className="flex items-center space-x-1">
            <span className={`text-sm font-medium ${getScoreColor(energyLevel?.metric_value)}`}>
              {energyLevel?.metric_value ? `${energyLevel.metric_value}/10` : '--'}
            </span>
          </div>
        </div>

        {/* Readiness Score */}
        {readinessScore && (
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <div className="h-3 w-3 rounded-full bg-purple-500"></div>
              <span className="text-xs text-gray-600">Readiness</span>
            </div>
            <div className="flex items-center space-x-1">
              {getScoreIcon(readinessScore.metric_value)}
              <span className={`text-sm font-medium ${getScoreColor(readinessScore.metric_value)}`}>
                {readinessScore.metric_value || '--'}
              </span>
            </div>
          </div>
        )}

        {/* Heart Rate */}
        {heartRate && (
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <div className="h-3 w-3 rounded-full bg-red-500"></div>
              <span className="text-xs text-gray-600">HR</span>
            </div>
            <span className="text-sm font-medium text-gray-700">
              {heartRate.metric_value || '--'} bpm
            </span>
          </div>
        )}

        {/* Quick Insight */}
        {sleepScore?.metric_value && energyLevel?.metric_value && (
          <div className="mt-2 p-2 bg-white/50 rounded-lg">
            <p className="text-xs text-gray-600">
              {sleepScore.metric_value >= 80 && energyLevel.metric_value >= 7
                ? 'Great recovery! Ready for an active day.'
                : sleepScore.metric_value < 60 || energyLevel.metric_value < 4
                ? 'Consider taking it easy today.'
                : 'Good baseline. Listen to your body.'}
            </p>
          </div>
        )}
      </div>
    </AdaptiveTile>
  );
}