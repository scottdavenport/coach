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

export function WeeklyInsights({
  insights,
  className = '',
}: WeeklyInsightsProps) {
  if (!insights) {
    return null;
  }

  const formatDateRange = (startDate: Date, endDate: Date) => {
    const start = startDate.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
    });
    const end = endDate.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
    });
    return `${start} - ${end}`;
  };

  return (
    <Card className={`bg-card border-border ${className}`}>
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg font-semibold text-text flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            Weekly Insights
          </CardTitle>
          <div className="flex items-center gap-2">
            <Badge variant="secondary" className="bg-card-2 text-text">
              <Calendar className="h-3 w-3 mr-1" />
              {formatDateRange(insights.weekStart, insights.weekEnd)}
            </Badge>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Top Performer */}
        <div className="p-4 bg-card-2 rounded-lg border border-border">
          <div className="flex items-start gap-3">
            <div className="flex-shrink-0 w-8 h-8 bg-green-500/10 rounded-full flex items-center justify-center">
              <Trophy className="h-4 w-4 text-green-500" />
            </div>
            <div>
              <h3 className="font-medium text-text mb-1">Top Performer</h3>
              <p className="text-muted text-sm leading-relaxed">
                {insights.topPerformer}
              </p>
            </div>
          </div>
        </div>

        {/* Biggest Improvement */}
        <div className="p-4 bg-card-2 rounded-lg border border-border">
          <div className="flex items-start gap-3">
            <div className="flex-shrink-0 w-8 h-8 bg-blue-500/10 rounded-full flex items-center justify-center">
              <TrendingUp className="h-4 w-4 text-blue-500" />
            </div>
            <div>
              <h3 className="font-medium text-text mb-1">
                Biggest Improvement
              </h3>
              <p className="text-muted text-sm leading-relaxed">
                {insights.improvement}
              </p>
            </div>
          </div>
        </div>

        {/* Recommendation */}
        <div className="p-4 bg-card-2 rounded-lg border border-border">
          <div className="flex items-start gap-3">
            <div className="flex-shrink-0 w-8 h-8 bg-purple-500/10 rounded-full flex items-center justify-center">
              <Lightbulb className="h-4 w-4 text-purple-500" />
            </div>
            <div>
              <h3 className="font-medium text-text mb-1">Next Week's Focus</h3>
              <p className="text-muted text-sm leading-relaxed">
                {insights.recommendation}
              </p>
            </div>
          </div>
        </div>

        {/* Celebration */}
        <div className="p-4 bg-card-2 rounded-lg border border-border">
          <div className="flex items-start gap-3">
            <div className="flex-shrink-0 w-8 h-8 bg-yellow-500/10 rounded-full flex items-center justify-center">
              <Target className="h-4 w-4 text-yellow-500" />
            </div>
            <div>
              <h3 className="font-medium text-text mb-1">Week's Highlight</h3>
              <p className="text-muted text-sm leading-relaxed font-medium">
                {insights.celebration}
              </p>
            </div>
          </div>
        </div>

        {/* Summary Stats */}
        <div className="grid grid-cols-2 gap-3 pt-2">
          <div className="text-center p-3 bg-card-2 rounded-lg border border-border">
            <div className="text-lg font-semibold text-green-500">Week</div>
            <div className="text-xs text-muted">Complete</div>
          </div>
          <div className="text-center p-3 bg-card-2 rounded-lg border border-border">
            <div className="text-lg font-semibold text-blue-500">Trend</div>
            <div className="text-xs text-muted">Positive</div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
