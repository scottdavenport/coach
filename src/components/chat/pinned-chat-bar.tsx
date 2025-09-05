'use client';

import { useState, useRef, useCallback } from 'react';
import { Mic, Send, Plus, MessageSquare, Upload } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useChat } from '@/components/providers/chat-provider';
import { FilePreviewList } from './file-preview-chip';
import { OptimizedInput } from './optimized-input';
import { IsolatedFileManager } from './isolated-file-manager';
import { useFileManager } from '@/hooks/use-file-manager';
import { FileAttachment, SupportedFileType, ChatMessage } from '@/types';
import { processFileContentClient } from '@/lib/file-processing/client';

interface PinnedChatBarProps {
  userId: string;
}

export function PinnedChatBar({ userId }: PinnedChatBarProps) {
  const {
    inputValue,
    setInputValue,
    isLoading,
    isChatExpanded,
    toggleChat,
    expandChat,
    addMessage,
    setIsLoading,
    currentPageContext,
  } = useChat();

  const [isUploadMenuOpen, setIsUploadMenuOpen] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const uploadMenuRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const fileManager = useFileManager(userId);

  // Handle file upload
  const handleFileUpload = useCallback(
    async (files: File[]) => {
      if (files.length === 0) return;

      const supportedTypes: SupportedFileType[] = [
        'image/jpeg',
        'image/png',
        'image/gif',
        'image/webp',
        'application/pdf',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'application/msword',
        'text/plain',
        'text/csv',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      ];
      const attachments: FileAttachment[] = [];

      for (const file of files) {
        if (file.size > 10 * 1024 * 1024) {
          alert(`File ${file.name} is too large. Maximum size is 10MB.`);
          continue;
        }

        if (!supportedTypes.includes(file.type as SupportedFileType)) {
          alert(`File type ${file.type} is not supported.`);
          continue;
        }

        attachments.push({
          id: Math.random().toString(36).substr(2, 9),
          fileName: file.name,
          fileSize: file.size,
          fileType: file.type as SupportedFileType,
          file: file,
          uploadStatus: 'pending' as const,
        });
      }

      if (attachments.length > 0) {
        await fileManager.addFiles(attachments);
      }
    },
    [fileManager]
  );

  // Handle drag and drop
  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(false);

      const files = Array.from(e.dataTransfer.files);
      handleFileUpload(files);
    },
    [handleFileUpload]
  );

  // Handle send message
  const handleSendMessage = useCallback(async () => {
    if (!inputValue.trim() && fileManager.files.length === 0) return;

    const messageText = inputValue.trim();
    setInputValue('');
    setIsLoading(true);

    try {
      // Create user message
      const userMessage: ChatMessage = {
        id: Math.random().toString(36).substr(2, 9),
        content: messageText,
        role: 'user' as const,
        created_at: new Date().toISOString(),
        attachments: fileManager.files.map(f => ({
          id: f.id,
          name: f.fileName,
          type: f.fileType,
          size: f.fileSize,
        })),
      };

      addMessage(userMessage);
      expandChat(); // Auto-expand chat when sending message

      // Process files if any
      if (fileManager.files.length > 0) {
        const processedFiles = await Promise.all(
          fileManager.files.map(async file => {
            try {
              const content = await processFileContentClient(file.file);
              return {
                ...file,
                content,
                status: 'processed' as const,
              };
            } catch (error) {
              console.error('Error processing file:', error);
              return {
                ...file,
                status: 'error' as const,
                error: 'Failed to process file',
              };
            }
          })
        );

        // Files are processed, we can clear them after sending
      }

      // Send to API
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: messageText,
          attachments: fileManager.files,
          pageContext: currentPageContext,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to send message');
      }

      const data = await response.json();

      // Add assistant response
      if (data.response) {
        const assistantMessage: ChatMessage = {
          id: Math.random().toString(36).substr(2, 9),
          content: data.response,
          role: 'assistant' as const,
          created_at: new Date().toISOString(),
        };
        addMessage(assistantMessage);
      }

      // Clear files after successful send
      fileManager.clearFiles();
    } catch (error) {
      console.error('Error sending message:', error);
      // Add error message
      const errorMessage: ChatMessage = {
        id: Math.random().toString(36).substr(2, 9),
        content: 'Sorry, I encountered an error. Please try again.',
        role: 'assistant' as const,
        created_at: new Date().toISOString(),
      };
      addMessage(errorMessage);
    } finally {
      setIsLoading(false);
    }
  }, [
    inputValue,
    fileManager,
    addMessage,
    expandChat,
    currentPageContext,
    setIsLoading,
  ]);

  // Handle key press
  const handleKeyPress = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        handleSendMessage();
      }
    },
    [handleSendMessage]
  );

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 bg-background border-t border-line">
      {/* Drag and drop overlay */}
      {isDragging && (
        <div
          className="absolute inset-0 bg-primary/10 border-2 border-dashed border-primary flex items-center justify-center z-10"
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
        >
          <div className="text-center">
            <p className="text-primary font-medium">
              Drop files here to upload
            </p>
          </div>
        </div>
      )}

      {/* File previews */}
      {fileManager.files.length > 0 && (
        <div className="px-4 py-2 border-b border-line">
          <FilePreviewList
            files={fileManager.files}
            onRemoveFile={fileManager.removeFile}
          />
        </div>
      )}

      {/* Main input bar */}
      <div
        className="flex items-center gap-2 p-4"
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        {/* Chat toggle button */}
        <Button
          variant="ghost"
          size="icon"
          onClick={toggleChat}
          className="h-10 w-10 flex-shrink-0"
          title={isChatExpanded ? 'Collapse chat' : 'Expand chat'}
        >
          <MessageSquare className="h-5 w-5" />
        </Button>

        {/* Upload button */}
        <div className="relative" ref={uploadMenuRef}>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setIsUploadMenuOpen(!isUploadMenuOpen)}
            className="h-10 w-10 flex-shrink-0"
            title="Upload files"
          >
            <Plus className="h-5 w-5" />
          </Button>

          {isUploadMenuOpen && (
            <div className="absolute bottom-full left-0 mb-2 bg-card border border-line rounded-xl shadow-card2 p-2 min-w-[220px]">
              <div className="space-y-1">
                <div className="px-3 py-1 text-xs font-medium text-muted border-b border-line">
                  Upload Files
                </div>
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="w-full flex items-center gap-2 px-3 py-2 text-sm hover:bg-card-2 rounded-lg transition-colors"
                >
                  <Upload className="h-4 w-4" />
                  Choose Files
                </button>
                <button
                  onClick={() => setIsUploadMenuOpen(false)}
                  className="w-full flex items-center gap-2 px-3 py-2 text-sm hover:bg-card-2 rounded-lg transition-colors"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Text input */}
        <div className="flex-1">
          <OptimizedInput
            value={inputValue}
            onChange={setInputValue}
            onKeyPress={handleKeyPress}
            placeholder={`Ask anything... (on ${currentPageContext})`}
            disabled={isLoading}
            hasFiles={fileManager.files.length > 0}
          />
        </div>

        {/* Voice input button */}
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setIsRecording(!isRecording)}
          className={`h-10 w-10 flex-shrink-0 ${isRecording ? 'text-red-500' : ''}`}
          title="Voice input"
        >
          <Mic className="h-5 w-5" />
        </Button>

        {/* Send button */}
        <Button
          onClick={handleSendMessage}
          disabled={
            (!inputValue.trim() && fileManager.files.length === 0) || isLoading
          }
          className="h-10 w-10 flex-shrink-0"
          title="Send message"
        >
          <Send className="h-5 w-5" />
        </Button>
      </div>

      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        multiple
        accept="image/*,.pdf,.doc,.docx,.txt,.csv,.xlsx,.xls"
        onChange={e => {
          if (e.target.files) {
            handleFileUpload(Array.from(e.target.files));
          }
        }}
        className="hidden"
      />
    </div>
  );
}
