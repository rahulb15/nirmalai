import { NextRequest, NextResponse } from 'next/server';
import cloudinary from '@/lib/cloudinary';

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get('file') as File;

    if (!file) {
      return NextResponse.json({ error: 'No file uploaded' }, { status: 400 });
    }

    // Increased size limit to 100MB (or remove entirely)
    const maxSize = 100 * 1024 * 1024; // 100MB
    if (file.size > maxSize) {
      return NextResponse.json({ 
        error: 'File size exceeds 100MB limit' 
      }, { status: 400 });
    }

    // Convert file to buffer
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    // Generate unique filename
    const timestamp = Date.now();
    const cleanName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_');
    const publicId = `nirmal-ai/${timestamp}-${cleanName}`;

    let uploadResult;
    let extractedText = '';
    let pageCount = 0;

    // Handle PDF files
    if (file.type === 'application/pdf') {
      try {
        // Upload PDF to Cloudinary
        uploadResult = await new Promise((resolve, reject) => {
          cloudinary.uploader.upload_stream(
            {
              resource_type: 'raw',
              public_id: publicId,
              folder: 'nirmal-ai/pdfs',
            },
            (error, result) => {
              if (error) reject(error);
              else resolve(result);
            }
          ).end(buffer);
        });

        // Extract text from PDF
        try {
          const pdf = require('pdf-parse/lib/pdf-parse.js');
          const data = await pdf(buffer);
          
          extractedText = data.text;
          pageCount = data.numpages;
          
          console.log('PDF parsed successfully:', {
            pages: data.numpages,
            textLength: data.text.length
          });
        } catch (pdfError) {
          console.error('PDF parsing error:', pdfError);
          extractedText = 'Unable to extract text from PDF';
        }

        return NextResponse.json({
          url: (uploadResult as any).secure_url,
          type: file.type,
          name: file.name,
          extractedText: extractedText,
          pageCount: pageCount,
          isPdf: true,
          cloudinaryId: (uploadResult as any).public_id,
        });

      } catch (error) {
        console.error('PDF upload error:', error);
        return NextResponse.json({
          error: 'Failed to upload PDF'
        }, { status: 500 });
      }
    }

    // Handle Image files
    if (file.type.startsWith('image/')) {
      try {
        uploadResult = await new Promise((resolve, reject) => {
          cloudinary.uploader.upload_stream(
            {
              resource_type: 'image',
              public_id: publicId,
              folder: 'nirmal-ai/images',
              transformation: [
                { quality: 'auto:best' },
                { fetch_format: 'auto' }
              ]
            },
            (error, result) => {
              if (error) reject(error);
              else resolve(result);
            }
          ).end(buffer);
        });

        return NextResponse.json({
          url: (uploadResult as any).secure_url,
          type: file.type,
          name: file.name,
          cloudinaryId: (uploadResult as any).public_id,
        });

      } catch (error) {
        console.error('Image upload error:', error);
        return NextResponse.json({
          error: 'Failed to upload image'
        }, { status: 500 });
      }
    }

    // Handle other file types
    try {
      uploadResult = await new Promise((resolve, reject) => {
        cloudinary.uploader.upload_stream(
          {
            resource_type: 'raw',
            public_id: publicId,
            folder: 'nirmal-ai/files',
          },
          (error, result) => {
            if (error) reject(error);
            else resolve(result);
          }
        ).end(buffer);
      });

      return NextResponse.json({
        url: (uploadResult as any).secure_url,
        type: file.type,
        name: file.name,
        cloudinaryId: (uploadResult as any).public_id,
      });

    } catch (error) {
      console.error('File upload error:', error);
      return NextResponse.json({
        error: 'Failed to upload file'
      }, { status: 500 });
    }

  } catch (error: any) {
    console.error('Upload error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to upload file' },
      { status: 500 }
    );
  }
}