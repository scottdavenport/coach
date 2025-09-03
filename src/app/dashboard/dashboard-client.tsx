'use client'

import { useState } from 'react'
import { ChatInterface } from '@/components/chat/chat-interface'

import { DashboardHeader } from '@/components/dashboard/dashboard-header'

interface DashboardClientProps {
  userId: string
}

export default function DashboardClient({ userId }: DashboardClientProps) {
  const [currentDate, setCurrentDate] = useState<string>('')

  const handleDataStored = () => {
    // Data stored - could trigger journal refresh if needed
    console.log('Data stored successfully')
  }

  const handleDateChange = (date: string) => {
    console.log('🔍 DashboardClient: Date changed to:', date)
    setCurrentDate(date)
  }

  return (
    <div className="flex flex-col h-screen">
      {/* Header */}
      <DashboardHeader 
        userId={userId} 
        selectedDate={currentDate} 
        onDateChange={handleDateChange}
      />
      
      {/* Chat Interface */}
      <div className="flex-1 overflow-hidden">
        <ChatInterface 
          userId={userId} 
          onDataStored={handleDataStored}
        />
      </div>
    </div>
  )
}
