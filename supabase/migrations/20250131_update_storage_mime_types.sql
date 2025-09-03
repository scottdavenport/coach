-- Update storage bucket to support additional MIME types for multi-file upload

UPDATE storage.buckets 
SET allowed_mime_types = ARRAY[
  -- Images (existing)
  'image/jpeg',
  'image/png', 
  'image/gif',
  'image/webp',
  -- Documents (new)
  'application/pdf',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document', -- .docx
  'application/msword', -- .doc
  'text/plain', -- .txt
  'text/markdown', -- .md
  'text/csv', -- .csv
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', -- .xlsx
  'application/vnd.oasis.opendocument.spreadsheet', -- .ods
  'application/vnd.openxmlformats-officedocument.presentationml.presentation' -- .pptx
]
WHERE id = 'user-uploads';