'use client';

import { useState, useRef } from 'react';

interface SimpleTileProps {
  label: string;
  value: any;
  onSave: (value: any) => Promise<void>;
  fieldType?: 'text' | 'number';
  placeholder?: string;
  icon?: string;
  unit?: string;
  source?: string;
  confidence?: number;
  className?: string;
}

export function SimpleTile({
  label,
  value,
  onSave,
  fieldType = 'text',
  placeholder = 'Click to edit',
  icon,
  unit,
  source,
  confidence,
}: SimpleTileProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState(value);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleSave = async () => {
    try {
      const parsedValue =
        fieldType === 'number' ? parseFloat(editValue) || 0 : editValue;
      await onSave(parsedValue);
      setIsEditing(false);
    } catch (error) {
      console.error('Failed to save:', error);
      setEditValue(value);
      setIsEditing(false);
    }
  };

  const handleCancel = () => {
    setEditValue(value);
    setIsEditing(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleSave();
    } else if (e.key === 'Escape') {
      e.preventDefault();
      handleCancel();
    }
  };

  const formatValue = (val: any) => {
    if (val === null || val === undefined) return '—';

    // Handle nested objects (like the corrupted sleep_quality data)
    if (typeof val === 'object' && val !== null) {
      if (val.value !== undefined) {
        return formatValue(val.value);
      }
      return JSON.stringify(val);
    }

    if (typeof val === 'number') return val.toString();
    if (typeof val === 'string') return val;
    if (typeof val === 'boolean') return val ? 'Yes' : 'No';
    return JSON.stringify(val);
  };

  return (
    <div className="min-h-[120px] flex flex-col bg-card/60 backdrop-blur-sm border border-line/40 rounded-lg p-4 hover:bg-card/80 transition-colors">
      {/* Header */}
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          {icon && <span className="text-sm">{icon}</span>}
          <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
            {label}
          </span>
        </div>
        <div className="flex items-center gap-1">
          {source && (
            <span className="text-xs px-2 py-1 rounded-full bg-primary/20 text-primary-foreground">
              {source}
            </span>
          )}
          {confidence && (
            <span className="text-xs px-2 py-1 rounded-full bg-muted text-muted-foreground">
              {Math.round(confidence * 100)}%
            </span>
          )}
        </div>
      </div>

      {/* Value */}
      <div className="flex-1 flex items-start min-h-[2rem]">
        {isEditing ? (
          <div className="relative w-full">
            <input
              ref={inputRef}
              type={fieldType === 'number' ? 'number' : 'text'}
              value={editValue}
              onChange={e => setEditValue(e.target.value)}
              onBlur={handleSave}
              onKeyDown={handleKeyDown}
              placeholder={placeholder}
              className="w-full bg-transparent border-none outline-none text-sm font-medium"
              style={{
                fontSize: '14px',
                lineHeight: '1.4',
                padding: '4px 0',
                boxSizing: 'border-box',
                overflow: 'visible',
                textOverflow: 'clip',
                wordBreak: 'break-word',
                whiteSpace: 'normal',
                overflowWrap: 'break-word',
              }}
            />
          </div>
        ) : (
          <div
            className="text-sm font-medium break-words leading-tight w-full cursor-pointer hover:text-primary transition-colors"
            onClick={() => setIsEditing(true)}
            style={{
              fontSize: '14px',
              lineHeight: '1.4',
              wordBreak: 'break-word',
              whiteSpace: 'normal',
              overflowWrap: 'break-word',
            }}
          >
            {formatValue(value)}
          </div>
        )}
      </div>

      {/* Footer */}
      {unit && (
        <div className="flex-shrink-0 mt-1">
          <span className="text-xs text-muted-foreground">{unit}</span>
        </div>
      )}
    </div>
  );
}
