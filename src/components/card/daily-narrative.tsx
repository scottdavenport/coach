'use client';

import { useState, useEffect, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Calendar } from '@/components/ui/calendar';
import {
  Sun,
  Loader2,
  Brain,
  TrendingUp,
  Lightbulb,
} from 'lucide-react';
import {
  getTodayInTimezone,
  formatDateLong,
  getUserPreferredTimezone,
} from '@/lib/timezone-utils';
import { useUserTimezone } from '@/hooks/use-user-timezone';
import { useJournalEntries } from '@/hooks/use-journal-entries';
import { JournalMetrics } from './journal-metrics';
import { usePatternRecognition } from '@/hooks/use-pattern-recognition';

interface DailyJournalProps {
  userId: string;
  isOpen: boolean;
  onClose: () => void;
  selectedDate?: string;
}

interface NarrativeData {
  activities: string[];
  narrative_text: string;
  notes: string[];
  health_context?: string;
  follow_up?: string;
  journal_entries?: Array<{
    entry_type: string;
    category: string;
    content: string;
    confidence: number;
  }>;
}

export function DailyJournal({
  userId,
  isOpen,
  onClose,
  selectedDate,
}: DailyJournalProps) {
  const { userTimezone } = useUserTimezone();

  // Initialize with empty string, will be set by useEffect when timezone is loaded
  const [currentDate, setCurrentDate] = useState('');
  const [narrativeData, setNarrativeData] = useState<NarrativeData | null>(
    null
  );
  const [isLoading, setIsLoading] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [showPatterns, setShowPatterns] = useState(false);

  // Get journal entry dates for calendar indicators
  const { journalEntryDates } = useJournalEntries({ userId });

  // Pattern recognition hook
  const {
    patterns,
    isLoading: patternsLoading,
    error: patternsError,
    refreshPatterns,
    getTopTopics,
    getTopActivities,
    getTopMoods,
    getSleepInsights
  } = usePatternRecognition(userId);

  // Update currentDate when selectedDate prop changes or initialize with today
  useEffect(() => {
    if (selectedDate) {
      setCurrentDate(selectedDate);
    } else if (!currentDate) {
      // Only set to today if currentDate is empty (initial load)
      const preferredTimezone = getUserPreferredTimezone(userTimezone);
      const todayString = getTodayInTimezone(preferredTimezone);
      console.log(
        '🔍 Setting current date to today:',
        todayString,
        'in timezone:',
        preferredTimezone
      );
      setCurrentDate(todayString);
    }
  }, [selectedDate, userTimezone, currentDate]);

  // Format date for display
  const formatDate = (dateString: string) => {
    const preferredTimezone = getUserPreferredTimezone(userTimezone);
    return formatDateLong(
      new Date(dateString + 'T00:00:00'),
      preferredTimezone
    );
  };

  // Handle date selection from calendar
  const handleDateSelect = (dateString: string) => {
    setCurrentDate(dateString);
  };

  // Helper function to get natural activity descriptions
  const getActivityDescription = useCallback((activity: string): string => {
    const descriptions: { [key: string]: string } = {
      'Outdoor activity': 'Time spent in nature and fresh air',
      'Exercise session': 'Physical activity and movement',
      'Pool time': 'Relaxing by the water',
      'Relaxation time': 'Taking time to unwind and enjoy',
      'Coffee run': 'Morning coffee and energy boost',
      'Resort time': 'Enjoying the beautiful resort surroundings',
    };
    return descriptions[activity] || 'Activity from natural conversation';
  }, []);

  // Build narrative from conversation insights and journal entries
  const buildNarrativeFromConversationsAndJournal = useCallback(
    (insights: any[], journalEntries: any[]) => {
      const notes: string[] = [];

      insights.forEach(insight => {
        // Add insights as notes with cleaning
        if (insight.insights && Array.isArray(insight.insights)) {
          insight.insights.forEach((insightText: string) => {
            const cleanInsight = insightText
              .replace(/^User\s+/i, '')
              .replace(/^I\s+/i, '');
            notes.push(cleanInsight);
          });
        }
      });

      // Get narrative from journal entries
      const reflectionEntry = journalEntries.find(
        entry => entry.entry_type === 'reflection'
      );
      const healthEntry = journalEntries.find(
        entry => entry.category === 'health'
      );
      const followUpEntry = journalEntries.find(
        entry => entry.entry_type === 'goal'
      );

      // Use AI-generated narrative if available, otherwise build from insights
      let narrativeText = reflectionEntry?.content || '';

      if (!narrativeText && insights.length > 0) {
        // Build concise narrative from conversation insights
        const firstInsight = insights[0];
        if (firstInsight.message.toLowerCase().includes('open range grill')) {
          narrativeText = `Planning dinner at Open Range Grill in uptown Sedona tonight. Looking forward to exploring the local dining scene in this beautiful area.`;
        } else if (firstInsight.message.toLowerCase().includes('sedona')) {
          narrativeText = `Spending time in Sedona today. Exploring the beautiful area and enjoying the local atmosphere.`;
        } else {
          narrativeText = `Had conversations about ${firstInsight.message.substring(0, 50)}... It's been a day of connection and sharing.`;
        }
      } else if (!narrativeText) {
        narrativeText =
          "Today was a day of natural conversation and connection. Sometimes the best moments come from simply sharing what's on your mind.";
      }

      return {
        activities: [], // No longer used - activities merged into narrative
        narrative_text: narrativeText,
        notes: Array.from(new Set(notes)).slice(0, 5), // Max 5 insights
        health_context: healthEntry?.content || '',
        follow_up:
          followUpEntry?.content?.replace("Tomorrow's reflection: ", '') || '',
        journal_entries: journalEntries,
      };
    },
    []
  );

  // Build narrative from existing journal entries only
  const buildNarrativeFromJournalEntries = useCallback(
    (journalEntries: any[]) => {
      const reflectionEntry = journalEntries.find(
        entry => entry.entry_type === 'reflection'
      );
      const healthEntry = journalEntries.find(
        entry => entry.category === 'health'
      );
      const followUpEntry = journalEntries.find(
        entry => entry.entry_type === 'goal'
      );
      const noteEntries = journalEntries.filter(
        entry => entry.entry_type === 'note' && entry.category === 'lifestyle'
      );

      // Extract insights from note entries (max 5)
      const insights = noteEntries
        .map(entry => entry.content)
        .slice(0, 5);

      return {
        activities: [], // No longer used - activities merged into narrative
        narrative_text:
          reflectionEntry?.content || 'Journal entries available for this day.',
        notes: insights, // Use the insights from AI
        health_context: healthEntry?.content || '',
        follow_up:
          followUpEntry?.content?.replace("Tomorrow's reflection: ", '') || '',
        journal_entries: journalEntries,
      };
    },
    []
  );

  // Load narrative data for a specific date
  const loadNarrativeData = useCallback(
    async (dateString: string) => {
      setIsLoading(true);
      try {
        const supabase = createClient();
        const preferredTimezone = getUserPreferredTimezone(userTimezone);

        console.log(
          '🔍 Loading narrative data for date:',
          dateString,
          'in timezone:',
          preferredTimezone
        );

        // Load conversation insights
        const { data: conversationInsights, error: insightsError } =
          await supabase
            .from('conversation_insights')
            .select('*')
            .eq('user_id', userId)
            .eq('conversation_date', dateString)
            .order('created_at', { ascending: true });

        if (insightsError) {
          console.error('Error fetching conversation insights:', insightsError);
          throw insightsError;
        }

        // Load existing journal entries for the date
        const { data: journalEntries, error: journalError } = await supabase
          .from('daily_journal')
          .select('*')
          .eq('user_id', userId)
          .eq('journal_date', dateString)
          .order('created_at', { ascending: true });

        if (journalError) {
          console.error('Error fetching journal entries:', journalError);
        }

        console.log(
          '🔍 Found conversation insights:',
          conversationInsights?.length || 0
        );
        console.log('🔍 Found journal entries:', journalEntries?.length || 0);

        if (journalEntries && journalEntries.length > 0) {
          // Prioritize rich journal entries created by AI enhancement
          const narrativeData =
            buildNarrativeFromJournalEntries(journalEntries);
          setNarrativeData(narrativeData);
        } else if (conversationInsights && conversationInsights.length > 0) {
          // Fallback to conversation insights if no enhanced journal entries exist
          const narrativeData = buildNarrativeFromConversationsAndJournal(
            conversationInsights,
            []
          );
          setNarrativeData(narrativeData);
        } else {
          // No data found
          console.log(
            '🔍 No journal entries or conversation insights found for this date'
          );
          setNarrativeData(null);
        }
      } catch (error) {
        console.error('Error loading narrative data:', error);
        setNarrativeData(null);
      } finally {
        setIsLoading(false);
      }
    },
    [userId, userTimezone]
  );

  // Generate narrative using conversation insights (simplified approach)
  const generateNarrative = async (dateString: string) => {
    setIsGenerating(true);
    try {
      // Simply reload the narrative data from conversation insights
      await loadNarrativeData(dateString);
    } catch (error) {
      console.error('Error generating narrative:', error);
      // Fall back to basic narrative on error
      setNarrativeData(generateBasicNarrative());
    } finally {
      setIsGenerating(false);
    }
  };

  // Fallback basic narrative
  const generateBasicNarrative = (): NarrativeData => {
    return {
      activities: ['General activity'],
      narrative_text: 'Had a good day with various activities and experiences.',
      notes: ['Day included meaningful moments'],
      health_context: '',
      follow_up: 'How are you feeling about tomorrow?',
    };
  };

  // Load data when currentDate changes or modal opens
  useEffect(() => {
    if (currentDate && isOpen) {
      loadNarrativeData(currentDate);
    }
  }, [currentDate, isOpen, userId, userTimezone]); // Removed loadNarrativeData dependency to prevent infinite loops

  // Real-time updates: Listen for new conversation insights and update narrative
  useEffect(() => {
    if (!isOpen || !userId || !currentDate) return;

    const supabase = createClient();

    // Subscribe to new conversation insights for the currently selected date
    const startOfDay = new Date(currentDate);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(currentDate);
    endOfDay.setHours(23, 59, 59, 999);

    console.log('Setting up real-time subscription for date:', currentDate);

    const channelName = `narrative-updates-${currentDate}-${userId}`;

    const channel = supabase
      .channel(channelName)
      .on(
        'postgres_changes',
        {
          event: 'INSERT', // Only listen to new insights (not updates/deletes)
          schema: 'public',
          table: 'conversation_insights',
          filter: `user_id=eq.${userId}`,
        },
        async payload => {
          console.log(
            'Real-time insight detected:',
            (payload.new as any)?.message?.substring(0, 50)
          );

          // Check if this insight is for the currently selected date
          const insightDate = new Date((payload.new as any)?.conversation_date);

          if (insightDate >= startOfDay && insightDate <= endOfDay) {
            console.log(
              'Insight matches selected date - triggering narrative update'
            );
            // Debounce the update to prevent excessive calls
            setTimeout(async () => {
              await loadNarrativeData(currentDate);
            }, 2000); // 2 second delay to batch multiple insights
          }
        }
      )
      .subscribe(status => {
        if (status === 'SUBSCRIBED') {
          console.log(
            'Real-time subscription active for narrative updates on date:',
            currentDate
          );
        }
      });

    return () => {
      if (channel) {
        console.log(
          'Cleaning up real-time subscription for date:',
          currentDate
        );
        supabase.removeChannel(channel);
      }
    };
  }, [isOpen, userId, currentDate]); // Removed loadNarrativeData dependency to prevent infinite loops


  // Toggle pattern insights
  const togglePatterns = () => {
    setShowPatterns(!showPatterns);
    if (!showPatterns && !patterns) {
      refreshPatterns();
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sun className="h-5 w-5 text-yellow-500" />
            Daily Journal
          </DialogTitle>
        </DialogHeader>

        {/* Date Navigation - Single Calendar Picker */}
        {currentDate && (
          <div className="flex justify-center mb-6 p-4 bg-card-2 rounded-lg border border-line">
            <Calendar
              selectedDate={currentDate}
              onDateSelect={handleDateSelect}
              journalEntryDates={journalEntryDates}
            />
          </div>
        )}

        {/* AI Pattern Insights */}
        {showPatterns && (
          <div className="mb-6 p-4 bg-card-2 rounded-lg border border-line">
            <h3 className="text-lg font-semibold mb-4 flex items-center gap-2 text-text">
              <Brain className="h-5 w-5" />
              AI Discovered Patterns
            </h3>

            {patternsLoading ? (
              <div className="flex items-center justify-center py-4">
                <Loader2 className="h-6 w-6 animate-spin mr-2" />
                <span>Analyzing your conversation patterns...</span>
              </div>
            ) : patternsError ? (
              <div className="text-red-600 text-center py-4">
                Error loading patterns: {patternsError}
              </div>
            ) : patterns ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Top Topics */}
                {getTopTopics(3).length > 0 && (
                  <div className="bg-card p-3 rounded-lg border border-line">
                    <h4 className="font-medium text-primary mb-2 flex items-center gap-2">
                      <TrendingUp className="h-4 w-4" />
                      Topics You Love
                    </h4>
                    <div className="space-y-1">
                      {getTopTopics(3).map((topic, index) => (
                        <div key={index} className="text-sm">
                          <span className="font-medium text-text">{topic.topic}</span>
                          <span className="text-muted ml-2">
                            ({topic.frequency} mentions)
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Top Activities */}
                {getTopActivities(3).length > 0 && (
                  <div className="bg-card p-3 rounded-lg border border-line">
                    <h4 className="font-medium text-green-400 mb-2 flex items-center gap-2">
                      <TrendingUp className="h-4 w-4" />
                      Your Favorite Activities
                    </h4>
                    <div className="space-y-1">
                      {getTopActivities(3).map((activity, index) => (
                        <div key={index} className="text-sm">
                          <span className="font-medium text-text">
                            {activity.activity}
                          </span>
                          <span className="text-muted ml-2">
                            ({activity.frequency} times)
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Mood Patterns */}
                {getTopMoods(3).length > 0 && (
                  <div className="bg-card p-3 rounded-lg border border-line">
                    <h4 className="font-medium text-purple-400 mb-2 flex items-center gap-2">
                      <TrendingUp className="h-4 w-4" />
                      Mood Patterns
                    </h4>
                    <div className="space-y-1">
                      {getTopMoods(3).map((mood, index) => (
                        <div key={index} className="text-sm">
                          <span className="font-medium text-text">{mood.mood}</span>
                          <span className="text-muted ml-2">
                            ({mood.frequency} times)
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Sleep Insights */}
                {getSleepInsights().length > 0 && (
                  <div className="bg-card p-3 rounded-lg border border-line">
                    <h4 className="font-medium text-indigo-400 mb-2 flex items-center gap-2">
                      <TrendingUp className="h-4 w-4" />
                      Sleep Patterns
                    </h4>
                    <div className="space-y-1">
                      {getSleepInsights()
                        .slice(0, 2)
                        .map((sleep, index) => (
                          <div key={index} className="text-sm">
                            <span className="font-medium text-text">
                              Quality: {sleep.sleepQuality}/10
                            </span>
                            <span className="text-muted ml-2">
                              ({sleep.sleepDuration}h)
                            </span>
                          </div>
                        ))}
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="text-center py-4 text-muted">
                <Lightbulb className="h-8 w-8 mx-auto mb-2 text-muted" />
                <p>Start more conversations to discover your patterns!</p>
                <p className="text-sm">
                  AI will analyze your chat history to find insights.
                </p>
              </div>
            )}
          </div>
        )}

        {/* Loading State */}
        {isLoading && (
          <div className="flex items-center justify-center py-8">
            <div className="text-center">
              <Loader2 className="h-8 w-8 animate-spin mx-auto mb-2" />
              <p>Loading narrative...</p>
            </div>
          </div>
        )}

        {/* Generating State */}
        {isGenerating && (
          <div className="flex items-center justify-center py-8">
            <div className="text-center">
              <Loader2 className="h-8 w-8 animate-spin mx-auto mb-2" />
              <p>Generating narrative with AI...</p>
            </div>
          </div>
        )}

        {/* Narrative Content */}
        {!isLoading && !isGenerating && narrativeData && (
          <div className="space-y-6">
            {/* Daily Metrics Section */}
            <JournalMetrics userId={userId} date={currentDate} />

            {/* Natural Narrative Journal */}
            <div className="bg-card-2 p-4 rounded-lg border border-line">
              <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                📖 {formatDate(currentDate)} - Your Day
              </h3>

              {/* Natural narrative content */}
              <div className="space-y-6">
                {/* Main Narrative */}
                {narrativeData.narrative_text ? (
                  <div className="prose prose-sm max-w-none">
                    <p className="text-muted-foreground leading-relaxed">
                      {narrativeData.narrative_text.replace(/^\[.*?\]\s*/, '')}
                    </p>
                  </div>
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    <div className="text-4xl mb-2">📝</div>
                    <p>Start a conversation to build your daily journal!</p>
                    <p className="text-xs mt-2">
                      Tell me about your day, activities, thoughts, or anything
                      on your mind.
                    </p>
                  </div>
                )}


                {/* Health Context - From AI analysis */}
                {narrativeData.health_context && (
                  <div className="border-l-4 border-green-400 pl-4">
                    <h4 className="font-medium text-green-400 mb-3">
                      💚 Health Context
                    </h4>
                    <div className="text-sm">
                      <p>{narrativeData.health_context.replace(/^\[.*?\]\s*/, '')}</p>
                    </div>
                  </div>
                )}

                {/* Additional Notes */}
                {narrativeData.notes?.length > 0 && (
                  <div className="border-l-4 border-purple-400 pl-4">
                    <h4 className="font-medium text-purple-400 mb-3">
                      💭 Key Insights
                    </h4>
                    <div className="space-y-2 text-sm">
                      {narrativeData.notes.map(
                        (note: string, index: number) => (
                          <div key={index} className="flex items-center gap-2">
                            <span>💡</span>
                            <span>{note.replace(/^\[.*?\]\s*/, '')}</span>
                          </div>
                        )
                      )}
                    </div>
                  </div>
                )}

                {/* Tomorrow's Reflection */}
                {narrativeData.follow_up && (
                  <div className="border-l-4 border-yellow-400 pl-4">
                    <h4 className="font-medium text-yellow-400 mb-3">
                      🌅 Tomorrow's Reflection
                    </h4>
                    <div className="text-sm italic">
                      <p>{narrativeData.follow_up}</p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* No Data State */}
        {!isLoading && !isGenerating && !narrativeData && (
          <div className="text-center py-8 text-muted-foreground">
            <div className="text-4xl mb-2">📝</div>
            <p>No journal entry for this day yet.</p>
            <p className="text-xs mt-2">
              Start a conversation to create your daily journal!
            </p>
            <p className="text-xs mt-1">
              Share your activities, thoughts, or upload files to generate rich
              entries.
            </p>
          </div>
        )}

        {/* AI Insights Toggle */}
        <div className="flex justify-center mb-4">
          <Button
            onClick={togglePatterns}
            variant={showPatterns ? 'default' : 'outline'}
            size="sm"
            className="flex items-center gap-2"
          >
            {showPatterns ? (
              <>
                <Brain className="h-4 w-4" />
                Hide AI Insights
              </>
            ) : (
              <>
                <Lightbulb className="h-4 w-4" />
                Show AI Insights
              </>
            )}
          </Button>
        </div>

        {/* Action Buttons */}
        <div className="flex justify-end gap-2 pt-4 border-t border-line">
          <Button onClick={onClose}>Close</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
