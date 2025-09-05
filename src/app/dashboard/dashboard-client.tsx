'use client';

import React, { useState } from 'react';
import { ChatInterface } from '@/components/chat/chat-interface';
import { DashboardHeader } from '@/components/dashboard/dashboard-header';
import { DashboardInsights } from '@/components/dashboard/dashboard-insights';

interface DashboardClientProps {
  userId: string;
}

export default function DashboardClient({ userId }: DashboardClientProps) {
  const [isChatCollapsed, setIsChatCollapsed] = useState(false);
  const [chatMessage, setChatMessage] = useState<string>('');

  const handleDataStored = () => {
    // Data stored - could trigger journal refresh if needed
    console.log('Data stored successfully');
  };

  const handleToggleChat = () => {
    setIsChatCollapsed(!isChatCollapsed);
  };

  const handleChatMessage = (message: string) => {
    setChatMessage(message);
    // Auto-expand chat when a message is sent
    if (isChatCollapsed) {
      setIsChatCollapsed(false);
    }
    // Clear the message after a short delay to allow it to be processed
    setTimeout(() => setChatMessage(''), 100);
  };

  return (
    <div className="flex flex-col h-screen">
      {/* Header */}
      <DashboardHeader userId={userId} />

      {/* Main Content */}
      <div className="flex-1 overflow-hidden">
        <div className="h-full flex flex-col">
          {/* Dashboard Insights */}
          <div className={`transition-all duration-300 ease-in-out ${
            isChatCollapsed ? 'flex-1' : 'h-2/3'
          }`}>
            <div className="h-full overflow-y-auto p-6">
              <DashboardInsights 
                userId={userId} 
                onChatMessage={handleChatMessage}
              />
            </div>
          </div>

          {/* Chat Interface */}
          <div className={`transition-all duration-300 ease-in-out ${
            isChatCollapsed ? 'h-12' : 'h-1/3'
          } border-t border-gray-200`}>
            <ChatInterface 
              userId={userId} 
              onDataStored={handleDataStored}
              isCollapsed={isChatCollapsed}
              onToggleCollapse={handleToggleChat}
              initialMessage={chatMessage}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
