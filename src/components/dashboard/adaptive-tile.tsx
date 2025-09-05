'use client';

import React, { useState } from 'react';
import { Edit2, MessageCircle, Check, X } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface AdaptiveTileProps {
  title: string;
  icon?: React.ReactNode;
  color?: string;
  children: React.ReactNode;
  onEdit?: () => void;
  onChat?: () => void;
  isEditable?: boolean;
  isChatEnabled?: boolean;
  className?: string;
}

export function AdaptiveTile({
  title,
  icon,
  color = 'blue',
  children,
  onEdit,
  onChat,
  isEditable = false,
  isChatEnabled = true,
  className = '',
}: AdaptiveTileProps) {
  const [isEditing, setIsEditing] = useState(false);

  const handleEdit = () => {
    if (onEdit) {
      onEdit();
    }
    setIsEditing(true);
  };

  const handleSave = () => {
    setIsEditing(false);
  };

  const handleCancel = () => {
    setIsEditing(false);
  };

  const colorClasses = {
    blue: 'border-blue-200 bg-blue-50/50',
    green: 'border-green-200 bg-green-50/50',
    purple: 'border-purple-200 bg-purple-50/50',
    orange: 'border-orange-200 bg-orange-50/50',
    red: 'border-red-200 bg-red-50/50',
    gray: 'border-gray-200 bg-gray-50/50',
  };

  return (
    <div className={`rounded-xl border-2 p-4 transition-all duration-200 hover:shadow-md ${colorClasses[color as keyof typeof colorClasses]} ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center space-x-2">
          {icon && <div className="text-lg">{icon}</div>}
          <h3 className="font-semibold text-sm text-gray-800">{title}</h3>
        </div>
        
        <div className="flex items-center space-x-1">
          {isEditable && !isEditing && (
            <Button
              variant="ghost"
              size="sm"
              onClick={handleEdit}
              className="h-6 w-6 p-0 text-gray-500 hover:text-gray-700"
            >
              <Edit2 className="h-3 w-3" />
            </Button>
          )}
          
          {isChatEnabled && (
            <Button
              variant="ghost"
              size="sm"
              onClick={onChat}
              className="h-6 w-6 p-0 text-gray-500 hover:text-gray-700"
            >
              <MessageCircle className="h-3 w-3" />
            </Button>
          )}

          {isEditing && (
            <>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleSave}
                className="h-6 w-6 p-0 text-green-600 hover:text-green-700"
              >
                <Check className="h-3 w-3" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleCancel}
                className="h-6 w-6 p-0 text-red-600 hover:text-red-700"
              >
                <X className="h-3 w-3" />
              </Button>
            </>
          )}
        </div>
      </div>

      {/* Content */}
      <div className={isEditing ? 'opacity-75' : ''}>
        {children}
      </div>
    </div>
  );
}