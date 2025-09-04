import { memo, useCallback } from 'react';
import { FilePreviewList } from './file-preview-chip';
import { FileAttachment } from '@/types';

interface IsolatedFileManagerProps {
  files: FileAttachment[];
  onRemoveFile: (fileId: string) => void;
}

// Completely isolated file manager to prevent affecting input performance
export const IsolatedFileManager = memo(
  function IsolatedFileManager({
    files,
    onRemoveFile,
  }: IsolatedFileManagerProps) {
    const handleRemove = useCallback(
      (fileId: string) => {
        onRemoveFile(fileId);
      },
      [onRemoveFile]
    );

    if (files.length === 0) return null;

    return (
      <div className="mb-3 p-3 bg-primary/10 border border-primary/30 rounded-lg">
        <div className="flex items-center justify-between mb-2">
          <p className="text-sm font-medium">
            {files.length} file{files.length > 1 ? 's' : ''} attached
          </p>
          <p className="text-xs text-muted">
            Add context and click Send to process
          </p>
        </div>
        <FilePreviewList files={files} onRemoveFile={handleRemove} />
      </div>
    );
  },
  (prevProps, nextProps) => {
    // Custom comparison to minimize re-renders
    if (prevProps.files.length !== nextProps.files.length) return false;

    // Check if any file status changed
    for (let i = 0; i < prevProps.files.length; i++) {
      const prev = prevProps.files[i];
      const next = nextProps.files[i];
      if (prev.id !== next.id || prev.uploadStatus !== next.uploadStatus) {
        return false;
      }
    }

    return true;
  }
);
