'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Calendar, Check, Copy } from 'lucide-react'
import { WorkoutCard } from './workout-card'
import { parseWorkoutFromMarkdown, createGolfWarmupWorkout } from '@/lib/workout-parser'
import { SimpleTile } from './simple-tile'
import GridLayout from 'react-grid-layout'
import 'react-grid-layout/css/styles.css'
import 'react-resizable/css/styles.css'

interface DailyCardPaneProps {
  userId: string
  onAskQuestion?: (question: string) => void
  refreshTrigger?: number
}

interface DailySummary {
  sleep_hours?: number
  sleep_quality?: number
  mood?: number
  energy?: number
  stress?: number
  readiness?: number
  context_data?: {
    [category: string]: {
      [key: string]: {
        value: any
        confidence: number
        source: string
        timestamp: string
      }
    }
  }
  last_updated?: string
}

interface PendingData {
  category: string
  key: string
  value: any
  confidence: number
  source: string
  needsClarification?: boolean
  clarificationQuestion?: string
  expectedFormat?: string
}

export function DailyCardPane({ userId, onAskQuestion, refreshTrigger }: DailyCardPaneProps) {
  const [dailyCard, setDailyCard] = useState<DailySummary | null>(null)
  const [pendingData, setPendingData] = useState<PendingData[]>([])
  const [loading, setLoading] = useState(true)
  const [showSavePrompt, setShowSavePrompt] = useState(false)
  const [copied, setCopied] = useState(false)
  const [selectedDate, setSelectedDate] = useState('')
  const [availableDates, setAvailableDates] = useState<string[]>([])
  const [currentWorkout, setCurrentWorkout] = useState<any>(null)

  const fetchAvailableDates = async () => {
    try {
      const supabase = createClient()
      const { data, error } = await supabase
        .from('daily_log_cards')
        .select('log_date')
        .eq('user_id', userId)
        .order('log_date', { ascending: false })
        .limit(30)

      if (error) {
        console.error('Error fetching available dates:', error)
        return
      }

      const dates = data.map(row => row.log_date)
      setAvailableDates(dates)
      
      // Set the selected date to the most recent available date
      if (dates.length > 0 && !selectedDate) {
        setSelectedDate(dates[0])
      }
    } catch (error) {
      console.error('Error fetching available dates:', error)
    }
  }

  const fetchDailyCard = async () => {
    try {
      const supabase = createClient()
      
      const { data, error } = await supabase
        .from('daily_log_cards')
        .select('*')
        .eq('user_id', userId)
        .eq('log_date', selectedDate)
        .single()

      if (error && error.code !== 'PGRST116') {
        console.error('Error fetching daily card:', error)
      }

      if (data?.summary) {
        setDailyCard(data.summary)
      } else {
        setDailyCard(null)
      }

      // Parse workout if present
      if (data?.summary?.context_data?.workout?.pre_golf_warmup?.value) {
        try {
          const workoutValue = data.summary.context_data.workout.pre_golf_warmup.value
          let workout = parseWorkoutFromMarkdown(workoutValue)
          
          // If parsing fails or returns null, create a workout from the simple description
          if (!workout) {
            workout = {
              title: "Pre-Golf Warm-Up",
              totalTime: "8 minutes",
              steps: [
                {
                  title: "Dynamic Arm Circles",
                  duration: "1 minute",
                  description: "Stand tall and extend your arms out to the sides. Make small circles forward for 30 seconds, then reverse for another 30 seconds."
                },
                {
                  title: "Torso Twists",
                  duration: "1 minute", 
                  description: "Stand with your feet shoulder-width apart. Rotate your torso to the right and then to the left, allowing your arms to follow the motion."
                },
                {
                  title: "Leg Swings",
                  duration: "1 minute",
                  description: "Stand next to a wall for support. Swing one leg forward and backward for 30 seconds, then switch to the other leg."
                },
                {
                  title: "Hip Openers",
                  duration: "1 minute",
                  description: "Stand with feet shoulder-width apart. Rotate your hips in a circular motion, first clockwise then counterclockwise."
                },
                {
                  title: "Shoulder Rolls",
                  duration: "1 minute",
                  description: "Roll your shoulders forward in a circular motion for 30 seconds, then reverse the direction."
                },
                {
                  title: "Light Walking",
                  duration: "3 minutes",
                  description: "Take a light walk around the course or practice area to get your blood flowing and muscles warmed up."
                }
              ]
            }
          }
          
          setCurrentWorkout(workout)
          console.log('Parsed workout:', workout)
        } catch (error) {
          console.error('Error parsing workout:', error)
          const fallbackWorkout = createGolfWarmupWorkout()
          setCurrentWorkout(fallbackWorkout)
        }
      } else {
        console.log('No workout data found in:', data?.summary?.context_data?.workout)
        setCurrentWorkout(null)
      }

      setLoading(false)
    } catch (error) {
      console.error('Error fetching daily card:', error)
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchAvailableDates()
  }, [])

  useEffect(() => {
    fetchDailyCard()
  }, [selectedDate, refreshTrigger])

  const handleClarification = (index: number, value: any) => {
    const updated = [...pendingData]
    updated[index] = { ...updated[index], value, needsClarification: false }
    setPendingData(updated)
  }

  const savePendingData = async () => {
    if (pendingData.length === 0) return

    try {
      const response = await fetch('/api/health/store', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          contextData: pendingData.map(data => ({
            category: data.category,
            key: data.key,
            value: data.value,
            confidence: data.confidence,
            source: data.source
          })),
          conversationId: Date.now().toString(),
        }),
      })

      if (response.ok) {
        setPendingData([])
        setShowSavePrompt(false)
        fetchDailyCard()
      }
    } catch (error) {
      console.error('Error saving pending data:', error)
    }
  }

  const copyToClipboard = () => {
    if (!dailyCard) return

    const markdown = `# Daily Card for ${new Date(selectedDate).toLocaleDateString()}\n\n` +
      (dailyCard.sleep_hours ? `**Sleep Hours:** ${dailyCard.sleep_hours}h\n` : '') +
      (dailyCard.sleep_quality ? `**Sleep Quality:** ${dailyCard.sleep_quality}/10\n` : '') +
      (dailyCard.mood ? `**Mood:** ${dailyCard.mood}/10\n` : '') +
      (dailyCard.energy ? `**Energy:** ${dailyCard.energy}/10\n` : '') +
      (dailyCard.stress ? `**Stress:** ${dailyCard.stress}/10\n` : '') +
      (dailyCard.readiness ? `**Readiness:** ${dailyCard.readiness}/10\n` : '') +
      (dailyCard.context_data ? `\n**Context Data:**\n${Object.entries(dailyCard.context_data).map(([category, items]) => 
        `${getCategoryIcon(category)} ${category}:\n${Object.entries(items).map(([key, data]) => 
          `- **${key.replace(/_/g, ' ')}:** ${formatValue(data.value)} (Confidence: ${Math.round(data.confidence * 100)}%)\n`
        ).join('')}`
      ).join('')}` : '') +
      (pendingData.length > 0 ? `\n**Pending Data Needing Clarification:**\n${pendingData.map((data, index) => 
        `${index + 1}. **${data.category}:** ${data.key.replace(/_/g, ' ')} (Confidence: ${Math.round(data.confidence * 100)}%)\n` +
        `   - **Value:** ${formatValue(data.value)}\n` +
        `   - **Needs Clarification:** ${data.needsClarification ? 'Yes' : 'No'}\n` +
        `   - **Clarification Question:** ${data.clarificationQuestion || 'N/A'}\n` +
        `   - **Expected Format:** ${data.expectedFormat || 'N/A'}\n`
      ).join('')}` : '')

    navigator.clipboard.writeText(markdown).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }).catch(err => {
      console.error('Failed to copy to clipboard:', err)
    })
  }

  const handleFieldUpdate = async (fieldPath: string, newValue: any) => {
    try {
      const response = await fetch('/api/health/update-field', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          fieldPath,
          value: newValue,
          date: selectedDate
        }),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to update field')
      }

      fetchDailyCard()
      console.log('Field updated successfully:', fieldPath, newValue)
    } catch (error) {
      console.error('Error updating field:', error)
      throw error
    }
  }

  const getCategoryIcon = (category: string) => {
    const icons: { [key: string]: string } = {
      health: '🏥',
      activity: '🏃',
      preference: '❤️',
      goal: '🎯',
      challenge: '⚠️',
      pattern: '📊',
      mood: '😊',
      energy: '⚡',
      sleep: '😴',
      nutrition: '🍎',
      workout: '💪',
      social: '👥',
      work: '💼',
      other: '📝'
    }
    return icons[category] || '📝'
  }

  const formatValue = (value: any) => {
    if (typeof value === 'string') {
      return value
    }
    if (typeof value === 'number') {
      return value.toString()
    }
    if (typeof value === 'boolean') {
      return value ? 'Yes' : 'No'
    }
    if (Array.isArray(value)) {
      return value.join(', ')
    }
    return JSON.stringify(value)
  }

  const getHealthMetricsLayout = () => {
    const layout: any[] = [];
    let x = 0;
    let y = 0;

    if (dailyCard?.sleep_hours) {
      layout.push({ i: 'sleep_hours', x, y, w: 1, h: 1 });
      x += 1;
    }
    if (dailyCard?.sleep_quality) {
      layout.push({ i: 'sleep_quality', x, y, w: 1, h: 1 });
      x += 1;
    }
    if (dailyCard?.mood) {
      layout.push({ i: 'mood', x, y, w: 1, h: 1 });
      x += 1;
    }
    if (dailyCard?.energy && !dailyCard?.context_data?.energy) {
      layout.push({ i: 'energy', x, y, w: 1, h: 1 });
      x += 1;
    }
    if (dailyCard?.stress) {
      layout.push({ i: 'stress', x, y, w: 1, h: 1 });
      x += 1;
    }
    if (dailyCard?.readiness) {
      layout.push({ i: 'readiness', x, y, w: 1, h: 1 });
      x += 1;
    }
    return layout;
  };

  const getContextDataLayout = () => {
    const layout: any[] = [];
    let x = 0;
    let y = 0;

    if (dailyCard?.context_data) {
      Object.entries(dailyCard.context_data)
        .filter(([category]) => category !== 'energy')
        .forEach(([category, categoryItems]) => {
          Object.entries(categoryItems).forEach(([key, data]) => {
            const isLongText = typeof data.value === 'string' && data.value.length > 30;
            const isMediumText = typeof data.value === 'string' && data.value.length > 15;
            
            let w = 1;
            if (isLongText) w = 3;
            else if (isMediumText) w = 2;

            layout.push({ 
              i: `${category}_${key}`, 
              x: x % 3, 
              y: Math.floor(x / 3), 
              w, 
              h: 1 
            });
            x += w;
          });
        });
    }

    return layout;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center text-muted-foreground">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p>Loading your daily card...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-7xl mx-auto space-y-8 px-4 sm:px-6 lg:px-8">
      {/* Date Picker and Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-card/40 backdrop-blur-sm border border-line/40 rounded-xl p-6">
        <div className="flex items-center gap-4">
          <Calendar className="h-5 w-5 text-muted-foreground flex-shrink-0" />
          <Input
            type="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            className="w-auto min-w-[140px] bg-background/50 border-line/60 focus:ring-2 focus:ring-primary/20"
          />
        </div>
        
        <div className="flex items-center gap-4">
          {dailyCard && (
            <Button
              variant="outline"
              size="sm"
              onClick={copyToClipboard}
              className="flex items-center gap-2 bg-background/50 border-line/60 hover:bg-background/70 transition-colors"
            >
              {copied ? (
                <>
                  <Check className="h-4 w-4" />
                  <span>Copied!</span>
                </>
              ) : (
                <>
                  <Copy className="h-4 w-4" />
                  <span>Copy</span>
                </>
              )}
            </Button>
          )}
        </div>
      </div>

      {/* Daily Card Content */}
      {dailyCard && (
        <>
          {/* Health Metrics */}
          {(dailyCard?.sleep_hours || dailyCard?.sleep_quality || dailyCard?.mood || dailyCard?.energy || dailyCard?.stress || dailyCard?.readiness) && (
            <div className="bg-card/40 backdrop-blur-sm border border-line/40 rounded-xl p-4">
              <div className="flex items-center gap-3 mb-4">
                <span className="text-lg">📊</span>
                <h2 className="text-lg font-semibold">Health Metrics</h2>
              </div>
              
              <GridLayout
                layout={getHealthMetricsLayout()}
                cols={6}
                rowHeight={120}
                width={1200}
                isDraggable={false}
                isResizable={false}
                useCSSTransforms={false}
              >
                {dailyCard?.sleep_hours && (
                  <div key="sleep_hours">
                    <SimpleTile
                      label="Sleep Hours"
                      value={dailyCard.sleep_hours}
                      onSave={(value) => handleFieldUpdate('sleep_hours', value)}
                      fieldType="number"
                      placeholder="0.0"
                      icon="😴"
                      unit="hrs"
                    />
                  </div>
                )}

                {dailyCard?.sleep_quality && (
                  <div key="sleep_quality">
                    <SimpleTile
                      label="Sleep Quality"
                      value={dailyCard.sleep_quality}
                      onSave={(value) => handleFieldUpdate('sleep_quality', value)}
                      fieldType="number"
                      placeholder="0"
                      icon="⭐"
                      unit="/10"
                    />
                  </div>
                )}

                {dailyCard?.mood && (
                  <div key="mood">
                    <SimpleTile
                      label="Mood"
                      value={dailyCard.mood}
                      onSave={(value) => handleFieldUpdate('mood', value)}
                      fieldType="number"
                      placeholder="0"
                      icon="😊"
                      unit="/10"
                    />
                  </div>
                )}

                {dailyCard?.energy && !dailyCard?.context_data?.energy && (
                  <div key="energy">
                    <SimpleTile
                      label="Energy"
                      value={dailyCard.energy}
                      onSave={(value) => handleFieldUpdate('energy', value)}
                      fieldType="number"
                      placeholder="0"
                      icon="⚡"
                      unit="/10"
                    />
                  </div>
                )}

                {dailyCard?.stress && (
                  <div key="stress">
                    <SimpleTile
                      label="Stress"
                      value={dailyCard.stress}
                      onSave={(value) => handleFieldUpdate('stress', value)}
                      fieldType="number"
                      placeholder="0"
                      icon="😰"
                      unit="/10"
                    />
                  </div>
                )}

                {dailyCard?.readiness && (
                  <div key="readiness">
                    <SimpleTile
                      label="Readiness"
                      value={dailyCard.readiness}
                      onSave={(value) => handleFieldUpdate('readiness', value)}
                      fieldType="number"
                      placeholder="0"
                      icon="🎯"
                      unit="/10"
                    />
                  </div>
                )}
              </GridLayout>
            </div>
          )}

          {/* Context Data */}
          {dailyCard?.context_data && Object.keys(dailyCard.context_data).length > 0 && (
            <div className="bg-card/40 backdrop-blur-sm border border-line/40 rounded-xl p-4">
              <div className="flex items-center gap-3 mb-4">
                <span className="text-lg">📝</span>
                <h2 className="text-lg font-semibold">Today's Context</h2>
              </div>
              
              <GridLayout
                layout={getContextDataLayout()}
                cols={3}
                rowHeight={140}
                width={1200}
                isDraggable={false}
                isResizable={false}
                useCSSTransforms={false}
              >
                {dailyCard?.context_data && Object.entries(dailyCard.context_data)
                  .filter(([category]) => category !== 'energy')
                  .flatMap(([category, categoryItems]) =>
                    Object.entries(categoryItems).map(([key, data]) => (
                      <div key={`${category}_${key}`}>
                        <SimpleTile
                          label={key.replace(/_/g, ' ')}
                          value={data.value}
                          onSave={(value) => handleFieldUpdate(`context_data.${category}.${key}.value`, value)}
                          fieldType={typeof data.value === 'number' ? 'number' : 'text'}
                          placeholder="Click to edit"
                          source={data.source}
                          confidence={data.confidence}
                        />
                      </div>
                    ))
                  )}
              </GridLayout>
            </div>
          )}

          {/* Workout Card */}
          {(currentWorkout || dailyCard?.context_data?.workout) && (
            <div className="bg-card/40 backdrop-blur-sm border border-line/40 rounded-xl p-4">
              <div className="flex items-center gap-3 mb-4">
                <span className="text-lg">💪</span>
                <h2 className="text-lg font-semibold">Today's Workout</h2>
              </div>
              {currentWorkout ? (
                <WorkoutCard
                  title={currentWorkout.title}
                  steps={currentWorkout.steps}
                  totalTime={currentWorkout.totalTime}
                  onComplete={() => {
                    console.log('Workout completed!')
                  }}
                />
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <p>No workout planned for today</p>
                  <p className="text-sm mt-2">Start a conversation with Coach to get a workout!</p>
                </div>
              )}
            </div>
          )}

          {/* Last Updated */}
          {dailyCard?.last_updated && (
            <div className="text-sm text-muted-foreground text-center py-6 bg-background/20 rounded-xl border border-line/20">
              Last updated: {new Date(dailyCard.last_updated).toLocaleTimeString()}
            </div>
          )}
        </>
      )}

      {/* Empty State */}
      {!dailyCard && pendingData.length === 0 && (
        <div className="flex items-center justify-center h-64">
          <div className="text-center text-muted-foreground">
            <p className="text-xl font-medium mb-3">No data for today yet</p>
            <p className="text-base">Start a conversation with Coach to build your daily card!</p>
          </div>
        </div>
      )}
    </div>
  )
}
