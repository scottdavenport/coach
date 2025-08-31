'use client'

import { useState, forwardRef, useImperativeHandle, useEffect } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { useDailyActivities } from '@/hooks/use-daily-activities'
import { 
  Calendar, 
  ChevronLeft, 
  ChevronRight, 
  CheckCircle, 
  Circle, 
  Plus, 
  Upload, 
  Trash2,
  Dumbbell,
  Activity,
  Play,
  Clock
} from 'lucide-react'

interface DailyWorkoutModalProps {
  userId: string
}

export interface DailyWorkoutModalRef {
  openModal: (date?: string) => void
  closeModal: () => void
}

export const DailyWorkoutModal = forwardRef<DailyWorkoutModalRef, DailyWorkoutModalProps>(
  ({ userId }, ref) => {
    const [isOpen, setIsOpen] = useState(false)
    const [selectedDate, setSelectedDate] = useState('')
    const [showDatePicker, setShowDatePicker] = useState(false)
    
    const {
      selectedDate: hookDate,
      setSelectedDate: setHookDate,
      markActivityCompleted,
      deleteActivity,
      getPlannedActivities,
      getCompletedActivities
    } = useDailyActivities({ userId })

    // Initialize with today's date
    useEffect(() => {
      if (!selectedDate) {
        const today = new Date().toISOString().split('T')[0]
        setSelectedDate(today)
        setHookDate(today)
      }
    }, [selectedDate, setHookDate])

    // Expose methods to parent component
    useImperativeHandle(ref, () => ({
      openModal: (date?: string) => {
        const targetDate = date || new Date().toISOString().split('T')[0]
        setSelectedDate(targetDate)
        setHookDate(targetDate)
        setIsOpen(true)
      },
      closeModal: () => {
        setIsOpen(false)
      }
    }))

    const navigateDate = (direction: 'prev' | 'next') => {
      const currentDate = new Date(selectedDate)
      if (direction === 'prev') {
        currentDate.setDate(currentDate.getDate() - 1)
      } else {
        currentDate.setDate(currentDate.getDate() + 1)
      }
      const newDate = currentDate.toISOString().split('T')[0]
      setSelectedDate(newDate)
      setHookDate(newDate)
    }

    const navigateToDate = (date: string) => {
      setSelectedDate(date)
      setHookDate(date)
      setShowDatePicker(false)
    }

    const formatDate = (dateString: string) => {
      const date = new Date(dateString)
      return date.toLocaleDateString('en-US', { 
        weekday: 'short', 
        month: 'short', 
        day: 'numeric' 
      })
    }

    const handleDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      setSelectedDate(e.target.value)
      setHookDate(e.target.value)
    }

    const handleMarkCompleted = async (activityId: string) => {
      await markActivityCompleted(activityId)
    }

    const handleDeleteActivity = async (activityId: string) => {
      if (confirm('Are you sure you want to delete this activity?')) {
        await deleteActivity(activityId)
      }
    }

    const getActivityIcon = (activityType: string) => {
      switch (activityType) {
        case 'strength':
          return <Dumbbell className="h-4 w-4" />
        case 'cardio':
        case 'run':
        case 'walk':
          return <Activity className="h-4 w-4" />
        case 'peloton':
          return <Play className="h-4 w-4" />
        default:
          return <Clock className="h-4 w-4" />
      }
    }

    const plannedActivities = getPlannedActivities()
    const completedActivities = getCompletedActivities()

    return (
      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <span>Daily Workout</span>
                <div className="flex items-center gap-2">
                  <Button variant="ghost" size="icon" onClick={() => navigateDate('prev')} className="h-8 w-8">
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  <Button 
                    variant="ghost" 
                    onClick={() => setShowDatePicker(!showDatePicker)}
                    className="flex items-center gap-2"
                  >
                    <Calendar className="h-4 w-4" />
                    {selectedDate ? formatDate(selectedDate) : 'Today'}
                  </Button>
                  <Button variant="ghost" size="icon" onClick={() => navigateDate('next')} className="h-8 w-8">
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>
              <Button variant="ghost" size="sm" onClick={() => setShowDatePicker(!showDatePicker)}>
                <Plus className="h-4 w-4 mr-2" />
                Add Activity
              </Button>
            </DialogTitle>
          </DialogHeader>

          {/* Date Picker */}
          {showDatePicker && (
            <div className="p-4 border border-line rounded-lg mb-4">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-medium">Select Date</h3>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={() => {
                    const today = new Date().toISOString().split('T')[0]
                    navigateToDate(today)
                  }}
                  className="text-xs"
                >
                  Today
                </Button>
              </div>
              <Input 
                type="date" 
                value={selectedDate} 
                onChange={handleDateChange} 
                className="w-full" 
              />
              <div className="flex justify-between mt-3">
                <Button variant="outline" size="sm" onClick={() => setShowDatePicker(false)} className="text-xs">
                  Cancel
                </Button>
                <Button variant="outline" size="sm" onClick={() => setShowDatePicker(false)} className="text-xs">
                  Done
                </Button>
              </div>
            </div>
          )}

          {/* Content */}
          <div className="space-y-6">
            {loading ? (
              <div className="text-center py-8">Loading activities...</div>
            ) : (
              <>
                {/* Planned Activities */}
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold flex items-center gap-2">
                    <Circle className="h-5 w-5 text-muted-foreground" />
                    Planned Activities
                  </h3>
                  {plannedActivities.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                      No planned activities for this date
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {plannedActivities.map((activity) => (
                        <div key={activity.id} className="border border-line rounded-lg p-4">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                              {getActivityIcon(activity.activity_type)}
                              <div>
                                <h4 className="font-medium">{activity.title}</h4>
                                {activity.description && (
                                  <p className="text-sm text-muted-foreground">{activity.description}</p>
                                )}
                                {activity.planned_data && Object.keys(activity.planned_data).length > 0 && (
                                  <div className="text-xs text-muted-foreground mt-1">
                                    {activity.planned_data.exercises && (
                                      <span>{activity.planned_data.exercises.length} exercises</span>
                                    )}
                                    {activity.planned_data.duration && (
                                      <span> • {activity.planned_data.duration}</span>
                                    )}
                                  </div>
                                )}
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleMarkCompleted(activity.id)}
                                className="text-xs"
                              >
                                <CheckCircle className="h-3 w-3 mr-1" />
                                Complete
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleDeleteActivity(activity.id)}
                                className="text-xs text-destructive"
                              >
                                <Trash2 className="h-3 w-3" />
                              </Button>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Completed Activities */}
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold flex items-center gap-2">
                    <CheckCircle className="h-5 w-5 text-green-500" />
                    Completed Activities
                  </h3>
                  {completedActivities.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                      No completed activities for this date
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {completedActivities.map((activity) => (
                        <div key={activity.id} className="border border-line rounded-lg p-4 bg-green-50/10">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                              {getActivityIcon(activity.activity_type)}
                              <div>
                                <h4 className="font-medium flex items-center gap-2">
                                  {activity.title}
                                  <CheckCircle className="h-4 w-4 text-green-500" />
                                </h4>
                                {activity.description && (
                                  <p className="text-sm text-muted-foreground">{activity.description}</p>
                                )}
                                {activity.completed_data && Object.keys(activity.completed_data).length > 0 && (
                                  <div className="text-xs text-muted-foreground mt-1">
                                    {activity.completed_data.exercises && (
                                      <span>{activity.completed_data.exercises.length} exercises completed</span>
                                    )}
                                    {activity.completed_data.actual_duration && (
                                      <span> • {activity.completed_data.actual_duration}</span>
                                    )}
                                  </div>
                                )}
                                {activity.screenshot_url && (
                                  <div className="text-xs text-blue-500 mt-1">
                                    📸 Screenshot uploaded
                                  </div>
                                )}
                              </div>
                            </div>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleDeleteActivity(activity.id)}
                              className="text-xs text-destructive"
                            >
                              <Trash2 className="h-3 w-3" />
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Upload Screenshot */}
                <div className="border border-line rounded-lg p-4">
                  <h3 className="text-lg font-semibold mb-3">Upload Workout Screenshot</h3>
                  <p className="text-sm text-muted-foreground mb-4">
                    Upload a screenshot from Strava or HealthFit to automatically create a completed activity
                  </p>
                  <Button variant="outline" className="w-full">
                    <Upload className="h-4 w-4 mr-2" />
                    Upload Screenshot
                  </Button>
                </div>
              </>
            )}
          </div>
        </DialogContent>
      </Dialog>
    )
  }
)

DailyWorkoutModal.displayName = 'DailyWorkoutModal'
