'use client';

import React from 'react';
import { WeeklyInsights as WeeklyInsightsType } from '@/lib/coaching/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { TrendingUp, Target, Lightbulb, Trophy, Calendar } from 'lucide-react';

interface WeeklyInsightsProps {
  insights: WeeklyInsightsType;
  className?: string;
}

export function WeeklyInsights({ insights, className = '' }: WeeklyInsightsProps) {
  if (!insights) {
    return null;
  }

  const formatDateRange = (startDate: Date, endDate: Date) => {
    const start = startDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    const end = endDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    return `${start} - ${end}`;
  };

  return (
    <Card className={`bg-gradient-to-br from-green-50 to-emerald-50 border-green-200 ${className}`}>
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg font-semibold text-green-900 flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            Weekly Insights
          </CardTitle>
          <div className="flex items-center gap-2">
            <Badge variant="secondary" className="bg-green-100 text-green-700">
              <Calendar className="h-3 w-3 mr-1" />
              {formatDateRange(insights.weekStart, insights.weekEnd)}
            </Badge>
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {/* Top Performer */}
        <div className="p-4 bg-white rounded-lg border border-green-100">
          <div className="flex items-start gap-3">
            <div className="flex-shrink-0 w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
              <Trophy className="h-4 w-4 text-green-600" />
            </div>
            <div>
              <h3 className="font-medium text-gray-900 mb-1">Top Performer</h3>
              <p className="text-gray-700 text-sm leading-relaxed">{insights.topPerformer}</p>
            </div>
          </div>
        </div>

        {/* Biggest Improvement */}
        <div className="p-4 bg-white rounded-lg border border-blue-100">
          <div className="flex items-start gap-3">
            <div className="flex-shrink-0 w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
              <TrendingUp className="h-4 w-4 text-blue-600" />
            </div>
            <div>
              <h3 className="font-medium text-gray-900 mb-1">Biggest Improvement</h3>
              <p className="text-gray-700 text-sm leading-relaxed">{insights.improvement}</p>
            </div>
          </div>
        </div>

        {/* Recommendation */}
        <div className="p-4 bg-white rounded-lg border border-purple-100">
          <div className="flex items-start gap-3">
            <div className="flex-shrink-0 w-8 h-8 bg-purple-100 rounded-full flex items-center justify-center">
              <Lightbulb className="h-4 w-4 text-purple-600" />
            </div>
            <div>
              <h3 className="font-medium text-gray-900 mb-1">Next Week's Focus</h3>
              <p className="text-gray-700 text-sm leading-relaxed">{insights.recommendation}</p>
            </div>
          </div>
        </div>

        {/* Celebration */}
        <div className="p-4 bg-gradient-to-r from-yellow-50 to-orange-50 rounded-lg border border-yellow-200">
          <div className="flex items-start gap-3">
            <div className="flex-shrink-0 w-8 h-8 bg-yellow-100 rounded-full flex items-center justify-center">
              <Target className="h-4 w-4 text-yellow-600" />
            </div>
            <div>
              <h3 className="font-medium text-gray-900 mb-1">Week's Highlight</h3>
              <p className="text-gray-700 text-sm leading-relaxed font-medium">{insights.celebration}</p>
            </div>
          </div>
        </div>

        {/* Summary Stats */}
        <div className="grid grid-cols-2 gap-3 pt-2">
          <div className="text-center p-3 bg-white rounded-lg border border-gray-100">
            <div className="text-lg font-semibold text-green-600">Week</div>
            <div className="text-xs text-gray-500">Complete</div>
          </div>
          <div className="text-center p-3 bg-white rounded-lg border border-gray-100">
            <div className="text-lg font-semibold text-blue-600">Trend</div>
            <div className="text-xs text-gray-500">Positive</div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}