import ReactMarkdown from 'react-markdown';
import Image from 'next/image';
import { ChatMessage as ChatMessageType } from '@/types';

interface ChatMessageProps {
  message: ChatMessageType;
}

export function ChatMessage({ message }: ChatMessageProps) {
  const isUser = message.role === 'user';

  // Handle uploading state
  if (message.isUploading) {
    return (
      <div className="flex justify-end">
        <div className="max-w-[80%] rounded-2xl px-4 py-3 bg-primary/20 border border-primary/30">
          <div className="flex items-center space-x-2">
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary"></div>
            <span className="text-sm text-muted">{message.content}</span>
          </div>
        </div>
      </div>
    );
  }

  // Handle file message with context
  if (message.hasFile) {
    const lines = message.content.split('\n');
    const fileName =
      lines[0]?.replace('📎 File: ', '') || message.fileName || 'Unknown file';
    const context = lines[2]?.replace('Context: ', '') || 'No context provided';
    const fileUrl = message.fileUrl || lines[4]?.replace('File URL: ', '');

    // Don't show context if it's just the user's input text - that's redundant
    const shouldShowContext =
      context &&
      context !== 'No context provided' &&
      !context.includes('Here is my') &&
      !context.includes('Here are my') &&
      context.length > 20; // Only show substantial context

    return (
      <div className="flex justify-end">
        <div className="max-w-[80%] rounded-2xl px-4 py-3 bg-primary text-black">
          <div className="text-base leading-7">
            {/* Display image thumbnail if it's an image file */}
            {fileUrl &&
              (fileName.toLowerCase().includes('.jpg') ||
                fileName.toLowerCase().includes('.jpeg') ||
                fileName.toLowerCase().includes('.png') ||
                fileName.toLowerCase().includes('.gif') ||
                fileName.toLowerCase().includes('.webp')) && (
                <div className="mb-3">
                  <Image
                    src={fileUrl}
                    alt="Uploaded image"
                    width={500}
                    height={384}
                    className="max-w-full max-h-96 rounded-lg border border-black/20 object-contain"
                  />
                </div>
              )}

            {/* Display file icon for non-image files */}
            {fileUrl &&
              !(
                fileName.toLowerCase().includes('.jpg') ||
                fileName.toLowerCase().includes('.jpeg') ||
                fileName.toLowerCase().includes('.png') ||
                fileName.toLowerCase().includes('.gif') ||
                fileName.toLowerCase().includes('.webp')
              ) && (
                <div className="mb-3 flex items-center justify-center p-4 bg-black/10 rounded-lg">
                  <span className="text-4xl">📄</span>
                </div>
              )}

            {shouldShowContext && (
              <div className="bg-black/10 p-2 rounded-lg text-base">
                {context}
              </div>
            )}
          </div>
          <p className="text-xs mt-2 text-black/60">
            {message.timestamp.toLocaleTimeString([], {
              hour: '2-digit',
              minute: '2-digit',
            })}
          </p>
        </div>
      </div>
    );
  }

  // Handle OCR result - Now conversational
  if (message.isOcrResult) {
    return (
      <div className="flex justify-start">
        <div className="max-w-[90%] rounded-2xl px-4 py-3 bg-card border border-line text-text">
          <div className="text-base leading-7 font-normal prose prose-base prose-invert max-w-none">
            <ReactMarkdown
              components={{
                p: ({ children }) => (
                  <p className="mb-3 last:mb-0 text-text">{children}</p>
                ),
                strong: ({ children }) => (
                  <strong className="font-semibold text-white">
                    {children}
                  </strong>
                ),
                em: ({ children }) => <em className="italic">{children}</em>,
                ul: ({ children }) => (
                  <ul className="list-disc list-inside space-y-2 mb-3 text-text">
                    {children}
                  </ul>
                ),
                ol: ({ children }) => (
                  <ol className="list-decimal list-inside space-y-2 mb-3 text-text">
                    {children}
                  </ol>
                ),
                li: ({ children }) => <li className="text-base">{children}</li>,
              }}
            >
              {message.content}
            </ReactMarkdown>
          </div>
          <p className="text-xs mt-2 text-muted">
            {message.timestamp.toLocaleTimeString([], {
              hour: '2-digit',
              minute: '2-digit',
            })}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}>
      <div
        className={`max-w-[80%] rounded-2xl px-4 py-3 ${
          isUser
            ? 'bg-primary text-black'
            : 'bg-card border border-line text-text'
        }`}
      >
        <div className="text-base leading-7 font-normal prose prose-base prose-invert max-w-none">
          <ReactMarkdown
            components={{
              // Customize markdown components for better styling
              p: ({ children }) => (
                <p className="mb-3 last:mb-0 text-white">{children}</p>
              ),
              strong: ({ children }) => (
                <strong className="font-semibold text-white">{children}</strong>
              ),
              em: ({ children }) => (
                <em className="italic text-white">{children}</em>
              ),
              ul: ({ children }) => (
                <ul className="list-disc list-inside space-y-2 mb-3 text-white">
                  {children}
                </ul>
              ),
              ol: ({ children }) => (
                <ol className="list-decimal list-inside space-y-2 mb-3 text-white">
                  {children}
                </ol>
              ),
              li: ({ children }) => (
                <li className="text-base text-white">{children}</li>
              ),
              h1: ({ children }) => (
                <h1 className="text-lg font-bold mb-3 text-white">
                  {children}
                </h1>
              ),
              h2: ({ children }) => (
                <h2 className="text-base font-semibold mb-3 text-white">
                  {children}
                </h2>
              ),
              h3: ({ children }) => (
                <h3 className="text-sm font-semibold mb-2 text-white">
                  {children}
                </h3>
              ),
              blockquote: ({ children }) => (
                <blockquote className="border-l-4 border-white/30 pl-3 italic text-white">
                  {children}
                </blockquote>
              ),
              code: ({ children }) => (
                <code className="bg-white/20 px-1 py-0.5 rounded text-xs font-mono text-white">
                  {children}
                </code>
              ),
              pre: ({ children }) => (
                <pre className="bg-white/10 p-2 rounded text-xs overflow-x-auto text-white">
                  {children}
                </pre>
              ),
            }}
          >
            {message.content}
          </ReactMarkdown>
        </div>
        <p
          className={`text-xs mt-2 ${isUser ? 'text-black/60' : 'text-muted'}`}
        >
          {message.timestamp.toLocaleTimeString([], {
            hour: '2-digit',
            minute: '2-digit',
          })}
        </p>
      </div>
    </div>
  );
}
