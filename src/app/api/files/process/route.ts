import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { FileProcessor } from '@/lib/file-processing';

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const formData = await request.formData();
    const files = formData.getAll('files') as File[];

    if (files.length === 0) {
      return NextResponse.json({ error: 'No files provided' }, { status: 400 });
    }

    // Validate files
    const validationResult = FileProcessor.validateFileList(files);
    if (!validationResult.isValid) {
      return NextResponse.json(
        { error: validationResult.error },
        { status: 400 }
      );
    }

    const results = [];

    for (const file of files) {
      try {
        // Upload to Supabase Storage
        const fileExt = file.name.split('.').pop();
        const fileName = `${Date.now()}-${Math.random().toString(36).substring(2)}.${fileExt}`;
        const filePath = `${user.id}/uploads/${fileName}`;

        const { error: uploadError } = await supabase.storage
          .from('user-uploads')
          .upload(filePath, file, {
            cacheControl: '3600',
            upsert: false,
          });

        if (uploadError) {
          throw new Error(`Upload failed: ${uploadError.message}`);
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

        // Process file content (for documents)
        let processedContent = null;
        const category = FileProcessor.getFileTypeCategory(file.type);

        if (category === 'document') {
          try {
            // For server-side processing, we'll need to implement these differently
            // For now, we'll just extract basic info
            processedContent = {
              type: 'document',
              mimeType: file.type,
              size: file.size,
              requiresProcessing: true,
            };
          } catch (error) {
            console.warn('Document processing failed:', error);
            processedContent = {
              type: 'document',
              error: 'Processing failed',
            };
          }
        }

        // Store file metadata in database
        const { data: uploadRecord, error: dbError } = await supabase
          .from('user_uploads')
          .insert({
            user_id: user.id,
            file_name: file.name,
            file_url: signedUrl,
            file_type: category,
            file_size: file.size,
            mime_type: file.type,
            processing_status: category === 'image' ? 'pending' : 'completed',
            extracted_content: processedContent
              ? JSON.stringify(processedContent)
              : null,
          })
          .select()
          .single();

        if (dbError) {
          console.error('Database error:', dbError);
        }

        results.push({
          success: true,
          fileName: file.name,
          fileUrl: signedUrl,
          fileType: file.type,
          fileSize: file.size,
          category,
          uploadId: uploadRecord?.id,
          processedContent,
        });
      } catch (error) {
        console.error('File processing error:', error);
        results.push({
          success: false,
          fileName: file.name,
          error: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    }

    return NextResponse.json({ results });
  } catch (error) {
    console.error('File processing API error:', error);
    return NextResponse.json(
      {
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
