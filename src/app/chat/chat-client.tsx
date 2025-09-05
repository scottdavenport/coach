'use client';

import React from 'react';
import { ChatInterface } from '@/components/chat/chat-interface';
import { DashboardHeader } from '@/components/dashboard/dashboard-header';

interface ChatClientProps {
  userId: string;
}

export default function ChatClient({ userId }: ChatClientProps) {
  const handleDataStored = () => {
    // Data stored - could trigger journal refresh if needed
    console.log('Data stored successfully');
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

      {/* Chat Interface - with top padding to account for fixed header */}
      <div className="flex-1 pt-[73px]">
        <ChatInterface userId={userId} onDataStored={handleDataStored} />
      </div>
    </div>
  );
}
