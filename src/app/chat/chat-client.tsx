'use client';

import React, { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useChat } from '@/components/providers/chat-provider';

interface ChatClientProps {
  userId: string;
}

export default function ChatClient({ userId }: ChatClientProps) {
  const router = useRouter();
  const { expandChat } = useChat();

  useEffect(() => {
    // Redirect to dashboard and expand chat
    expandChat();
    router.push('/dashboard');
  }, [router, expandChat]);

  return (
    <div className="max-w-7xl mx-auto p-6">
      <div className="text-center">
        <h1 className="text-2xl font-bold mb-4">Redirecting to Dashboard...</h1>
        <p className="text-muted-foreground">
          Chat is now available on all pages via the pinned chat bar at the
          bottom.
        </p>
      </div>
    </div>
  );
}
