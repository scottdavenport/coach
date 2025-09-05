'use client';

import { useRouter, usePathname } from 'next/navigation';
import {
  BarChart3,
  BookOpen,
  Dumbbell,
  MessageSquare,
  RotateCcw,
  Settings,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { DateSelector } from '@/components/ui/date-selector';
import { useAuth } from '@/components/providers/auth-provider';
import { useState } from 'react';

export function GlobalHeader() {
  const router = useRouter();
  const pathname = usePathname();
  const { user } = useAuth();
  const [isResetting, setIsResetting] = useState(false);

  // Get page title based on current path
  const getPageTitle = () => {
    const pathSegments = pathname.split('/').filter(Boolean);

    if (pathSegments.length === 0) return 'Home';

    const pageName = pathSegments[0];

    const pageMap: Record<string, string> = {
      dashboard: 'Health Dashboard',
      journal: 'Daily Journal',
      workout: 'Workout Companion',
      chat: 'Chat with Coach',
      settings: 'Settings',
      summary: 'Summary',
    };

    return (
      pageMap[pageName] || pageName.charAt(0).toUpperCase() + pageName.slice(1)
    );
  };

  // Get page description based on current path
  const getPageDescription = () => {
    const pathSegments = pathname.split('/').filter(Boolean);

    if (pathSegments.length === 0) return 'Your AI Health & Fitness Companion';

    const pageName = pathSegments[0];

    const descriptionMap: Record<string, string> = {
      dashboard: 'Comprehensive health analytics and insights',
      journal: 'Track your daily activities and reflections',
      workout: 'Plan and track your fitness journey',
      chat: 'Your AI Health & Fitness Companion',
      settings: 'Manage your account preferences and app settings',
      summary: 'Weekly and monthly health summaries',
    };

    return descriptionMap[pageName] || 'Your AI Health & Fitness Companion';
  };

  // Get page icon based on current path
  const getPageIcon = () => {
    const pathSegments = pathname.split('/').filter(Boolean);

    if (pathSegments.length === 0) return MessageSquare;

    const pageName = pathSegments[0];

    const iconMap: Record<string, any> = {
      dashboard: BarChart3,
      journal: BookOpen,
      workout: Dumbbell,
      chat: MessageSquare,
      settings: Settings,
      summary: BarChart3,
    };

    return iconMap[pageName] || MessageSquare;
  };

  const handleResetUserData = async () => {
    setIsResetting(true);
    try {
      const response = await fetch('/api/preferences/reset', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error('Failed to reset user data');
      }

      // Reload the page to refresh all data
      window.location.reload();
    } catch (error) {
      console.error('Error resetting user data:', error);
      alert('Failed to reset user data. Please try again.');
    } finally {
      setIsResetting(false);
    }
  };

  const PageIcon = getPageIcon();

  return (
    <div
      className="fixed top-0 left-0 right-0 z-50 border-b border-line"
      style={{ backgroundColor: 'hsl(var(--bg))' }}
    >
      <div className="flex items-center justify-between p-4">
        <div
          className="cursor-pointer hover:opacity-80 transition-opacity"
          onClick={() => router.push('/dashboard')}
          title="Go to Dashboard"
        >
          <div className="flex items-center gap-3">
            <PageIcon className="h-6 w-6 text-primary" />
            <div>
              <h1 className="text-xl font-semibold text-text">
                {getPageTitle()}
              </h1>
              <p className="text-sm text-muted">{getPageDescription()}</p>
            </div>
          </div>
        </div>

        {/* Date Selector - only show on dashboard */}
        {pathname === '/dashboard' && user && <DateSelector userId={user.id} />}

        <div className="flex items-center gap-2">
          {/* TEMPORARY RESET BUTTON */}
          <Button
            variant="outline"
            size="sm"
            onClick={handleResetUserData}
            disabled={isResetting}
            className="h-8 px-3 text-xs border-orange-500 text-orange-500 hover:bg-orange-500 hover:text-white"
            title="Reset User Data (Temporary)"
          >
            <RotateCcw className="h-3 w-3 mr-1" />
            {isResetting ? 'Resetting...' : 'Reset Data'}
          </Button>

          <Button
            variant="ghost"
            size="icon"
            onClick={() => router.push('/dashboard')}
            className={`h-8 w-8 ${pathname === '/dashboard' ? 'bg-primary/10 text-primary' : ''}`}
            title="Health Dashboard"
          >
            <BarChart3 className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => router.push('/journal')}
            className={`h-8 w-8 ${pathname === '/journal' ? 'bg-primary/10 text-primary' : ''}`}
            title="Daily Journal"
          >
            <BookOpen className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => router.push('/workout')}
            className={`h-8 w-8 ${pathname === '/workout' ? 'bg-primary/10 text-primary' : ''}`}
            title="Workout Companion"
          >
            <Dumbbell className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => router.push('/settings')}
            className={`h-8 w-8 ${pathname === '/settings' ? 'bg-primary/10 text-primary' : ''}`}
            title="Settings"
          >
            <Settings className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
