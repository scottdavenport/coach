'use client'

import { ChatInterface } from '@/components/chat/chat-interface'

export default function ChatWithFullInterface() {
  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Simple Header */}
      <div className="border-b border-gray-200 p-4">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-xl font-semibold text-gray-900">🧪 FULL CHAT INTERFACE TEST</h1>
          <p className="text-sm text-gray-600">Testing ChatInterface component in isolation</p>
        </div>
      </div>

      {/* Chat Interface Component */}
      <div className="flex-1 overflow-hidden">
        <ChatInterface 
          userId="b11a9d85-b690-4f00-bd49-16d68b383f57"
          onDataStored={() => console.log('Data stored')}
        />
      </div>
    </div>
  )
}