'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useChat } from '@/components/providers/chat-provider';
import { createClient } from '@/lib/supabase/client';
import { ChatMessage } from '@/types';
import ReactMarkdown from 'react-markdown';

interface ChatConversationPopupProps {
  userId: string;
}

export function ChatConversationPopup({ userId }: ChatConversationPopupProps) {
  const { isChatExpanded, collapseChat, currentPageContext, messages: contextMessages } = useChat();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const supabase = createClient();

  // Load conversation history
  const loadConversationHistory = useCallback(async () => {
    // If we have context messages, use those instead of loading from database
    if (contextMessages.length > 0) {
      setMessages(contextMessages);
      setIsLoadingHistory(false);
      return;
    }

    if (messages.length > 0) return; // Don't reload if already loaded

    setIsLoadingHistory(true);
    try {
      const { data, error } = await supabase
        .from('conversations')
        .select('message, message_type, metadata, created_at')
        .eq('user_id', userId)
        .order('created_at', { ascending: true })
        .limit(50);

      if (error) {
        console.error('Error loading conversation history:', error);
        return;
      }

      if (data) {
        // Convert to ChatMessage format
        const historyMessages: ChatMessage[] = data.map((conv, index) => ({
          id: `history-${index}`,
          content: conv.message || '',
          role: conv.metadata?.role === 'assistant' ? 'assistant' : 'user',
          created_at: conv.created_at,
        }));
        setMessages(historyMessages);
      }
    } catch (error) {
      console.error('Error loading conversation history:', error);
    } finally {
      setIsLoadingHistory(false);
    }
  }, [userId, messages.length, supabase, contextMessages]);

  // Load history when popup opens
  useEffect(() => {
    if (isChatExpanded) {
      loadConversationHistory();
    }
  }, [isChatExpanded, loadConversationHistory]);

  // Scroll to bottom when popup opens
  useEffect(() => {
    if (isChatExpanded && messagesEndRef.current) {
      // Small delay to ensure DOM is ready
      setTimeout(() => {
        if (messagesEndRef.current) {
          messagesEndRef.current.scrollIntoView({ behavior: 'instant' });
        }
      }, 100);
    }
  }, [isChatExpanded]);

  // Update messages when context messages change
  useEffect(() => {
    if (contextMessages.length > 0) {
      setMessages(contextMessages);
    }
  }, [contextMessages]);

  // Scroll to bottom when messages load (instant, no animation)
  useEffect(() => {
    if (messagesEndRef.current && messages.length > 0) {
      messagesEndRef.current.scrollIntoView({ behavior: 'instant' });
    }
  }, [messages]);

  // Handle close
  const handleClose = () => {
    collapseChat();
  };

  if (!isChatExpanded) {
    return null;
  }

  return (
    <div
      className="fixed bottom-20 left-4 right-4 z-40 border border-line rounded-lg shadow-lg max-h-[60vh] flex flex-col"
      style={{ backgroundColor: 'hsl(var(--bg))' }}
    >
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
            onClick={handleClose}
            className="h-8 w-8 hover:bg-destructive/10 hover:text-destructive"
            title="Close chat"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Messages Area - Simple conversation history */}
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
                <p className="text-lg mb-2">No conversation history yet</p>
                <p className="text-sm">
                  Start a conversation using the chat bar below
                </p>
              </div>
            </div>
          ) : (
            messages.map(message => (
              <div
                key={message.id}
                className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-[80%] rounded-2xl px-4 py-3 ${
                    message.role === 'user'
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-card text-text border border-line'
                  }`}
                >
                  <div className="text-base leading-7">
                    {message.role === 'user' ? (
                      <div className="whitespace-pre-wrap">
                        {message.content}
                      </div>
                    ) : (
                      <div className="prose prose-sm max-w-none dark:prose-invert">
                        <ReactMarkdown
                          components={{
                            p: ({ children }) => (
                              <p className="mb-3 last:mb-0 text-text">
                                {children}
                              </p>
                            ),
                            ul: ({ children }) => (
                              <ul className="mb-3 last:mb-0 list-disc list-inside text-text">
                                {children}
                              </ul>
                            ),
                            ol: ({ children }) => (
                              <ol className="mb-3 last:mb-0 list-decimal list-inside text-text">
                                {children}
                              </ol>
                            ),
                            li: ({ children }) => (
                              <li className="mb-1 text-text">{children}</li>
                            ),
                            strong: ({ children }) => (
                              <strong className="font-semibold text-text">
                                {children}
                              </strong>
                            ),
                            em: ({ children }) => (
                              <em className="italic text-text">{children}</em>
                            ),
                            code: ({ children }) => (
                              <code className="bg-muted px-1 py-0.5 rounded text-sm font-mono text-text">
                                {children}
                              </code>
                            ),
                            pre: ({ children }) => (
                              <pre className="bg-muted p-3 rounded-lg overflow-x-auto text-sm font-mono text-text">
                                {children}
                              </pre>
                            ),
                          }}
                        >
                          {message.content}
                        </ReactMarkdown>
                      </div>
                    )}
                  </div>

                  <div
                    className={`mt-1 text-xs ${
                      message.role === 'user'
                        ? 'text-primary-foreground/70'
                        : 'text-muted-foreground'
                    }`}
                  >
                    {new Date(message.created_at).toLocaleTimeString([], {
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </div>
                </div>
              </div>
            ))
          )}

          <div ref={messagesEndRef} />
        </div>
      </div>
    </div>
  );
}
