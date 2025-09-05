'use client';

import { useAuth } from '@/components/providers/auth-provider';
import { PinnedChatBar } from '@/components/chat/pinned-chat-bar';
import { ChatConversationPopup } from '@/components/chat/chat-conversation-popup';
import { GlobalHeader } from '@/components/layout/global-header';
import { useChat } from '@/components/providers/chat-provider';

interface GlobalLayoutProps {
  children: React.ReactNode;
}

export function GlobalLayout({ children }: GlobalLayoutProps) {
  const { user } = useAuth();
  const { isChatExpanded } = useChat();

  // Don't show chat interface if user is not authenticated
  if (!user) {
    return <>{children}</>;
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Global Header */}
      <GlobalHeader />

      {/* Main content area with top padding for header and bottom padding for chat bar */}
      <div className={`pt-20 pb-20 ${isChatExpanded ? 'pb-0' : ''}`}>
        {children}
      </div>

      {/* Chat conversation popup */}
      <ChatConversationPopup userId={user.id} />

      {/* Pinned chat input bar */}
      <PinnedChatBar userId={user.id} />
    </div>
  );
}
