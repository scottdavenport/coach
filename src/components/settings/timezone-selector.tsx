'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { useUserTimezone } from '@/hooks/use-user-timezone'
import { Clock, Check, RefreshCw } from 'lucide-react'

// Common timezones for the dropdown
const COMMON_TIMEZONES = [
  { value: 'UTC', label: 'UTC (Coordinated Universal Time)' },
  { value: 'America/New_York', label: 'Eastern Time (ET)' },
  { value: 'America/Chicago', label: 'Central Time (CT)' },
  { value: 'America/Denver', label: 'Mountain Time (MT)' },
  { value: 'America/Los_Angeles', label: 'Pacific Time (PT)' },
  { value: 'America/Phoenix', label: 'Arizona Time (MST)' },
  { value: 'America/Anchorage', label: 'Alaska Time (AKST)' },
  { value: 'Pacific/Honolulu', label: 'Hawaii Time (HST)' },
  { value: 'Europe/London', label: 'London (GMT/BST)' },
  { value: 'Europe/Paris', label: 'Paris (CET/CEST)' },
  { value: 'Europe/Berlin', label: 'Berlin (CET/CEST)' },
  { value: 'Europe/Rome', label: 'Rome (CET/CEST)' },
  { value: 'Europe/Madrid', label: 'Madrid (CET/CEST)' },
  { value: 'Asia/Tokyo', label: 'Tokyo (JST)' },
  { value: 'Asia/Shanghai', label: 'Shanghai (CST)' },
  { value: 'Asia/Kolkata', label: 'Mumbai/Delhi (IST)' },
  { value: 'Asia/Dubai', label: 'Dubai (GST)' },
  { value: 'Australia/Sydney', label: 'Sydney (AEST/AEDT)' },
  { value: 'Australia/Melbourne', label: 'Melbourne (AEST/AEDT)' },
  { value: 'Pacific/Auckland', label: 'Auckland (NZST/NZDT)' }
]

interface TimezoneSelectorProps {
  userId: string
}

export function TimezoneSelector({ userId }: TimezoneSelectorProps) {
  const {
    userTimezone,
    detectedTimezone,
    isLoading,
    error,
    updateTimezone,
    refreshTimezone
  } = useUserTimezone()

  const [selectedTimezone, setSelectedTimezone] = useState(userTimezone)
  const [isUpdating, setIsUpdating] = useState(false)

  // Update local state when user timezone changes
  useEffect(() => {
    setSelectedTimezone(userTimezone)
  }, [userTimezone])

  const handleTimezoneChange = async (timezone: string) => {
    setSelectedTimezone(timezone)
    setIsUpdating(true)
    
    try {
      await updateTimezone(timezone)
    } catch (err) {
      console.error('Failed to update timezone:', err)
    } finally {
      setIsUpdating(false)
    }
  }

  const handleUseDetected = async () => {
    if (detectedTimezone && detectedTimezone !== userTimezone) {
      await handleTimezoneChange(detectedTimezone)
    }
  }

  const formatTimezoneDisplay = (timezone: string) => {
    try {
      const now = new Date()
      const formatter = new Intl.DateTimeFormat('en-US', {
        timeZone: timezone,
        timeZoneName: 'short',
        hour: 'numeric',
        minute: '2-digit',
        hour12: true
      })
      const parts = formatter.formatToParts(now)
      const timeZoneName = parts.find(part => part.type === 'timeZoneName')?.value || ''
      const time = parts.find(part => part.type === 'hour')?.value + ':' + 
                   parts.find(part => part.type === 'minute')?.value + ' ' +
                   parts.find(part => part.type === 'dayPeriod')?.value
      
      return `${timezone} (${time} ${timeZoneName})`
    } catch (error) {
      return timezone
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center gap-2 text-muted-foreground">
        <RefreshCw className="h-4 w-4 animate-spin" />
        Loading timezone settings...
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <Clock className="h-5 w-5 text-primary" />
        <h3 className="text-lg font-semibold">Timezone Settings</h3>
      </div>

      {error && (
        <div className="p-3 bg-destructive/10 border border-destructive/20 rounded-lg text-destructive text-sm">
          {error}
        </div>
      )}

      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-muted-foreground mb-2">
            Current Timezone
          </label>
          <div className="p-3 bg-card/60 backdrop-blur-sm border border-line/40 rounded-lg text-sm">
            {formatTimezoneDisplay(userTimezone)}
          </div>
        </div>

        {detectedTimezone && detectedTimezone !== userTimezone && (
          <div className="p-4 bg-primary/10 border border-primary/20 rounded-lg">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-primary">
                  Browser detected timezone
                </p>
                <p className="text-sm text-muted-foreground">
                  {formatTimezoneDisplay(detectedTimezone)}
                </p>
              </div>
              <Button
                size="sm"
                variant="outline"
                onClick={handleUseDetected}
                disabled={isUpdating}
                className="text-primary border-primary/30 hover:bg-primary/10"
              >
                Use Detected
              </Button>
            </div>
          </div>
        )}

        <div>
          <label className="block text-sm font-medium text-muted-foreground mb-2">
            Select Timezone
          </label>
          <select
            value={selectedTimezone}
            onChange={(e) => handleTimezoneChange(e.target.value)}
            disabled={isUpdating}
            className="w-full p-3 border border-line/40 rounded-lg bg-card/60 backdrop-blur-sm text-foreground focus:ring-2 focus:ring-primary/50 focus:border-primary/50 transition-colors"
          >
            {COMMON_TIMEZONES.map((tz) => (
              <option key={tz.value} value={tz.value}>
                {tz.label}
              </option>
            ))}
          </select>
        </div>

        <div className="text-xs text-muted-foreground bg-card/30 border border-line/20 rounded-lg p-3">
          <p>
            Your timezone preference affects how dates and times are displayed throughout the app.
            All data is stored in UTC and converted to your preferred timezone for display.
          </p>
        </div>
      </div>
    </div>
  )
}
