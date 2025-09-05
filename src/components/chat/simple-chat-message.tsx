import ReactMarkdown from 'react-markdown';
import { ChatMessage as ChatMessageType } from '@/types';

interface SimpleChatMessageProps {
  message: ChatMessageType;
}

export function SimpleChatMessage({ message }: SimpleChatMessageProps) {
  const isUser = message.role === 'user';
  const timestamp = new Date(message.created_at);
  const hasAttachments = message.attachments && message.attachments.length > 0;

  return (
    <div className={`flex ${isUser ? 'justify-end' : 'justify-start'} mb-4`}>
      <div
        className={`max-w-[80%] rounded-2xl px-4 py-3 ${
          isUser
            ? 'bg-primary text-black'
            : 'bg-card-2 text-text border border-line'
        }`}
      >
        {/* Message content */}
        <div className="text-base leading-7">
          {isUser ? (
            <div className="whitespace-pre-wrap">{message.content}</div>
          ) : (
            <ReactMarkdown className="prose prose-sm max-w-none dark:prose-invert">
              {message.content}
            </ReactMarkdown>
          )}
        </div>

        {/* Attachments */}
        {hasAttachments && (
          <div className="mt-3 pt-3 border-t border-line/50">
            <div className="text-sm text-muted-foreground mb-2">
              Attachments:
            </div>
            {message.attachments!.map(attachment => (
              <div
                key={attachment.id}
                className="flex items-center gap-2 text-sm text-muted-foreground"
              >
                <span>📎</span>
                <span>{attachment.name}</span>
                <span className="text-xs">
                  ({(attachment.size / 1024).toFixed(1)} KB)
                </span>
              </div>
            ))}
          </div>
        )}

        {/* Timestamp */}
        <div className="text-xs text-muted-foreground mt-2">
          {timestamp.toLocaleTimeString([], {
            hour: '2-digit',
            minute: '2-digit',
          })}
        </div>
      </div>
    </div>
  );
}
