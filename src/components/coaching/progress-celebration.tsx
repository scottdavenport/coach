'use client';

import React from 'react';
import { ProgressCelebration as ProgressCelebrationType } from '@/lib/coaching/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Trophy, TrendingUp, Star, Target } from 'lucide-react';

interface ProgressCelebrationProps {
  celebrations: ProgressCelebrationType[];
  className?: string;
}

export function ProgressCelebration({ celebrations, className = '' }: ProgressCelebrationProps) {
  if (!celebrations || celebrations.length === 0) {
    return null;
  }

  const getIcon = (type: string) => {
    switch (type) {
      case 'streak':
        return <Trophy className="h-5 w-5" />;
      case 'achievement':
        return <Star className="h-5 w-5" />;
      case 'personal_best':
        return <Target className="h-5 w-5" />;
      case 'improvement':
        return <TrendingUp className="h-5 w-5" />;
      default:
        return <Trophy className="h-5 w-5" />;
    }
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'streak':
        return 'bg-orange-100 text-orange-800 border-orange-200';
      case 'achievement':
        return 'bg-purple-100 text-purple-800 border-purple-200';
      case 'personal_best':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'improvement':
        return 'bg-green-100 text-green-800 border-green-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getTypeLabel = (type: string) => {
    switch (type) {
      case 'streak':
        return 'Streak';
      case 'achievement':
        return 'Achievement';
      case 'personal_best':
        return 'Personal Best';
      case 'improvement':
        return 'Improvement';
      default:
        return 'Celebration';
    }
  };

  return (
    <Card className={`bg-gradient-to-br from-yellow-50 to-orange-50 border-yellow-200 ${className}`}>
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg font-semibold text-orange-900 flex items-center gap-2">
            <Trophy className="h-5 w-5" />
            Celebrations
          </CardTitle>
          <Badge variant="secondary" className="bg-orange-100 text-orange-700">
            {celebrations.length} Win{celebrations.length !== 1 ? 's' : ''}
          </Badge>
        </div>
      </CardHeader>
      
      <CardContent className="space-y-3">
        {celebrations.map((celebration, index) => (
          <div
            key={index}
            className="p-4 bg-white rounded-lg border border-orange-100 hover:shadow-sm transition-shadow"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className={`flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center ${getTypeColor(celebration.type)}`}>
                  {getIcon(celebration.type)}
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="font-medium text-gray-900">{celebration.title}</h3>
                    <Badge variant="outline" className={`text-xs ${getTypeColor(celebration.type)}`}>
                      {getTypeLabel(celebration.type)}
                    </Badge>
                  </div>
                  <p className="text-gray-600 text-sm">{celebration.description}</p>
                </div>
              </div>
              
              <div className="flex items-center gap-2">
                <div className="text-right">
                  <div className={`text-2xl font-bold ${celebration.color}`}>
                    {celebration.value}
                    {celebration.type === 'improvement' && '%'}
                    {celebration.type === 'streak' && ' days'}
                  </div>
                </div>
                <div className="text-2xl">
                  {celebration.icon}
                </div>
              </div>
            </div>
          </div>
        ))}
        
        {/* Encouragement message */}
        <div className="mt-4 p-3 bg-gradient-to-r from-yellow-100 to-orange-100 rounded-lg border border-yellow-200">
          <p className="text-sm text-orange-800 text-center font-medium">
            🎉 Keep up the amazing work! You're building great habits!
          </p>
        </div>
      </CardContent>
    </Card>
  );
}