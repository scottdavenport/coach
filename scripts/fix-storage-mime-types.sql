-- Quick fix for storage MIME type support
-- Run this in your Supabase SQL editor or via CLI

UPDATE storage.buckets 
SET allowed_mime_types = ARRAY[
  -- Images
  'image/jpeg',
  'image/png', 
  'image/gif',
  'image/webp',
  -- Documents
  'application/pdf',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/msword',
  'text/plain',
  'text/markdown', 
  'text/csv',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/vnd.oasis.opendocument.spreadsheet',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation'
]
WHERE id = 'user-uploads';

-- Verify the update
SELECT id, name, allowed_mime_types 
FROM storage.buckets 
WHERE id = 'user-uploads';