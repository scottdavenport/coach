import { useState, useCallback } from 'react';
import { Mic, Send, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface EmergencyChatInputProps {
  onSendMessage: (message: string) => void;
  onFileUpload: () => void;
  disabled?: boolean;
  isLoading?: boolean;
  fileCount?: number;
}

// Emergency input component with minimal dependencies to fix typing lag
export function EmergencyChatInput({ 
  onSendMessage, 
  onFileUpload, 
  disabled = false, 
  isLoading = false,
  fileCount = 0 
}: EmergencyChatInputProps) {
  const [value, setValue] = useState('');

  const handleChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setValue(e.target.value);
  }, []);

  const handleKeyPress = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  }, []);

  const handleSend = useCallback(() => {
    if (!value.trim() || disabled || isLoading) return;
    onSendMessage(value);
    setValue('');
  }, [value, disabled, isLoading, onSendMessage]);

  return (
    <div className="border-t border-line p-4 bg-background">
      <div className="max-w-4xl mx-auto">
        {fileCount > 0 && (
          <div className="mb-3 p-2 bg-primary/10 border border-primary/30 rounded-lg">
            <p className="text-sm text-center">
              {fileCount} file{fileCount > 1 ? 's' : ''} attached (files managed separately)
            </p>
          </div>
        )}
        
        <div className="flex items-center space-x-3">
          {/* Attachment Button */}
          <Button
            variant="ghost"
            size="sm"
            onClick={onFileUpload}
            className="p-2 text-muted hover:text-text"
            disabled={disabled}
          >
            <Plus className="h-4 w-4" />
          </Button>

          {/* Text Input */}
          <div className="flex-1">
            <textarea
              value={value}
              onChange={handleChange}
              onKeyPress={handleKeyPress}
              placeholder="Type your message..."
              className="w-full bg-card border border-line rounded-xl px-4 py-3 text-text placeholder:text-muted resize-none focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary/30"
              rows={1}
              style={{ minHeight: '44px', maxHeight: '120px' }}
              disabled={disabled || isLoading}
            />
          </div>

          {/* Send Button */}
          <Button
            onClick={handleSend}
            disabled={!value.trim() || disabled || isLoading}
            className="bg-primary text-black hover:bg-primary/90 disabled:opacity-50"
            size="sm"
          >
            <Send className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}