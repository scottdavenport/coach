/**
 * Comprehensive tests for file processing utilities
 */

import { FileProcessor } from '../file-processing';

describe('FileProcessor', () => {
  describe('getSupportedFileTypes', () => {
    it('should return array of supported file types', () => {
      const types = FileProcessor.getSupportedFileTypes();
      expect(Array.isArray(types)).toBe(true);
      expect(types.length).toBeGreaterThan(0);
    });

    it('should include common image types', () => {
      const types = FileProcessor.getSupportedFileTypes();
      expect(types).toContain('image/jpeg');
      expect(types).toContain('image/png');
      expect(types).toContain('image/gif');
      expect(types).toContain('image/webp');
    });

    it('should include document types', () => {
      const types = FileProcessor.getSupportedFileTypes();
      expect(types).toContain('application/pdf');
      expect(types).toContain('text/plain');
      expect(types).toContain('text/markdown');
      expect(types).toContain('text/csv');
    });

    it('should include office document types', () => {
      const types = FileProcessor.getSupportedFileTypes();
      expect(types).toContain('application/vnd.openxmlformats-officedocument.wordprocessingml.document');
      expect(types).toContain('application/msword');
      expect(types).toContain('application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    });
  });

  describe('getFileTypeCategory', () => {
    it('should categorize image files correctly', () => {
      expect(FileProcessor.getFileTypeCategory('image/jpeg')).toBe('image');
      expect(FileProcessor.getFileTypeCategory('image/png')).toBe('image');
      expect(FileProcessor.getFileTypeCategory('image/gif')).toBe('image');
      expect(FileProcessor.getFileTypeCategory('image/webp')).toBe('image');
    });

    it('should categorize document files correctly', () => {
      expect(FileProcessor.getFileTypeCategory('application/pdf')).toBe('document');
      expect(FileProcessor.getFileTypeCategory('text/plain')).toBe('document');
      expect(FileProcessor.getFileTypeCategory('text/markdown')).toBe('document');
      expect(FileProcessor.getFileTypeCategory('text/csv')).toBe('document');
    });

    it('should categorize office documents correctly', () => {
      expect(FileProcessor.getFileTypeCategory('application/vnd.openxmlformats-officedocument.wordprocessingml.document')).toBe('document');
      expect(FileProcessor.getFileTypeCategory('application/msword')).toBe('document');
      expect(FileProcessor.getFileTypeCategory('application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')).toBe('document');
    });

    it('should return unknown for unsupported types', () => {
      expect(FileProcessor.getFileTypeCategory('application/x-executable')).toBe('unknown');
      expect(FileProcessor.getFileTypeCategory('video/mp4')).toBe('unknown');
      expect(FileProcessor.getFileTypeCategory('audio/mp3')).toBe('unknown');
    });

    it('should handle empty or invalid MIME types', () => {
      expect(FileProcessor.getFileTypeCategory('')).toBe('unknown');
      expect(FileProcessor.getFileTypeCategory('invalid')).toBe('unknown');
    });
  });

  describe('getFileIcon', () => {
    it('should return appropriate icons for different file types', () => {
      expect(FileProcessor.getFileIcon('application/pdf')).toBe('📄');
      expect(FileProcessor.getFileIcon('image/jpeg')).toBe('🖼️');
      expect(FileProcessor.getFileIcon('text/plain')).toBe('📄');
      expect(FileProcessor.getFileIcon('text/csv')).toBe('📊');
    });

    it('should return default icon for unknown types', () => {
      expect(FileProcessor.getFileIcon('application/x-executable')).toBe('📎');
      expect(FileProcessor.getFileIcon('unknown/type')).toBe('📎');
    });

    it('should handle empty MIME type', () => {
      expect(FileProcessor.getFileIcon('')).toBe('📎');
    });
  });

  describe('validateFile', () => {
    const createMockFile = (name: string, size: number, type: string): File => {
      const file = new File(['content'], name, { type });
      Object.defineProperty(file, 'size', { value: size });
      return file;
    };

    it('should validate correct file', () => {
      const file = createMockFile('test.pdf', 1024, 'application/pdf');
      const result = FileProcessor.validateFile(file);
      expect(result.isValid).toBe(true);
      expect(result.error).toBeUndefined();
    });

    it('should reject file that is too large', () => {
      const file = createMockFile('test.pdf', 11 * 1024 * 1024, 'application/pdf'); // 11MB
      const result = FileProcessor.validateFile(file);
      expect(result.isValid).toBe(false);
      expect(result.error).toContain('too large');
      expect(result.error).toContain('10MB');
    });

    it('should reject unsupported file type', () => {
      const file = createMockFile('test.exe', 1024, 'application/x-executable');
      const result = FileProcessor.validateFile(file);
      expect(result.isValid).toBe(false);
      expect(result.error).toContain('Unsupported file type');
    });

    it('should handle zero-size file', () => {
      const file = createMockFile('test.pdf', 0, 'application/pdf');
      const result = FileProcessor.validateFile(file);
      expect(result.isValid).toBe(false);
      expect(result.error).toContain('too large');
    });

    it('should handle very large file', () => {
      const file = createMockFile('test.pdf', 100 * 1024 * 1024, 'application/pdf'); // 100MB
      const result = FileProcessor.validateFile(file);
      expect(result.isValid).toBe(false);
      expect(result.error).toContain('too large');
    });

    it('should validate image files', () => {
      const jpegFile = createMockFile('test.jpg', 1024, 'image/jpeg');
      const pngFile = createMockFile('test.png', 1024, 'image/png');
      const gifFile = createMockFile('test.gif', 1024, 'image/gif');
      const webpFile = createMockFile('test.webp', 1024, 'image/webp');

      expect(FileProcessor.validateFile(jpegFile).isValid).toBe(true);
      expect(FileProcessor.validateFile(pngFile).isValid).toBe(true);
      expect(FileProcessor.validateFile(gifFile).isValid).toBe(true);
      expect(FileProcessor.validateFile(webpFile).isValid).toBe(true);
    });

    it('should validate document files', () => {
      const pdfFile = createMockFile('test.pdf', 1024, 'application/pdf');
      const txtFile = createMockFile('test.txt', 1024, 'text/plain');
      const mdFile = createMockFile('test.md', 1024, 'text/markdown');
      const csvFile = createMockFile('test.csv', 1024, 'text/csv');

      expect(FileProcessor.validateFile(pdfFile).isValid).toBe(true);
      expect(FileProcessor.validateFile(txtFile).isValid).toBe(true);
      expect(FileProcessor.validateFile(mdFile).isValid).toBe(true);
      expect(FileProcessor.validateFile(csvFile).isValid).toBe(true);
    });

    it('should validate office documents', () => {
      const docxFile = createMockFile('test.docx', 1024, 'application/vnd.openxmlformats-officedocument.wordprocessingml.document');
      const docFile = createMockFile('test.doc', 1024, 'application/msword');
      const xlsxFile = createMockFile('test.xlsx', 1024, 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');

      expect(FileProcessor.validateFile(docxFile).isValid).toBe(true);
      expect(FileProcessor.validateFile(docFile).isValid).toBe(true);
      expect(FileProcessor.validateFile(xlsxFile).isValid).toBe(true);
    });
  });

  describe('validateFileList', () => {
    const createMockFile = (name: string, size: number, type: string): File => {
      const file = new File(['content'], name, { type });
      Object.defineProperty(file, 'size', { value: size });
      return file;
    };

    it('should validate correct file list', () => {
      const files = [
        createMockFile('test1.pdf', 1024, 'application/pdf'),
        createMockFile('test2.txt', 1024, 'text/plain'),
      ];
      const result = FileProcessor.validateFileList(files);
      expect(result.isValid).toBe(true);
      expect(result.error).toBeUndefined();
    });

    it('should reject too many files', () => {
      const files = Array.from({ length: 11 }, (_, i) => 
        createMockFile(`test${i}.pdf`, 1024, 'application/pdf')
      );
      const result = FileProcessor.validateFileList(files);
      expect(result.isValid).toBe(false);
      expect(result.error).toContain('Too many files');
      expect(result.error).toContain('10');
    });

    it('should reject empty file list', () => {
      const result = FileProcessor.validateFileList([]);
      expect(result.isValid).toBe(false);
      expect(result.error).toContain('Too many files');
    });

    it('should reject if any file is invalid', () => {
      const files = [
        createMockFile('test1.pdf', 1024, 'application/pdf'),
        createMockFile('test2.exe', 1024, 'application/x-executable'), // Invalid type
      ];
      const result = FileProcessor.validateFileList(files);
      expect(result.isValid).toBe(false);
      expect(result.error).toContain('Unsupported file type');
    });

    it('should reject if any file is too large', () => {
      const files = [
        createMockFile('test1.pdf', 1024, 'application/pdf'),
        createMockFile('test2.pdf', 11 * 1024 * 1024, 'application/pdf'), // Too large
      ];
      const result = FileProcessor.validateFileList(files);
      expect(result.isValid).toBe(false);
      expect(result.error).toContain('too large');
    });

    it('should handle maximum allowed files', () => {
      const files = Array.from({ length: 10 }, (_, i) => 
        createMockFile(`test${i}.pdf`, 1024, 'application/pdf')
      );
      const result = FileProcessor.validateFileList(files);
      expect(result.isValid).toBe(true);
    });
  });

  describe('formatFileSize', () => {
    it('should format bytes correctly', () => {
      expect(FileProcessor.formatFileSize(0)).toBe('0 Bytes');
      expect(FileProcessor.formatFileSize(1024)).toBe('1 KB');
      expect(FileProcessor.formatFileSize(1024 * 1024)).toBe('1 MB');
      expect(FileProcessor.formatFileSize(1024 * 1024 * 1024)).toBe('1 GB');
    });

    it('should format fractional sizes correctly', () => {
      expect(FileProcessor.formatFileSize(1536)).toBe('1.5 KB'); // 1.5 KB
      expect(FileProcessor.formatFileSize(2.5 * 1024 * 1024)).toBe('2.5 MB');
    });

    it('should handle large sizes', () => {
      expect(FileProcessor.formatFileSize(5 * 1024 * 1024 * 1024)).toBe('5 GB');
    });

    it('should handle small sizes', () => {
      expect(FileProcessor.formatFileSize(512)).toBe('512 Bytes');
      expect(FileProcessor.formatFileSize(1)).toBe('1 Bytes');
    });
  });

  describe('getAcceptString', () => {
    it('should return accept string for file input', () => {
      const acceptString = FileProcessor.getAcceptString();
      expect(typeof acceptString).toBe('string');
      expect(acceptString.length).toBeGreaterThan(0);
    });

    it('should include image types', () => {
      const acceptString = FileProcessor.getAcceptString();
      expect(acceptString).toContain('image/*');
    });

    it('should include specific file extensions', () => {
      const acceptString = FileProcessor.getAcceptString();
      expect(acceptString).toContain('.pdf');
      expect(acceptString).toContain('.doc');
      expect(acceptString).toContain('.docx');
      expect(acceptString).toContain('.txt');
      expect(acceptString).toContain('.md');
      expect(acceptString).toContain('.csv');
      expect(acceptString).toContain('.xlsx');
    });

    it('should be comma-separated', () => {
      const acceptString = FileProcessor.getAcceptString();
      const parts = acceptString.split(',');
      expect(parts.length).toBeGreaterThan(1);
    });
  });

  describe('Edge Cases', () => {
    it('should handle null file', () => {
      expect(() => FileProcessor.validateFile(null as any)).toThrow();
    });

    it('should handle undefined file', () => {
      expect(() => FileProcessor.validateFile(undefined as any)).toThrow();
    });

    it('should handle null file list', () => {
      expect(() => FileProcessor.validateFileList(null as any)).toThrow();
    });

    it('should handle undefined file list', () => {
      expect(() => FileProcessor.validateFileList(undefined as any)).toThrow();
    });

    it('should handle negative file size', () => {
      const file = new File(['content'], 'test.pdf', { type: 'application/pdf' });
      Object.defineProperty(file, 'size', { value: -1 });
      const result = FileProcessor.validateFile(file);
      expect(result.isValid).toBe(false);
    });

    it('should handle very long file names', () => {
      const longName = 'a'.repeat(1000) + '.pdf';
      const file = new File(['content'], longName, { type: 'application/pdf' });
      Object.defineProperty(file, 'size', { value: 1024 });
      const result = FileProcessor.validateFile(file);
      expect(result.isValid).toBe(true); // Should still be valid
    });

    it('should handle special characters in file names', () => {
      const specialName = 'test file with spaces & symbols!.pdf';
      const file = new File(['content'], specialName, { type: 'application/pdf' });
      Object.defineProperty(file, 'size', { value: 1024 });
      const result = FileProcessor.validateFile(file);
      expect(result.isValid).toBe(true);
    });
  });

  describe('Performance', () => {
    it('should handle large file lists efficiently', () => {
      const files = Array.from({ length: 1000 }, (_, i) => {
        const file = new File(['content'], `test${i}.pdf`, { type: 'application/pdf' });
        Object.defineProperty(file, 'size', { value: 1024 });
        return file;
      });

      const start = Date.now();
      const result = FileProcessor.validateFileList(files);
      const end = Date.now();

      expect(result.isValid).toBe(false); // Should be rejected due to count limit
      expect(end - start).toBeLessThan(1000); // Should complete quickly
    });

    it('should handle repeated validations efficiently', () => {
      const file = new File(['content'], 'test.pdf', { type: 'application/pdf' });
      Object.defineProperty(file, 'size', { value: 1024 });

      const start = Date.now();
      for (let i = 0; i < 1000; i++) {
        FileProcessor.validateFile(file);
      }
      const end = Date.now();

      expect(end - start).toBeLessThan(1000); // Should complete quickly
    });
  });
});