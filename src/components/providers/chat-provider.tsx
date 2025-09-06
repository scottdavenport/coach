'use client';

import React, {
  createContext,
  useContext,
  useState,
  useCallback,
  useEffect,
} from 'react';
import { usePathname } from 'next/navigation';
import { ChatMessage } from '@/types';

interface ChatContextType {
  // Chat state
  messages: ChatMessage[];
  isLoading: boolean;
  isChatExpanded: boolean;
  currentPageContext: string;
  lastSeenMessageCount: number;

  // Chat actions
  toggleChat: () => void;
  expandChat: () => void;
  collapseChat: () => void;
  addMessage: (message: ChatMessage) => void;
  setMessages: (messages: ChatMessage[]) => void;
  setIsLoading: (loading: boolean) => void;
  markMessagesAsSeen: () => void;

  // Input state
  inputValue: string;
  setInputValue: (value: string) => void;
}

const ChatContext = createContext<ChatContextType | undefined>(undefined);

export function ChatProvider({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isChatExpanded, setIsChatExpanded] = useState(false);
  const [inputValue, setInputValue] = useState('');
  const [lastSeenMessageCount, setLastSeenMessageCount] = useState(0);

  // Get current page context from pathname
  const getPageContext = useCallback((path: string): string => {
    const pathSegments = path.split('/').filter(Boolean);

    if (pathSegments.length === 0) return 'Home';

    const pageName = pathSegments[0];

    // Map pathnames to user-friendly page names
    const pageMap: Record<string, string> = {
      dashboard: 'Dashboard',
      journal: 'Journal',
      workout: 'Workout',
      chat: 'Chat',
      settings: 'Settings',
      summary: 'Summary',
    };

    return (
      pageMap[pageName] || pageName.charAt(0).toUpperCase() + pageName.slice(1)
    );
  }, []);

  const currentPageContext = getPageContext(pathname);

  // Chat visibility actions
  const toggleChat = useCallback(() => {
    setIsChatExpanded(prev => {
      const newExpanded = !prev;
      if (newExpanded) {
        // Mark messages as seen when expanding
        setLastSeenMessageCount(messages.length);
      }
      return newExpanded;
    });
  }, [messages.length]);

  const expandChat = useCallback(() => {
    setIsChatExpanded(true);
    // Mark messages as seen when expanding
    setLastSeenMessageCount(messages.length);
  }, [messages.length]);

  const collapseChat = useCallback(() => {
    setIsChatExpanded(false);
  }, []);

  const markMessagesAsSeen = useCallback(() => {
    setLastSeenMessageCount(messages.length);
  }, [messages.length]);

  // Message management
  const addMessage = useCallback((message: ChatMessage) => {
    setMessages(prev => [...prev, message]);
  }, []);

  // Auto-expand chat when new messages arrive
  useEffect(() => {
    if (messages.length > 0 && !isChatExpanded) {
      // Only auto-expand if it's a new message (not initial load)
      const lastMessage = messages[messages.length - 1];
      if (lastMessage && lastMessage.created_at) {
        const messageTime = new Date(lastMessage.created_at).getTime();
        const now = Date.now();
        // If message is less than 5 seconds old, auto-expand
        if (now - messageTime < 5000) {
          expandChat();
        }
      }
    }
  }, [messages, isChatExpanded, expandChat]);

  const value: ChatContextType = {
    messages,
    isLoading,
    isChatExpanded,
    currentPageContext,
    lastSeenMessageCount,
    toggleChat,
    expandChat,
    collapseChat,
    addMessage,
    setMessages,
    setIsLoading,
    markMessagesAsSeen,
    inputValue,
    setInputValue,
  };

  return <ChatContext.Provider value={value}>{children}</ChatContext.Provider>;
}

export function useChat() {
  const context = useContext(ChatContext);
  if (context === undefined) {
    throw new Error('useChat must be used within a ChatProvider');
  }
  return context;
}
