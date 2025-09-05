'use client';

import React, { useState } from 'react';
import { SmartNotification as SmartNotificationType } from '@/lib/coaching/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Bell,
  AlertTriangle,
  Clock,
  Target,
  Lightbulb,
  X,
  Check,
} from 'lucide-react';

interface SmartNotificationsProps {
  notifications: SmartNotificationType[];
  onMarkAsRead?: (notificationId: string) => void;
  onMarkAllAsRead?: () => void;
  className?: string;
}

export function SmartNotifications({
  notifications,
  onMarkAsRead,
  onMarkAllAsRead,
  className = '',
}: SmartNotificationsProps) {
  const [expandedNotifications, setExpandedNotifications] = useState<
    Set<string>
  >(new Set());

  if (!notifications || notifications.length === 0) {
    return null;
  }

  const unreadNotifications = notifications.filter(n => !n.read);
  const highPriorityNotifications = notifications.filter(
    n => n.priority === 'high' && !n.read
  );

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'context_aware':
        return <AlertTriangle className="h-4 w-4" />;
      case 'timing_based':
        return <Clock className="h-4 w-4" />;
      case 'pattern_based':
        return <Lightbulb className="h-4 w-4" />;
      case 'goal_based':
        return <Target className="h-4 w-4" />;
      default:
        return <Bell className="h-4 w-4" />;
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high':
        return 'bg-red-500/10 text-red-500 border-red-500/20';
      case 'medium':
        return 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20';
      case 'low':
        return 'bg-blue-500/10 text-blue-500 border-blue-500/20';
      default:
        return 'bg-card-2 text-text border-border';
    }
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'context_aware':
        return 'bg-red-500/10 border-red-500/20';
      case 'timing_based':
        return 'bg-blue-500/10 border-blue-500/20';
      case 'pattern_based':
        return 'bg-purple-500/10 border-purple-500/20';
      case 'goal_based':
        return 'bg-green-500/10 border-green-500/20';
      default:
        return 'bg-card-2 border-border';
    }
  };

  const toggleExpanded = (notificationId: string) => {
    const newExpanded = new Set(expandedNotifications);
    if (newExpanded.has(notificationId)) {
      newExpanded.delete(notificationId);
    } else {
      newExpanded.add(notificationId);
    }
    setExpandedNotifications(newExpanded);
  };

  const handleMarkAsRead = (notificationId: string) => {
    onMarkAsRead?.(notificationId);
  };

  const handleMarkAllAsRead = () => {
    onMarkAllAsRead?.();
  };

  return (
    <Card className={`bg-card border-border ${className}`}>
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg font-semibold text-text flex items-center gap-2">
            <Bell className="h-5 w-5" />
            Smart Notifications
          </CardTitle>
          <div className="flex items-center gap-2">
            {unreadNotifications.length > 0 && (
              <Badge
                variant="destructive"
                className="bg-red-500/10 text-red-500"
              >
                {unreadNotifications.length} New
              </Badge>
            )}
            {highPriorityNotifications.length > 0 && (
              <Badge
                variant="secondary"
                className="bg-yellow-500/10 text-yellow-500"
              >
                {highPriorityNotifications.length} High Priority
              </Badge>
            )}
          </div>
        </div>

        {unreadNotifications.length > 0 && (
          <div className="flex justify-end">
            <Button
              variant="outline"
              size="sm"
              onClick={handleMarkAllAsRead}
              className="text-xs"
            >
              <Check className="h-3 w-3 mr-1" />
              Mark All Read
            </Button>
          </div>
        )}
      </CardHeader>

      <CardContent className="space-y-3">
        {notifications.map(notification => (
          <div
            key={notification.id}
            className={`p-4 rounded-lg border transition-all ${
              notification.read
                ? 'bg-card-2 border-border opacity-75'
                : getTypeColor(notification.type)
            }`}
          >
            <div className="flex items-start justify-between">
              <div className="flex items-start gap-3 flex-1">
                <div
                  className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${
                    notification.read
                      ? 'bg-card-2'
                      : getPriorityColor(notification.priority)
                  }`}
                >
                  {getNotificationIcon(notification.type)}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <h3
                      className={`font-medium ${notification.read ? 'text-muted' : 'text-text'}`}
                    >
                      {notification.title}
                    </h3>
                    <Badge
                      variant="outline"
                      className={`text-xs ${getPriorityColor(notification.priority)}`}
                    >
                      {notification.priority}
                    </Badge>
                    {!notification.read && (
                      <div className="w-2 h-2 bg-primary rounded-full"></div>
                    )}
                  </div>

                  <p
                    className={`text-sm ${notification.read ? 'text-muted' : 'text-muted'} mb-2`}
                  >
                    {notification.message}
                  </p>

                  {notification.action && (
                    <div className="flex items-center gap-2">
                      <Button variant="outline" size="sm" className="text-xs">
                        {notification.action}
                      </Button>
                    </div>
                  )}

                  <div className="text-xs text-gray-500 mt-2">
                    {notification.timestamp.toLocaleTimeString('en-US', {
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </div>
                </div>
              </div>

              {!notification.read && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleMarkAsRead(notification.id)}
                  className="flex-shrink-0 text-gray-400 hover:text-gray-600"
                >
                  <X className="h-4 w-4" />
                </Button>
              )}
            </div>
          </div>
        ))}

        {notifications.length === 0 && (
          <div className="text-center py-8">
            <Bell className="h-12 w-12 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-500 text-sm">
              No notifications at the moment
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
