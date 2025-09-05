'use client';

import React from 'react';
import { ChatInterface } from '@/components/chat/chat-interface';
import { DashboardHeader } from '@/components/dashboard/dashboard-header';

interface DashboardClientProps {
  userId: string;
}

export default function DashboardClient({ userId }: DashboardClientProps) {
  const handleDataStored = () => {
    // Data stored - could trigger journal refresh if needed
    console.log('Data stored successfully');
  };

  return (
    <div className="flex flex-col h-screen">
      {/* Header */}
      <DashboardHeader userId={userId} />

      {/* Chat Interface */}
      <div className="flex-1">
        <ChatInterface userId={userId} onDataStored={handleDataStored} />
      </div>
    </div>
  );
}
