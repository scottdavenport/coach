import { X, Loader2 } from 'lucide-react';
import { FileAttachment } from '@/types';
import { FileProcessor } from '@/lib/file-processing';

interface FilePreviewChipProps {
  file: FileAttachment;
  onRemove: () => void;
  className?: string;
}

export function FilePreviewChip({ file, onRemove, className = '' }: FilePreviewChipProps) {
  const icon = FileProcessor.getFileIcon(file.fileType);
  const formattedSize = FileProcessor.formatFileSize(file.fileSize);

  const getStatusColor = () => {
    switch (file.uploadStatus) {
      case 'uploaded': return 'bg-green-50 border-green-200 text-green-800';
      case 'uploading': return 'bg-blue-50 border-blue-200 text-blue-800';
      case 'error': return 'bg-red-50 border-red-200 text-red-800';
      default: return 'bg-gray-50 border-gray-200 text-gray-800';
    }
  };

  const getStatusIcon = () => {
    if (file.uploadStatus === 'uploading') {
      return <Loader2 className="h-3 w-3 animate-spin" />;
    }
    return null;
  };

  return (
    <div className={`inline-flex items-center gap-2 px-3 py-2 rounded-lg border ${getStatusColor()} ${className}`}>
      {/* File icon */}
      <span className="text-sm">{icon}</span>
      
      {/* File info */}
      <div className="flex flex-col min-w-0">
        <span className="text-sm font-medium truncate max-w-[150px]" title={file.fileName}>
          {file.fileName}
        </span>
        <span className="text-xs opacity-70">
          {formattedSize}
          {file.uploadStatus === 'uploading' && ' • Uploading...'}
          {file.uploadStatus === 'error' && ` • ${file.errorMessage || 'Error'}`}
        </span>
      </div>

      {/* Status icon */}
      {getStatusIcon()}

      {/* Remove button */}
      <button
        onClick={onRemove}
        className="ml-1 p-0.5 rounded-full hover:bg-black/10 transition-colors"
        disabled={file.uploadStatus === 'uploading'}
        title="Remove file"
      >
        <X className="h-3 w-3" />
      </button>
    </div>
  );
}

interface FilePreviewListProps {
  files: FileAttachment[];
  onRemoveFile: (fileId: string) => void;
  className?: string;
}

export function FilePreviewList({ files, onRemoveFile, className = '' }: FilePreviewListProps) {
  if (files.length === 0) return null;

  return (
    <div className={`flex flex-wrap gap-2 ${className}`}>
      {files.map((file) => (
        <FilePreviewChip
          key={file.id}
          file={file}
          onRemove={() => onRemoveFile(file.id)}
        />
      ))}
    </div>
  );
}