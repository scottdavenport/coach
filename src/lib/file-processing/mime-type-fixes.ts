// Temporary MIME type fixes for Supabase Storage compatibility

export function getCompatibleMimeType(file: File): string {
  const originalType = file.type;
  const fileName = file.name.toLowerCase();

  // Handle cases where browser might not set correct MIME type
  if (!originalType || originalType === 'application/octet-stream') {
    if (fileName.endsWith('.csv')) return 'text/csv';
    if (fileName.endsWith('.txt')) return 'text/plain';
    if (fileName.endsWith('.md')) return 'text/markdown';
    if (fileName.endsWith('.pdf')) return 'application/pdf';
    if (fileName.endsWith('.docx')) return 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
    if (fileName.endsWith('.doc')) return 'application/msword';
    if (fileName.endsWith('.xlsx')) return 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
    if (fileName.endsWith('.pptx')) return 'application/vnd.openxmlformats-officedocument.presentationml.presentation';
  }

  // Handle edge cases for CSV files
  if (originalType === 'text/csv' || originalType === 'application/csv') {
    return 'text/csv';
  }

  // Handle Excel files that might have wrong MIME type
  if (fileName.endsWith('.xlsx') && originalType !== 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet') {
    return 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
  }

  return originalType;
}

export function createFileWithCorrectType(file: File): File {
  const correctMimeType = getCompatibleMimeType(file);
  
  if (correctMimeType === file.type) {
    return file; // No change needed
  }

  // Create new File object with correct MIME type
  return new File([file], file.name, {
    type: correctMimeType,
    lastModified: file.lastModified
  });
}

// Fallback MIME types that should work with most Supabase configurations
export const FALLBACK_MIME_TYPES: Record<string, string> = {
  'text/csv': 'text/plain', // Fallback CSV as plain text
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': 'application/octet-stream',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': 'application/octet-stream',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation': 'application/octet-stream'
};

export function getFallbackMimeType(mimeType: string): string {
  return FALLBACK_MIME_TYPES[mimeType] || mimeType;
}