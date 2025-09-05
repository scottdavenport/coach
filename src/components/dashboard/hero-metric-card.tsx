'use client';

import React from 'react';
import { TrendChart, SimpleTrendIndicator } from './trend-chart';
import { MockWeeklyData, getTrendInfo } from '@/hooks/use-mock-data';

interface HeroMetricCardProps {
  title: string;
  value: number;
  unit: string;
  data: MockWeeklyData;
  metric: 'sleep' | 'readiness' | 'weight';
  onAskAboutTrend: () => void;
  showFullChart?: boolean;
}

export function HeroMetricCard({
  title,
  value,
  unit,
  data,
  metric,
  onAskAboutTrend,
  showFullChart = true,
}: HeroMetricCardProps) {

  return (
    <div className="bg-card border border-line rounded-lg p-6 space-y-4 hover:bg-card-2 transition-colors">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-medium text-text">{title}</h3>
        <SimpleTrendIndicator 
          trend={data.trend} 
          change={data.change} 
          metric={metric} 
        />
      </div>

      {/* Main Value */}
      <div className="space-y-2">
        <div className="flex items-baseline space-x-2">
          <span className="text-3xl font-bold text-text">
            {value.toFixed(metric === 'weight' ? 1 : 0)}
          </span>
          <span className="text-sm text-muted">{unit}</span>
        </div>
        
        {/* Trend description */}
        <p className="text-sm text-muted">
          {data.trend === 'up' && metric !== 'weight' && 'Improving this week'}
          {data.trend === 'down' && metric === 'weight' && 'Progress this week'}
          {data.trend === 'down' && metric !== 'weight' && 'Needs attention'}
          {data.trend === 'stable' && 'Stable this week'}
        </p>
      </div>

      {/* Trend Visualization */}
      {showFullChart ? (
        <TrendChart
          data={data.weeklyData}
          trend={data.trend}
          change={data.change}
          metric={metric}
        />
      ) : (
        <div className="h-8 flex items-center">
          <SimpleTrendIndicator 
            trend={data.trend} 
            change={data.change} 
            metric={metric} 
          />
        </div>
      )}

      {/* Ask about trend button */}
      <button
        onClick={onAskAboutTrend}
        className="w-full mt-4 px-4 py-2 bg-primary/10 hover:bg-primary/20 text-primary rounded-lg text-sm font-medium transition-colors border border-primary/20 hover:border-primary/30"
      >
        Ask about this trend
      </button>
    </div>
  );
}

// Compact version for smaller spaces
export function CompactHeroMetricCard({
  title,
  value,
  unit,
  data,
  metric,
  onAskAboutTrend,
}: Omit<HeroMetricCardProps, 'showFullChart'>) {
  const trendInfo = getTrendInfo(data.trend, metric);

  return (
    <div className="bg-card border border-line rounded-lg p-4 space-y-3 hover:bg-card-2 transition-colors">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h3 className="text-base font-medium text-text">{title}</h3>
        <SimpleTrendIndicator 
          trend={data.trend} 
          change={data.change} 
          metric={metric} 
        />
      </div>

      {/* Main Value */}
      <div className="flex items-baseline space-x-2">
        <span className="text-2xl font-bold text-text">
          {value.toFixed(metric === 'weight' ? 1 : 0)}
        </span>
        <span className="text-sm text-muted">{unit}</span>
      </div>

      {/* Simple trend line */}
      <div className="h-6 w-full">
        <svg viewBox="0 0 100 20" className="w-full h-full" preserveAspectRatio="none">
          <path
            d={`M 0,${20 - (data.weeklyData[0] / 100) * 20} L 25,${20 - (data.weeklyData[1] / 100) * 20} L 50,${20 - (data.weeklyData[2] / 100) * 20} L 75,${20 - (data.weeklyData[3] / 100) * 20} L 100,${20 - (data.weeklyData[4] / 100) * 20}`}
            fill="none"
            stroke={`hsl(var(--${trendInfo.isGood ? 'success' : data.trend === 'stable' ? 'muted' : 'warning'}))`}
            strokeWidth="2"
            strokeLinecap="round"
          />
        </svg>
      </div>

      {/* Ask about trend button */}
      <button
        onClick={onAskAboutTrend}
        className="w-full px-3 py-2 bg-primary/10 hover:bg-primary/20 text-primary rounded-md text-xs font-medium transition-colors"
      >
        Ask about trend
      </button>
    </div>
  );
}