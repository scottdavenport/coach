'use client';

import React, { useState, useEffect } from 'react';
import { DashboardHeader } from '@/components/dashboard/dashboard-header';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import { Calendar } from '@/components/ui/calendar';
import {
  BookOpen,
  Calendar as CalendarIcon,
  Search,
  Plus,
  Edit3,
  Trash2,
  Heart,
  Smile,
  Frown,
  Meh,
  TrendingUp,
  Lightbulb,
  Target,
  MessageSquare,
  Filter,
  Download,
} from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { useJournalEntries } from '@/hooks/use-journal-entries';
import { useUserTimezone } from '@/hooks/use-user-timezone';
import { getTodayInTimezone, getUserPreferredTimezone } from '@/lib/timezone-utils';

interface JournalClientProps {
  userId: string;
}

interface JournalEntry {
  id: string;
  entry_type: string;
  content: string;
  category: string;
  created_at: string;
  journal_date: string;
}

interface MoodEntry {
  id: string;
  mood: string;
  energy_level: number;
  notes?: string;
  created_at: string;
  journal_date: string;
}

export default function JournalClient({ userId }: JournalClientProps) {
  const { userTimezone } = useUserTimezone();
  const [activeTab, setActiveTab] = useState('timeline');
  const [selectedDate, setSelectedDate] = useState('');
  const [journalEntries, setJournalEntries] = useState<JournalEntry[]>([]);
  const [moodEntries, setMoodEntries] = useState<MoodEntry[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isWriting, setIsWriting] = useState(false);
  const [newEntry, setNewEntry] = useState('');
  const [selectedMood, setSelectedMood] = useState('');
  const [energyLevel, setEnergyLevel] = useState(5);
  const [moodNotes, setMoodNotes] = useState('');

  // Get journal entry dates for calendar indicators
  const { journalEntryDates } = useJournalEntries({ userId });

  // Initialize selectedDate with today's date in user's timezone
  useEffect(() => {
    if (!selectedDate) {
      const preferredTimezone = getUserPreferredTimezone(userTimezone);
      const todayString = getTodayInTimezone(preferredTimezone);
      setSelectedDate(todayString);
    }
  }, [selectedDate, userTimezone]);

  const moods = [
    {
      id: 'excellent',
      label: 'Excellent',
      icon: Smile,
      color: 'text-green-500',
    },
    { id: 'good', label: 'Good', icon: Heart, color: 'text-blue-500' },
    { id: 'okay', label: 'Okay', icon: Meh, color: 'text-yellow-500' },
    { id: 'poor', label: 'Poor', icon: Frown, color: 'text-red-500' },
  ];

  const entryTypes = [
    {
      id: 'reflection',
      label: 'Reflection',
      icon: BookOpen,
      color: 'text-purple-500',
    },
    { id: 'goal', label: 'Goal', icon: Target, color: 'text-green-500' },
    { id: 'tip', label: 'Tip', icon: Lightbulb, color: 'text-yellow-500' },
    { id: 'note', label: 'Note', icon: MessageSquare, color: 'text-blue-500' },
  ];

  // Fetch journal entries for selected date
  useEffect(() => {
    const fetchJournalEntries = async () => {
      try {
        const supabase = createClient();
        const { data, error } = await supabase
          .from('daily_journal')
          .select('*')
          .eq('user_id', userId)
          .eq('journal_date', selectedDate)
          .order('created_at', { ascending: false });

        if (error) {
          console.error('Error fetching journal entries:', error);
          return;
        }

        setJournalEntries(data || []);
      } catch (error) {
        console.error('Error fetching journal entries:', error);
      }
    };

    fetchJournalEntries();
  }, [userId, selectedDate]);

  // Fetch mood entries for selected date
  useEffect(() => {
    const fetchMoodEntries = async () => {
      try {
        const supabase = createClient();
        const { data, error } = await supabase
          .from('mood_tracking')
          .select('*')
          .eq('user_id', userId)
          .eq('journal_date', selectedDate)
          .order('created_at', { ascending: false });

        if (error) {
          console.error('Error fetching mood entries:', error);
          return;
        }

        setMoodEntries(data || []);
      } catch (error) {
        console.error('Error fetching mood entries:', error);
      }
    };

    fetchMoodEntries();
  }, [userId, selectedDate]);

  const handleAddJournalEntry = async (entryType: string) => {
    if (!newEntry.trim()) return;

    try {
      const supabase = createClient();
      const { error } = await supabase.from('daily_journal').insert({
        user_id: userId,
        journal_date: selectedDate,
        entry_type: entryType,
        category: 'lifestyle',
        content: newEntry.trim(),
      });

      if (error) {
        console.error('Error adding journal entry:', error);
        return;
      }

      setNewEntry('');
      setIsWriting(false);
      // Refresh entries
      window.location.reload();
    } catch (error) {
      console.error('Error adding journal entry:', error);
    }
  };

  const handleAddMoodEntry = async () => {
    if (!selectedMood) return;

    try {
      const supabase = createClient();
      const { error } = await supabase.from('mood_tracking').insert({
        user_id: userId,
        journal_date: selectedDate,
        mood: selectedMood,
        energy_level: energyLevel,
        notes: moodNotes.trim() || null,
      });

      if (error) {
        console.error('Error adding mood entry:', error);
        return;
      }

      setSelectedMood('');
      setEnergyLevel(5);
      setMoodNotes('');
      // Refresh entries
      window.location.reload();
    } catch (error) {
      console.error('Error adding mood entry:', error);
    }
  };

  const filteredEntries = journalEntries.filter(
    entry =>
      entry.content.toLowerCase().includes(searchQuery.toLowerCase()) ||
      entry.entry_type.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const getDateRange = () => {
    const dates = [];
    for (let i = 6; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      dates.push(date.toISOString().split('T')[0]);
    }
    return dates;
  };

  return (
    <div className="h-screen flex flex-col">
      {/* Fixed Header */}
      <div
        className="fixed top-0 left-0 right-0 z-50 border-b border-line"
        style={{ backgroundColor: 'hsl(var(--bg))' }}
      >
        <DashboardHeader userId={userId} />
      </div>

      {/* Main Content */}
      <div className="flex-1 pt-24">
        <div className="max-w-7xl mx-auto p-6">
          {/* Page Header */}
          <div className="mb-8">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <BookOpen className="h-8 w-8 text-primary" />
                <div>
                  <h1 className="text-3xl font-bold">Daily Journal</h1>
                  <p className="text-muted-foreground">
                    Reflect, track, and grow with your personal journal
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm">
                  <Search className="h-4 w-4 mr-2" />
                  Search
                </Button>
                <Button variant="outline" size="sm">
                  <Filter className="h-4 w-4 mr-2" />
                  Filter
                </Button>
                <Button variant="outline" size="sm">
                  <Download className="h-4 w-4 mr-2" />
                  Export
                </Button>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
            {/* Left Sidebar - Date Navigation & Quick Actions */}
            <div className="lg:col-span-1">
              <div className="space-y-6">
                {/* Date Selector */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg flex items-center gap-2">
                      <CalendarIcon className="h-5 w-5" />
                      Select Date
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="flex justify-center">
                      {selectedDate && (
                        <Calendar
                          selectedDate={selectedDate}
                          onDateSelect={setSelectedDate}
                          journalEntryDates={journalEntryDates}
                        />
                      )}
                    </div>
                  </CardContent>
                </Card>

                {/* Quick Actions */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Quick Actions</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    <Button
                      onClick={() => setIsWriting(true)}
                      className="w-full justify-start"
                      variant="outline"
                    >
                      <Plus className="h-4 w-4 mr-2" />
                      New Entry
                    </Button>
                    <Button
                      onClick={() => setActiveTab('mood')}
                      className="w-full justify-start"
                      variant="outline"
                    >
                      <Heart className="h-4 w-4 mr-2" />
                      Track Mood
                    </Button>
                    <Button
                      onClick={() => setActiveTab('insights')}
                      className="w-full justify-start"
                      variant="outline"
                    >
                      <TrendingUp className="h-4 w-4 mr-2" />
                      AI Insights
                    </Button>
                  </CardContent>
                </Card>

                {/* Entry Types */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Entry Types</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    {entryTypes.map(type => {
                      const Icon = type.icon;
                      return (
                        <button
                          key={type.id}
                          onClick={() => {
                            setIsWriting(true);
                            setActiveTab('timeline');
                          }}
                          className="w-full flex items-center gap-3 p-2 rounded-lg text-left hover:bg-card-2 transition-colors"
                        >
                          <Icon className={`h-4 w-4 ${type.color}`} />
                          <span className="text-sm font-medium">
                            {type.label}
                          </span>
                        </button>
                      );
                    })}
                  </CardContent>
                </Card>
              </div>
            </div>

            {/* Main Content Area */}
            <div className="lg:col-span-3">
              <Tabs
                value={activeTab}
                onValueChange={setActiveTab}
                className="w-full"
              >
                <TabsList className="grid w-full grid-cols-4">
                  <TabsTrigger value="timeline">Timeline</TabsTrigger>
                  <TabsTrigger value="mood">Mood</TabsTrigger>
                  <TabsTrigger value="insights">Insights</TabsTrigger>
                  <TabsTrigger value="search">Search</TabsTrigger>
                </TabsList>
                <TabsContent value="timeline" className="mt-6">
                  <div className="space-y-6">
                    {/* Writing Interface */}
                    {isWriting && (
                      <Card>
                        <CardHeader>
                          <CardTitle>New Journal Entry</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                          <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                            {entryTypes.map(type => {
                              const Icon = type.icon;
                              return (
                                <button
                                  key={type.id}
                                  onClick={() => handleAddJournalEntry(type.id)}
                                  className="flex flex-col items-center gap-2 p-3 border border-line rounded-lg hover:bg-card-2 transition-colors"
                                >
                                  <Icon className={`h-5 w-5 ${type.color}`} />
                                  <span className="text-xs font-medium">
                                    {type.label}
                                  </span>
                                </button>
                              );
                            })}
                          </div>
                          <Textarea
                            value={newEntry}
                            onChange={e => setNewEntry(e.target.value)}
                            placeholder="Write your thoughts, goals, or reflections here..."
                            className="min-h-[200px] resize-none"
                          />
                          <div className="flex gap-2">
                            <Button
                              onClick={() => setIsWriting(false)}
                              variant="outline"
                            >
                              Cancel
                            </Button>
                            <Button
                              onClick={() => handleAddJournalEntry('note')}
                              disabled={!newEntry.trim()}
                            >
                              Save Entry
                            </Button>
                          </div>
                        </CardContent>
                      </Card>
                    )}

                    {/* Timeline View */}
                    <Card>
                      <CardHeader>
                        <CardTitle>
                          Journal Timeline -{' '}
                          {new Date(selectedDate).toLocaleDateString()}
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        {journalEntries.length === 0 ? (
                          <div className="text-center py-12">
                            <BookOpen className="h-16 w-16 text-muted-foreground mx-auto mb-4 opacity-50" />
                            <h3 className="text-lg font-medium mb-2">
                              No entries yet
                            </h3>
                            <p className="text-muted-foreground mb-4">
                              Start your journaling journey by adding your first
                              entry.
                            </p>
                            <Button onClick={() => setIsWriting(true)}>
                              <Plus className="h-4 w-4 mr-2" />
                              Add First Entry
                            </Button>
                          </div>
                        ) : (
                          <div className="space-y-4">
                            {filteredEntries.map(entry => {
                              const entryType = entryTypes.find(
                                t => t.id === entry.entry_type
                              );
                              const Icon = entryType?.icon || MessageSquare;
                              const color = entryType?.color || 'text-primary';

                              return (
                                <div
                                  key={entry.id}
                                  className="border-l-4 border-primary/20 pl-4 py-4"
                                >
                                  <div className="flex items-start justify-between mb-2">
                                    <div className="flex items-center gap-2">
                                      <Icon className={`h-4 w-4 ${color}`} />
                                      <span className="text-sm font-medium text-muted-foreground">
                                        {entryType?.label || 'Note'}
                                      </span>
                                      <span className="text-xs text-muted-foreground">
                                        {new Date(
                                          entry.created_at
                                        ).toLocaleTimeString()}
                                      </span>
                                    </div>
                                    <div className="flex items-center gap-1">
                                      <Button size="sm" variant="ghost">
                                        <Edit3 className="h-3 w-3" />
                                      </Button>
                                      <Button size="sm" variant="ghost">
                                        <Trash2 className="h-3 w-3" />
                                      </Button>
                                    </div>
                                  </div>
                                  <p className="text-sm leading-relaxed whitespace-pre-wrap">
                                    {entry.content}
                                  </p>
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  </div>
                </TabsContent>

                <TabsContent value="mood" className="mt-6">
                  <div className="space-y-6">
                    <Card>
                      <CardHeader>
                        <CardTitle>Mood & Energy Tracking</CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-6">
                        {/* Mood Selection */}
                        <div>
                          <label className="text-sm font-medium text-muted-foreground mb-3 block">
                            How are you feeling today?
                          </label>
                          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                            {moods.map(mood => {
                              const Icon = mood.icon;
                              return (
                                <button
                                  key={mood.id}
                                  onClick={() => setSelectedMood(mood.id)}
                                  className={`flex flex-col items-center gap-2 p-4 border rounded-lg transition-colors ${
                                    selectedMood === mood.id
                                      ? 'border-primary bg-primary/10'
                                      : 'border-line hover:bg-card-2'
                                  }`}
                                >
                                  <Icon className={`h-6 w-6 ${mood.color}`} />
                                  <span className="text-sm font-medium">
                                    {mood.label}
                                  </span>
                                </button>
                              );
                            })}
                          </div>
                        </div>

                        {/* Energy Level */}
                        <div>
                          <label className="text-sm font-medium text-muted-foreground mb-3 block">
                            Energy Level: {energyLevel}/10
                          </label>
                          <input
                            type="range"
                            min="1"
                            max="10"
                            value={energyLevel}
                            onChange={e =>
                              setEnergyLevel(Number(e.target.value))
                            }
                            className="w-full"
                          />
                          <div className="flex justify-between text-xs text-muted-foreground mt-1">
                            <span>Low</span>
                            <span>High</span>
                          </div>
                        </div>

                        {/* Mood Notes */}
                        <div>
                          <label className="text-sm font-medium text-muted-foreground mb-2 block">
                            Additional Notes (Optional)
                          </label>
                          <Textarea
                            value={moodNotes}
                            onChange={e => setMoodNotes(e.target.value)}
                            placeholder="What's contributing to your mood today?"
                            className="min-h-[100px] resize-none"
                          />
                        </div>

                        <Button
                          onClick={handleAddMoodEntry}
                          disabled={!selectedMood}
                          className="w-full"
                        >
                          Save Mood Entry
                        </Button>
                      </CardContent>
                    </Card>

                    {/* Mood History */}
                    {moodEntries.length > 0 && (
                      <Card>
                        <CardHeader>
                          <CardTitle>Mood History</CardTitle>
                        </CardHeader>
                        <CardContent>
                          <div className="space-y-3">
                            {moodEntries.map(entry => {
                              const mood = moods.find(m => m.id === entry.mood);
                              const Icon = mood?.icon || Heart;
                              const color = mood?.color || 'text-primary';

                              return (
                                <div
                                  key={entry.id}
                                  className="flex items-center gap-3 p-3 border border-line rounded-lg"
                                >
                                  <Icon className={`h-5 w-5 ${color}`} />
                                  <div className="flex-1">
                                    <div className="flex items-center gap-2">
                                      <span className="font-medium">
                                        {mood?.label}
                                      </span>
                                      <span className="text-sm text-muted-foreground">
                                        Energy: {entry.energy_level}/10
                                      </span>
                                    </div>
                                    {entry.notes && (
                                      <p className="text-sm text-muted-foreground mt-1">
                                        {entry.notes}
                                      </p>
                                    )}
                                  </div>
                                  <span className="text-xs text-muted-foreground">
                                    {new Date(
                                      entry.created_at
                                    ).toLocaleTimeString()}
                                  </span>
                                </div>
                              );
                            })}
                          </div>
                        </CardContent>
                      </Card>
                    )}
                  </div>
                </TabsContent>

                <TabsContent value="insights" className="mt-6">
                  <div className="space-y-6">
                    <Card>
                      <CardHeader>
                        <CardTitle>AI Insights from Your Journal</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-4">
                          <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                            <h4 className="font-semibold text-blue-900 mb-2">
                              Writing Patterns
                            </h4>
                            <p className="text-blue-800 text-sm">
                              You tend to write more reflective entries in the
                              evening. Consider setting aside dedicated time for
                              morning journaling to start your day with
                              intention.
                            </p>
                          </div>
                          <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
                            <h4 className="font-semibold text-green-900 mb-2">
                              Goal Progress
                            </h4>
                            <p className="text-green-800 text-sm">
                              You've mentioned your fitness goals 3 times this
                              week. Your consistency in tracking shows strong
                              commitment to your health journey.
                            </p>
                          </div>
                          <div className="p-4 bg-purple-50 border border-purple-200 rounded-lg">
                            <h4 className="font-semibold text-purple-900 mb-2">
                              Emotional Trends
                            </h4>
                            <p className="text-purple-800 text-sm">
                              Your mood entries show a positive trend this week.
                              The activities you've been doing seem to be
                              contributing to your well-being.
                            </p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                </TabsContent>

                <TabsContent value="search" className="mt-6">
                  <div className="space-y-6">
                    <Card>
                      <CardHeader>
                        <CardTitle>Search Your Journal</CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        <div className="relative">
                          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                          <input
                            type="text"
                            value={searchQuery}
                            onChange={e => setSearchQuery(e.target.value)}
                            placeholder="Search through your journal entries..."
                            className="w-full pl-10 pr-4 py-2 border border-line rounded-md bg-background"
                          />
                        </div>

                        {searchQuery && (
                          <div className="space-y-3">
                            <p className="text-sm text-muted-foreground">
                              Found {filteredEntries.length} entries matching "
                              {searchQuery}"
                            </p>
                            {filteredEntries.map(entry => {
                              const entryType = entryTypes.find(
                                t => t.id === entry.entry_type
                              );
                              const Icon = entryType?.icon || MessageSquare;
                              const color = entryType?.color || 'text-primary';

                              return (
                                <div
                                  key={entry.id}
                                  className="p-4 border border-line rounded-lg"
                                >
                                  <div className="flex items-center gap-2 mb-2">
                                    <Icon className={`h-4 w-4 ${color}`} />
                                    <span className="text-sm font-medium text-muted-foreground">
                                      {entryType?.label || 'Note'}
                                    </span>
                                    <span className="text-xs text-muted-foreground">
                                      {new Date(
                                        entry.journal_date
                                      ).toLocaleDateString()}
                                    </span>
                                  </div>
                                  <p className="text-sm leading-relaxed">
                                    {entry.content}
                                  </p>
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  </div>
                </TabsContent>
              </Tabs>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
