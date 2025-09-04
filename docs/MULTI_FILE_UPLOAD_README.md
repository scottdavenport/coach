# ChatGPT-Style Multi-File Upload System

## Overview
This implementation transforms the existing photo-only upload system into a comprehensive multi-file upload experience similar to ChatGPT's interface.

## Features Implemented

### File Type Support
- **Images**: JPG, PNG, GIF, WebP with existing OCR functionality
- **Documents**: PDF, DOC, DOCX, TXT, MD, CSV, XLSX, ODS, PPTX
- **Combined limit**: Maximum 10 files total

### File Processing
- **Images**: Maintained existing OCR functionality for workout/health screenshots
- **CSV**: Client-side parsing with preview of first 10 rows
- **PDF**: Server-side text extraction using pdf-parse
- **DOC/DOCX**: Server-side text extraction using mammoth
- **Spreadsheets**: Server-side data extraction using xlsx library
- **Text files**: Direct content reading

### UI/UX Features
- **Combined upload area** for both photos and files
- **Preview chips** like ChatGPT with filename, file type icon, and remove button
- **File size display** and validation
- **Drag & drop** support across the entire chat interface
- **File type filtering** in the file picker (All, Images Only, Documents Only)
- **Real-time upload status** with loading indicators

### Technical Implementation
- **Storage**: Uses existing Supabase Storage setup
- **Database**: Added `conversation_file_attachments` junction table
- **API**: Updated `/api/chat` to handle multiple file types
- **File processing**: Hybrid client/server processing approach
- **Error handling**: Graceful fallbacks for unsupported/unreadable files

## Database Changes

### New Tables
1. `conversation_file_attachments` - Junction table linking conversations to files
2. `conversation_insights` - Enhanced conversation analysis storage

### Updated Tables
- `user_uploads` - Added support for new file types and processing metadata
- Enhanced with `mime_type`, `processing_status`, `extracted_content` columns

## File Structure

```
src/
├── components/chat/
│   ├── chat-interface.tsx          # Updated with multi-file support
│   ├── file-upload-menu.tsx        # Enhanced with file type filtering
│   └── file-preview-chip.tsx       # New ChatGPT-style preview chips
├── lib/file-processing/
│   ├── index.ts                    # Core file processing utilities
│   └── client.ts                   # Client-side processing functions
├── app/api/files/
│   ├── process/route.ts            # File upload and metadata API
│   └── extract/route.ts            # Server-side content extraction
└── types/index.ts                  # Updated with new file types
```

## Usage

### For Users
1. Click the plus icon to open the file picker menu
2. Choose "All File Types", "Images Only", or "Documents Only"
3. Select multiple files (up to 10 total)
4. See preview chips for each selected file
5. Remove individual files using the X button
6. Add context and send the conversation
7. Coach analyzes all uploaded content together

### For Developers

#### Adding New File Types
1. Add MIME type to `SupportedFileType` in `types/index.ts`
2. Add processing logic to `client.ts` or `extract/route.ts`
3. Update `FileProcessor.getFileIcon()` for the icon
4. Test with sample files

#### File Processing Flow
1. **Client validation** - File type, size, count limits
2. **Upload to Supabase** - Parallel upload of all files
3. **Content extraction** - Client-side for simple files, server-side for complex
4. **AI processing** - Combined analysis of all file content
5. **Storage** - Metadata stored in database with conversation links

## Configuration

### File Limits
- **Max files**: 10 per conversation
- **Max size**: 10MB per file
- **Supported types**: See `SupportedFileType` in types

### Processing Approach
- **Client-side**: Text files, CSV, Markdown
- **Server-side**: PDF, DOCX, XLSX (requires Node.js libraries)
- **OCR**: Images processed by existing Supabase Edge Function

## Database Migration

Run the following migration to enable multi-file support:

```sql
-- Apply the migration
supabase db push
```

Or manually run the SQL from `supabase/migrations/20250131_add_conversation_file_attachments.sql`

## Testing

1. **Single file upload** - Verify existing functionality works
2. **Multiple file upload** - Test with mix of images and documents
3. **File type filtering** - Test each filter option
4. **Drag and drop** - Test dropping files onto the chat interface
5. **File limits** - Test exceeding 10 files or 10MB limits
6. **Error handling** - Test with unsupported file types

## Performance Considerations

- **Parallel uploads** - All files upload simultaneously
- **Lazy imports** - Document processing libraries loaded on demand
- **Content truncation** - Long documents truncated in AI context
- **Memory management** - Files processed one at a time to avoid memory issues

## Future Enhancements

1. **Progress indicators** for large file uploads
2. **File preview thumbnails** for images
3. **Content search** within uploaded documents
4. **File organization** and tagging
5. **Batch operations** for multiple conversations
6. **Cloud storage integration** (Google Drive, Dropbox)

## Troubleshooting

### Build Issues
- Ensure Node.js packages are properly externalized in `next.config.ts`
- Check that client-side code doesn't import server-only modules

### Upload Failures
- Verify Supabase Storage bucket permissions
- Check file size and type restrictions
- Monitor browser network tab for API errors

### Processing Errors
- Check server logs for document extraction errors
- Verify file format compatibility
- Test with smaller sample files first