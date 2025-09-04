import { useState, useCallback, useRef } from 'react';
import { FileAttachment, SupportedFileType } from '@/types';
import { FileProcessor } from '@/lib/file-processing';
import {
  createFileWithCorrectType,
  getFallbackMimeType,
} from '@/lib/file-processing/mime-type-fixes';
import { createClient } from '@/lib/supabase/client';

export function useFileManager(userId: string) {
  const [files, setFiles] = useState<FileAttachment[]>([]);
  const uploadQueueRef = useRef<Set<string>>(new Set());

  const addFiles = useCallback(
    async (newFiles: File[]) => {
      const existingCount = files.length;
      const totalCount = existingCount + newFiles.length;

      if (totalCount > 10) {
        throw new Error(
          `Too many files: ${totalCount} total. Maximum is 10 files.`
        );
      }

      const validationResult = FileProcessor.validateFileList(newFiles);
      if (!validationResult.isValid) {
        throw new Error(validationResult.error);
      }

      const newAttachments: FileAttachment[] = newFiles.map(file => ({
        id: `${Date.now()}-${Math.random().toString(36).substring(2)}`,
        file,
        fileName: file.name,
        fileSize: file.size,
        fileType: file.type as SupportedFileType,
        uploadStatus: 'pending',
      }));

      // Add files immediately to state
      setFiles(prev => [...prev, ...newAttachments]);

      // Start background uploads
      uploadFilesInBackground(newAttachments);
    },
    [files.length, userId]
  );

  const uploadFilesInBackground = useCallback(
    async (attachments: FileAttachment[]) => {
      const supabase = createClient();

      for (const attachment of attachments) {
        // Skip if already being processed
        if (uploadQueueRef.current.has(attachment.id)) continue;
        uploadQueueRef.current.add(attachment.id);

        try {
          // Update to uploading status (minimal re-render)
          setFiles(prev =>
            prev.map(file =>
              file.id === attachment.id
                ? { ...file, uploadStatus: 'uploading' }
                : file
            )
          );

          const fileExt = attachment.file.name.split('.').pop();
          const fileName = `${Date.now()}-${Math.random().toString(36).substring(2)}.${fileExt}`;
          const filePath = `${userId}/uploads/${fileName}`;

          const correctedFile = createFileWithCorrectType(attachment.file);
          let uploadError = null;

          const { error } = await supabase.storage
            .from('user-uploads')
            .upload(filePath, correctedFile, {
              cacheControl: '3600',
              upsert: false,
            });

          uploadError = error;

          // Try fallback if needed
          if (uploadError?.message?.includes('mime type')) {
            const fallbackType = getFallbackMimeType(correctedFile.type);
            const fallbackFile = new File([correctedFile], correctedFile.name, {
              type: fallbackType,
              lastModified: correctedFile.lastModified,
            });

            const { error: fallbackError } = await supabase.storage
              .from('user-uploads')
              .upload(filePath, fallbackFile, {
                cacheControl: '3600',
                upsert: false,
              });

            uploadError = fallbackError;
          }

          if (uploadError) {
            setFiles(prev =>
              prev.map(file =>
                file.id === attachment.id
                  ? {
                      ...file,
                      uploadStatus: 'error',
                      errorMessage: 'Upload failed',
                    }
                  : file
              )
            );
            continue;
          }

          // Get signed URL
          const {
            data: { signedUrl },
          } = await supabase.storage
            .from('user-uploads')
            .createSignedUrl(filePath, 3600);

          if (!signedUrl) {
            throw new Error('Failed to create signed URL');
          }

          // Update with success
          setFiles(prev =>
            prev.map(file =>
              file.id === attachment.id
                ? { ...file, uploadStatus: 'uploaded', fileUrl: signedUrl }
                : file
            )
          );
        } catch (error) {
          console.error('File upload error:', error);
          setFiles(prev =>
            prev.map(file =>
              file.id === attachment.id
                ? {
                    ...file,
                    uploadStatus: 'error',
                    errorMessage: 'Upload failed',
                  }
                : file
            )
          );
        } finally {
          uploadQueueRef.current.delete(attachment.id);
        }
      }
    },
    [userId]
  );

  const removeFile = useCallback((fileId: string) => {
    setFiles(prev => prev.filter(file => file.id !== fileId));
    uploadQueueRef.current.delete(fileId);
  }, []);

  const clearFiles = useCallback(() => {
    setFiles([]);
    uploadQueueRef.current.clear();
  }, []);

  return {
    files,
    addFiles,
    removeFile,
    clearFiles,
  };
}
