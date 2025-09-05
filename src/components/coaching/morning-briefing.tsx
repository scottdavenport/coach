'use client';

import React from 'react';
import { MorningBriefing as MorningBriefingType } from '@/lib/coaching/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Target, TrendingUp, Lightbulb, Zap } from 'lucide-react';

interface MorningBriefingProps {
  briefing: MorningBriefingType;
  className?: string;
}

export function MorningBriefing({ briefing, className = '' }: MorningBriefingProps) {
  if (!briefing) {
    return null;
  }

  return (
    <Card className={`bg-gradient-to-br from-blue-50 to-indigo-50 border-blue-200 ${className}`}>
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg font-semibold text-blue-900 flex items-center gap-2">
            <Target className="h-5 w-5" />
            Today's Focus
          </CardTitle>
          <Badge variant="secondary" className="bg-blue-100 text-blue-700">
            Morning Briefing
          </Badge>
        </div>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {/* Daily Focus */}
        <div className="p-4 bg-white rounded-lg border border-blue-100">
          <div className="flex items-start gap-3">
            <div className="flex-shrink-0 w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
              <Target className="h-4 w-4 text-blue-600" />
            </div>
            <div>
              <h3 className="font-medium text-gray-900 mb-1">Daily Focus</h3>
              <p className="text-gray-700 text-sm leading-relaxed">{briefing.focus}</p>
            </div>
          </div>
        </div>

        {/* Insight */}
        <div className="p-4 bg-white rounded-lg border border-green-100">
          <div className="flex items-start gap-3">
            <div className="flex-shrink-0 w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
              <TrendingUp className="h-4 w-4 text-green-600" />
            </div>
            <div>
              <h3 className="font-medium text-gray-900 mb-1">Weekly Insight</h3>
              <p className="text-gray-700 text-sm leading-relaxed">{briefing.insight}</p>
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
              <h3 className="font-medium text-gray-900 mb-1">Today's Recommendation</h3>
              <p className="text-gray-700 text-sm leading-relaxed">{briefing.recommendation}</p>
            </div>
          </div>
        </div>

        {/* Motivation */}
        <div className="p-4 bg-gradient-to-r from-orange-50 to-yellow-50 rounded-lg border border-orange-200">
          <div className="flex items-start gap-3">
            <div className="flex-shrink-0 w-8 h-8 bg-orange-100 rounded-full flex items-center justify-center">
              <Zap className="h-4 w-4 text-orange-600" />
            </div>
            <div>
              <h3 className="font-medium text-gray-900 mb-1">Motivation</h3>
              <p className="text-gray-700 text-sm leading-relaxed font-medium">{briefing.motivation}</p>
            </div>
          </div>
        </div>

        {/* Timestamp */}
        <div className="text-xs text-gray-500 text-center pt-2 border-t border-gray-100">
          Updated {briefing.timestamp.toLocaleTimeString('en-US', { 
            hour: '2-digit', 
            minute: '2-digit' 
          })}
        </div>
      </CardContent>
    </Card>
  );
}