'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { X, Minimize2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { SimpleChatMessage } from './simple-chat-message';
import { useChat } from '@/components/providers/chat-provider';
import { createClient } from '@/lib/supabase/client';
import { ChatMessage } from '@/types';

interface ChatConversationPopupProps {
  userId: string;
}

export function ChatConversationPopup({ userId }: ChatConversationPopupProps) {
  const {
    messages,
    isLoading,
    isChatExpanded,
    collapseChat,
    setMessages,
    setIsLoading,
    currentPageContext,
  } = useChat();

  const [isLoadingHistory, setIsLoadingHistory] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const supabase = createClient();

  // Load conversation history
  const loadConversationHistory = useCallback(async () => {
    if (messages.length > 0) return; // Don't reload if already loaded

    setIsLoadingHistory(true);
    try {
      const { data, error } = await supabase
        .from('conversation_messages')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: true })
        .limit(50);

      if (error) {
        console.error('Error loading conversation history:', error);
        return;
      }

      if (data) {
        setMessages(data);
      }
    } catch (error) {
      console.error('Error loading conversation history:', error);
    } finally {
      setIsLoadingHistory(false);
    }
  }, [userId, messages.length, setMessages, supabase]);

  // Load history when popup opens
  useEffect(() => {
    if (isChatExpanded) {
      loadConversationHistory();
    }
  }, [isChatExpanded, loadConversationHistory]);

  // Scroll to bottom when new messages arrive
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages]);

  // Handle minimize to input bar
  const handleMinimize = () => {
    collapseChat();
  };

  // Handle close (same as minimize for now)
  const handleClose = () => {
    collapseChat();
  };

  if (!isChatExpanded) {
    return null;
  }

  return (
    <div className="fixed bottom-20 left-4 right-4 z-40 bg-background border border-line rounded-lg shadow-lg max-h-[60vh] flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-line">
        <div>
          <h3 className="font-semibold text-text">Chat with Coach</h3>
          <p className="text-sm text-muted">
            Currently on {currentPageContext}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="icon"
            onClick={handleMinimize}
            className="h-8 w-8"
            title="Minimize to input bar"
          >
            <Minimize2 className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={handleClose}
            className="h-8 w-8"
            title="Close chat"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto p-4">
        <div className="max-w-4xl mx-auto space-y-4">
          {isLoadingHistory ? (
            <div className="flex items-center justify-center h-full min-h-[200px]">
              <div className="text-center text-muted">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
                <p>Loading conversation history...</p>
              </div>
            </div>
          ) : messages.length === 0 ? (
            <div className="flex items-center justify-center h-full min-h-[200px]">
              <div className="text-center text-muted">
                <p className="text-lg mb-2">Welcome to Coach!</p>
                <p className="text-sm mb-3">
                  Your AI health and fitness companion
                </p>
                <div className="text-sm text-muted space-y-2">
                  <p>
                    💡 <strong>Quick Start:</strong>
                  </p>
                  <p>
                    • Upload a screenshot from your health app (Oura, Apple
                    Health, Fitbit, etc.)
                  </p>
                  <p>
                    • Or simply tell me how you're feeling and what's going on
                  </p>
                  <p>
                    • I'll help track your progress and build your daily card
                  </p>
                  <p>
                    • Check the "Daily Card" button to see your health data
                    organized
                  </p>
                </div>
              </div>
            </div>
          ) : (
            messages.map(message => (
              <SimpleChatMessage key={message.id} message={message} />
            ))
          )}

          {isLoading && (
            <div className="flex items-center justify-center py-4">
              <div className="flex items-center gap-2 text-muted">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary"></div>
                <span className="text-sm">Coach is thinking...</span>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>
      </div>
    </div>
  );
}
