'use client';

import React from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { DashboardInsights } from './dashboard-insights';

interface DashboardModalProps {
  isOpen: boolean;
  onClose: () => void;
  userId: string;
}

export function DashboardModal({
  isOpen,
  onClose,
  userId,
}: DashboardModalProps) {
  const handleChatMessage = (message: string) => {
    // Close the modal and let the chat handle the message
    onClose();
    // You could also trigger a chat message here if needed
    console.log('Dashboard chat message:', message);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-6xl max-h-[90vh] overflow-hidden">
        <DialogHeader>
          <DialogTitle className="text-lg font-semibold text-text">
            Health Dashboard
          </DialogTitle>
        </DialogHeader>

        <div className="overflow-y-auto max-h-[calc(90vh-80px)]">
          <DashboardInsights
            userId={userId}
            onChatMessage={handleChatMessage}
          />
        </div>
      </DialogContent>
    </Dialog>
  );
}
