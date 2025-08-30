'use client'

import { useState, useRef } from 'react'
import { ChatInterface } from '@/components/chat/chat-interface'
import { CardModalTest } from '@/components/card/card-modal-test'
import { DashboardHeader } from '@/components/dashboard/dashboard-header'

interface DashboardClientProps {
  userId: string
}

export default function DashboardClient({ userId }: DashboardClientProps) {
  const cardModalRef = useRef<{ refreshData: () => void }>(null)

  const handleDataStored = () => {
    // Refresh the daily card when new data is stored
    if (cardModalRef.current) {
      cardModalRef.current.refreshData()
    }
  }

  return (
    <div className="flex flex-col h-screen">
      {/* Header */}
      <DashboardHeader userId={userId} cardModalRef={cardModalRef} />
      
      {/* Chat Interface */}
      <div className="flex-1 overflow-hidden">
        <ChatInterface userId={userId} onDataStored={handleDataStored} />
      </div>
    </div>
  )
}
