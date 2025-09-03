// Client-side file processing utilities
import { FileProcessingResult } from '@/types';

export async function processFileContentClient(file: File): Promise<FileProcessingResult> {
  const fileId = `${Date.now()}-${Math.random().toString(36).substring(2)}`;
  
  try {
    const mimeType = file.type;

    if (mimeType.startsWith('image/')) {
      // Images will be processed by OCR function
      return {
        success: true,
        fileId,
        content: 'Image file - will be processed by OCR',
        metadata: {
          requiresOcr: true
        }
      };
    }

    // Handle text files
    if (mimeType === 'text/plain' || mimeType === 'text/markdown') {
      const content = await file.text();
      return {
        success: true,
        fileId,
        content: `Text Document\n\nContent:\n${content}`,
        metadata: {
          wordCount: content.split(/\s+/).length
        }
      };
    }

    // Handle CSV files
    if (mimeType === 'text/csv') {
      const text = await file.text();
      try {
        // Simple CSV parsing for client-side
        const lines = text.split('\n').filter(line => line.trim());
        const headers = lines[0]?.split(',').map(h => h.trim().replace(/"/g, ''));
        const dataRows = lines.slice(1, 11); // Show first 10 rows

        let content = `CSV Data (${lines.length - 1} rows, ${headers?.length || 0} columns)\n\n`;
        if (headers) {
          content += `Headers: ${headers.join(', ')}\n\n`;
          content += `First ${dataRows.length} rows:\n`;
          
          dataRows.forEach((row, index) => {
            const values = row.split(',').map(v => v.trim().replace(/"/g, ''));
            content += `Row ${index + 1}: ${values.join(' | ')}\n`;
          });

          if (lines.length > 11) {
            content += `\n... and ${lines.length - 11} more rows`;
          }
        }

        return {
          success: true,
          fileId,
          content,
          metadata: {
            rowCount: lines.length - 1,
            columnCount: headers?.length || 0
          }
        };
      } catch (error) {
        return {
          success: false,
          fileId,
          error: `Failed to parse CSV: ${error instanceof Error ? error.message : 'Unknown error'}`
        };
      }
    }

    // For other document types, we'll indicate they need server-side processing
    const documentTypes = [
      'application/pdf',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'application/vnd.oasis.opendocument.spreadsheet',
      'application/vnd.openxmlformats-officedocument.presentationml.presentation'
    ];

    if (documentTypes.includes(mimeType)) {
      return {
        success: true,
        fileId,
        content: `Document file (${getFileTypeDisplayName(mimeType)}) - content will be processed`,
        metadata: {
          requiresServerProcessing: true,
          fileType: mimeType
        }
      };
    }

    return {
      success: false,
      fileId,
      error: `Unsupported file type: ${mimeType}`
    };

  } catch (error) {
    return {
      success: false,
      fileId,
      error: error instanceof Error ? error.message : 'Unknown processing error'
    };
  }
}

function getFileTypeDisplayName(mimeType: string): string {
  const typeNames: Record<string, string> = {
    'application/pdf': 'PDF',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document': 'Word Document',
    'application/msword': 'Word Document',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': 'Excel Spreadsheet',
    'application/vnd.oasis.opendocument.spreadsheet': 'OpenDocument Spreadsheet',
    'application/vnd.openxmlformats-officedocument.presentationml.presentation': 'PowerPoint Presentation',
    'text/plain': 'Text File',
    'text/markdown': 'Markdown File',
    'text/csv': 'CSV File'
  };
  
  return typeNames[mimeType] || 'Document';
}