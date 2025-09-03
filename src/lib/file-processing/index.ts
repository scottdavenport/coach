import { SupportedFileType } from '@/types';

// File processing utilities for different document types
export class FileProcessor {
  private static readonly MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
  private static readonly MAX_FILES = 10;

  static getSupportedFileTypes(): SupportedFileType[] {
    return [
      'image/jpeg',
      'image/png', 
      'image/gif',
      'image/webp',
      'application/pdf',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/msword',
      'text/plain',
      'text/markdown',
      'text/csv',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'application/vnd.oasis.opendocument.spreadsheet',
      'application/vnd.openxmlformats-officedocument.presentationml.presentation'
    ];
  }

  static getFileTypeCategory(mimeType: string): 'image' | 'document' | 'unknown' {
    if (mimeType.startsWith('image/')) return 'image';
    if (this.getSupportedFileTypes().includes(mimeType as SupportedFileType)) return 'document';
    return 'unknown';
  }

  static getFileIcon(mimeType: string): string {
    const typeMap: Record<string, string> = {
      'application/pdf': '📄',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document': '📝',
      'application/msword': '📝',
      'text/plain': '📄',
      'text/markdown': '📝',
      'text/csv': '📊',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': '📊',
      'application/vnd.oasis.opendocument.spreadsheet': '📊',
      'application/vnd.openxmlformats-officedocument.presentationml.presentation': '📊',
      'image/jpeg': '🖼️',
      'image/png': '🖼️',
      'image/gif': '🖼️',
      'image/webp': '🖼️'
    };
    return typeMap[mimeType] || '📎';
  }

  static validateFile(file: File): { isValid: boolean; error?: string } {
    // Check file size
    if (file.size > this.MAX_FILE_SIZE) {
      return {
        isValid: false,
        error: `File too large: ${(file.size / 1024 / 1024).toFixed(1)}MB. Maximum size is 10MB.`
      };
    }

    // Check file type
    const supportedTypes = this.getSupportedFileTypes();
    if (!supportedTypes.includes(file.type as SupportedFileType)) {
      return {
        isValid: false,
        error: `Unsupported file type: ${file.type}. Please upload images, PDFs, Word docs, spreadsheets, or text files.`
      };
    }

    return { isValid: true };
  }

  static validateFileList(files: File[]): { isValid: boolean; error?: string } {
    // Check total count
    if (files.length > this.MAX_FILES) {
      return {
        isValid: false,
        error: `Too many files: ${files.length}. Maximum is ${this.MAX_FILES} files.`
      };
    }

    // Check each file
    for (const file of files) {
      const validation = this.validateFile(file);
      if (!validation.isValid) {
        return validation;
      }
    }

    return { isValid: true };
  }

  static formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  static getAcceptString(): string {
    return [
      'image/*',
      '.pdf',
      '.doc',
      '.docx', 
      '.txt',
      '.md',
      '.csv',
      '.xlsx',
      '.ods',
      '.pptx'
    ].join(',');
  }
}

// Note: Server-side file processing functions have been moved to API routes
// to avoid webpack issues with Node.js modules in client-side code