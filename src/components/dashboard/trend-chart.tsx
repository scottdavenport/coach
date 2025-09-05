'use client';

import React from 'react';
import { getTrendInfo, formatChange, getWeekLabels } from '@/hooks/use-mock-data';

interface TrendChartProps {
  data: number[];
  trend: 'up' | 'down' | 'stable';
  change: number;
  metric: 'sleep' | 'readiness' | 'weight';
  className?: string;
}

export function TrendChart({ data, trend, change, metric, className = '' }: TrendChartProps) {
  const trendInfo = getTrendInfo(trend, metric);
  const weekLabels = getWeekLabels();
  
  // Find min and max values for scaling
  const minValue = Math.min(...data);
  const maxValue = Math.max(...data);
  const range = maxValue - minValue;
  
  // Add some padding to the range
  const paddedMin = minValue - range * 0.1;
  const paddedMax = maxValue + range * 0.1;
  const paddedRange = paddedMax - paddedMin;

  // Generate SVG path for the line
  const points = data.map((value, index) => {
    const x = (index / (data.length - 1)) * 100;
    const y = 100 - ((value - paddedMin) / paddedRange) * 100;
    return `${x},${y}`;
  });

  const pathData = `M ${points.join(' L ')}`;

  return (
    <div className={`space-y-3 ${className}`}>
      {/* Trend indicator */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <span className={`text-lg ${trendInfo.color}`}>
            {trendInfo.icon}
          </span>
          <span className="text-sm text-muted">
            {formatChange(change)} this week
          </span>
        </div>
      </div>

      {/* Simple line chart */}
      <div className="relative h-16 w-full">
        <svg
          viewBox="0 0 100 100"
          className="w-full h-full"
          preserveAspectRatio="none"
        >
          {/* Grid lines */}
          <defs>
            <pattern id="grid" width="20" height="20" patternUnits="userSpaceOnUse">
              <path d="M 20 0 L 0 0 0 20" fill="none" stroke="hsl(var(--line))" strokeWidth="0.5" opacity="0.3"/>
            </pattern>
          </defs>
          <rect width="100" height="100" fill="url(#grid)" />
          
          {/* Trend line */}
          <path
            d={pathData}
            fill="none"
            stroke={`hsl(var(--${trendInfo.isGood ? 'success' : trend === 'stable' ? 'muted' : 'warning'}))`}
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          
          {/* Data points */}
          {points.map((point, index) => {
            const [x, y] = point.split(',').map(Number);
            return (
              <circle
                key={index}
                cx={x}
                cy={y}
                r="2"
                fill={`hsl(var(--${trendInfo.isGood ? 'success' : trend === 'stable' ? 'muted' : 'warning'}))`}
                className="drop-shadow-sm"
              />
            );
          })}
        </svg>
      </div>

      {/* Week labels */}
      <div className="flex justify-between text-xs text-subtle">
        {weekLabels.map((label, index) => (
          <span key={index} className="text-center">
            {label}
          </span>
        ))}
      </div>
    </div>
  );
}

// Alternative simple trend indicator for when space is limited
export function SimpleTrendIndicator({ 
  trend, 
  change, 
  metric 
}: { 
  trend: 'up' | 'down' | 'stable'; 
  change: number; 
  metric: 'sleep' | 'readiness' | 'weight';
}) {
  const trendInfo = getTrendInfo(trend, metric);
  
  return (
    <div className="flex items-center space-x-1">
      <span className={`text-sm ${trendInfo.color}`}>
        {trendInfo.icon}
      </span>
      <span className="text-xs text-muted">
        {formatChange(change)}
      </span>
    </div>
  );
}