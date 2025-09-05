import React from 'react';
import { render, screen } from '@testing-library/react';
import { ChatMessage } from '@/components/chat/chat-message';

// Mock Next.js Image component
jest.mock('next/image', () => {
  return function MockImage({ src, alt, ...props }: any) {
    return <img src={src} alt={alt} {...props} />;
  };
});

// Mock ReactMarkdown
jest.mock('react-markdown', () => {
  return function MockReactMarkdown({ children }: any) {
    return <div data-testid="markdown-content">{children}</div>;
  };
});

describe('ChatMessage', () => {
  const baseMessage = {
    id: 1,
    content: 'Test message content',
    role: 'user' as const,
    timestamp: new Date('2023-01-01T00:00:00Z'),
  };

  it('should render user message correctly', () => {
    render(<ChatMessage message={baseMessage} />);
    
    expect(screen.getByText('Test message content')).toBeInTheDocument();
    expect(screen.getByText('Test message content')).toHaveClass('text-black');
  });

  it('should render assistant message correctly', () => {
    const assistantMessage = { ...baseMessage, role: 'assistant' as const };
    render(<ChatMessage message={assistantMessage} />);
    
    expect(screen.getByText('Test message content')).toBeInTheDocument();
    expect(screen.getByText('Test message content')).toHaveClass('text-white');
  });

  it('should render uploading state correctly', () => {
    const uploadingMessage = { 
      ...baseMessage, 
      isUploading: true,
      content: 'Uploading file...'
    };
    render(<ChatMessage message={uploadingMessage} />);
    
    expect(screen.getByText('Uploading file...')).toBeInTheDocument();
    expect(screen.getByText('Uploading file...')).toHaveClass('text-muted');
    
    // Check for loading spinner
    const spinner = screen.getByRole('status', { hidden: true });
    expect(spinner).toHaveClass('animate-spin');
  });

  it('should render file message with context correctly', () => {
    const fileMessage = {
      ...baseMessage,
      hasFile: true,
      content: '📎 File: test.pdf\n\nContext: This is a test document\n\nFile URL: https://example.com/test.pdf',
      fileName: 'test.pdf',
      fileUrl: 'https://example.com/test.pdf'
    };
    render(<ChatMessage message={fileMessage} />);
    
    expect(screen.getByText('📎 test.pdf')).toBeInTheDocument();
    expect(screen.getByText('This is a test document')).toBeInTheDocument();
    expect(screen.getByText('View File')).toBeInTheDocument();
  });

  it('should not show context for short or redundant content', () => {
    const fileMessage = {
      ...baseMessage,
      hasFile: true,
      content: '📎 File: test.pdf\n\nContext: Here is my document\n\nFile URL: https://example.com/test.pdf',
      fileName: 'test.pdf',
      fileUrl: 'https://example.com/test.pdf'
    };
    render(<ChatMessage message={fileMessage} />);
    
    expect(screen.getByText('📎 test.pdf')).toBeInTheDocument();
    expect(screen.queryByText('Here is my document')).not.toBeInTheDocument();
  });

  it('should render OCR result message correctly', () => {
    const ocrMessage = {
      ...baseMessage,
      isOcrResult: true,
      content: 'OCR Results:\nSleep Score: 85\nTotal Sleep: 7.5 hours'
    };
    render(<ChatMessage message={ocrMessage} />);
    
    expect(screen.getByText('OCR Results:')).toBeInTheDocument();
    expect(screen.getByText('Sleep Score: 85')).toBeInTheDocument();
    expect(screen.getByText('Total Sleep: 7.5 hours')).toBeInTheDocument();
  });

  it('should render structured data correctly', () => {
    const structuredMessage = {
      ...baseMessage,
      structuredData: {
        type: 'workout',
        data: {
          exercise: 'Running',
          duration: '30 minutes',
          calories: 300
        }
      }
    };
    render(<ChatMessage message={structuredMessage} />);
    
    expect(screen.getByText('Exercise: Running')).toBeInTheDocument();
    expect(screen.getByText('Duration: 30 minutes')).toBeInTheDocument();
    expect(screen.getByText('Calories: 300')).toBeInTheDocument();
  });

  it('should handle message with markdown content', () => {
    const markdownMessage = {
      ...baseMessage,
      content: '# Heading\n\n**Bold text** and *italic text*'
    };
    render(<ChatMessage message={markdownMessage} />);
    
    expect(screen.getByTestId('markdown-content')).toBeInTheDocument();
  });

  it('should render timestamp correctly', () => {
    const messageWithTime = {
      ...baseMessage,
      timestamp: new Date('2023-01-01T12:30:00Z')
    };
    render(<ChatMessage message={messageWithTime} />);
    
    // The timestamp should be rendered (exact format may vary)
    expect(screen.getByText(/12:30/)).toBeInTheDocument();
  });

  it('should handle empty content gracefully', () => {
    const emptyMessage = { ...baseMessage, content: '' };
    render(<ChatMessage message={emptyMessage} />);
    
    // Should not crash and should render empty content
    expect(screen.getByText('')).toBeInTheDocument();
  });

  it('should handle missing file properties gracefully', () => {
    const incompleteFileMessage = {
      ...baseMessage,
      hasFile: true,
      content: '📎 File: \n\nContext: \n\nFile URL: '
    };
    render(<ChatMessage message={incompleteFileMessage} />);
    
    expect(screen.getByText('📎 Unknown file')).toBeInTheDocument();
    expect(screen.queryByText('View File')).not.toBeInTheDocument();
  });

  it('should apply correct CSS classes for user vs assistant messages', () => {
    const { rerender } = render(<ChatMessage message={baseMessage} />);
    
    // User message should have user-specific classes
    const userMessage = screen.getByText('Test message content');
    expect(userMessage.closest('div')).toHaveClass('justify-end');
    
    // Assistant message should have assistant-specific classes
    rerender(<ChatMessage message={{ ...baseMessage, role: 'assistant' }} />);
    const assistantMessage = screen.getByText('Test message content');
    expect(assistantMessage.closest('div')).toHaveClass('justify-start');
  });

  it('should handle complex file message format', () => {
    const complexFileMessage = {
      ...baseMessage,
      hasFile: true,
      content: `📎 File: complex-document.pdf

This is a complex document with multiple sections.

Context: This document contains important health data including sleep patterns, exercise routines, and dietary information. It was generated from a fitness tracker.

File URL: https://example.com/complex-document.pdf`,
      fileName: 'complex-document.pdf',
      fileUrl: 'https://example.com/complex-document.pdf'
    };
    render(<ChatMessage message={complexFileMessage} />);
    
    expect(screen.getByText('📎 complex-document.pdf')).toBeInTheDocument();
    expect(screen.getByText(/This document contains important health data/)).toBeInTheDocument();
    expect(screen.getByText('View File')).toBeInTheDocument();
  });
});
