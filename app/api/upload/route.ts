import { NextRequest, NextResponse } from 'next/server';
import cloudinary from '@/lib/cloudinary';

export const maxDuration = 60;
export const dynamic = 'force-dynamic';

// Helper function to create error response
function errorResponse(message: string, debug: any = {}, status: number = 500) {
  console.error('ERROR:', message, debug);
  return NextResponse.json(
    { error: message, debug },
    { 
      status,
      headers: { 'Content-Type': 'application/json' }
    }
  );
}

export async function POST(req: NextRequest) {
  console.log('\n=== UPLOAD START ===');
  console.log('Time:', new Date().toISOString());
  
  try {
    // Check Cloudinary
    if (!process.env.CLOUDINARY_CLOUD_NAME || 
        !process.env.CLOUDINARY_API_KEY || 
        !process.env.CLOUDINARY_API_SECRET) {
      return errorResponse('Cloudinary not configured', {
        hasCloudName: !!process.env.CLOUDINARY_CLOUD_NAME,
        hasApiKey: !!process.env.CLOUDINARY_API_KEY,
        hasApiSecret: !!process.env.CLOUDINARY_API_SECRET,
      });
    }

    // Parse with explicit error handling
    let formData: FormData;
    try {
      formData = await req.formData();
    } catch (e: any) {
      return errorResponse('FormData parsing failed', {
        error: e.message,
        hint: 'File may be too large or corrupted'
      }, 400);
    }

    const file = formData.get('file') as File;
    if (!file) {
      return errorResponse('No file in request', {}, 400);
    }

    const fileSizeMB = (file.size / 1024 / 1024).toFixed(2);
    console.log(`File: ${file.name}`);
    console.log(`Type: ${file.type}`);
    console.log(`Size: ${fileSizeMB}MB`);

    // Size check - reduced to 30MB for stability
    if (file.size > 30 * 1024 * 1024) {
      return errorResponse(
        `File too large: ${fileSizeMB}MB. Maximum: 30MB`,
        { fileSize: file.size },
        400
      );
    }

    // Convert to buffer
    let buffer: Buffer;
    try {
      const arrayBuffer = await file.arrayBuffer();
      buffer = Buffer.from(arrayBuffer);
      console.log(`Buffer: ${buffer.length} bytes`);
    } catch (e: any) {
      return errorResponse('Failed to read file', { error: e.message }, 500);
    }

    const timestamp = Date.now();
    const safeName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_');

    // ===== PDF =====
    if (file.type === 'application/pdf') {
      console.log('Processing PDF...');
      
      try {
        // Upload with timeout
        const uploadPromise = new Promise<any>((resolve, reject) => {
          const timeoutId = setTimeout(() => {
            reject(new Error('Upload timeout after 45s'));
          }, 45000);

          cloudinary.uploader.upload_stream(
            {
              resource_type: 'image',
              public_id: `nirmal-ai/pdfs/${timestamp}-${safeName}`,
              format: 'pdf',
              timeout: 45000,
            },
            (error, result) => {
              clearTimeout(timeoutId);
              if (error) {
                console.error('Cloudinary error:', error);
                reject(error);
              } else {
                resolve(result);
              }
            }
          ).end(buffer);
        });

        const result = await uploadPromise;
        const publicId = result.public_id;
        console.log('PDF uploaded:', publicId);

        // Get page count - with fallback
        let pageCount = 5;
        try {
          const info = await Promise.race([
            cloudinary.api.resource(publicId, { 
              resource_type: 'image',
              pages: true 
            }),
            new Promise((_, reject) => 
              setTimeout(() => reject(new Error('Info timeout')), 10000)
            )
          ]) as any;
          pageCount = info.pages || 5;
        } catch (e) {
          console.warn('Using default page count');
        }

        console.log(`Pages: ${pageCount}`);

        // Generate URLs - limit to 15 pages for performance
        const maxPages = pageCount; // Process all pages in the PDF
        const pdfImages = [];

        for (let i = 1; i <= maxPages; i++) {
          const url = cloudinary.url(publicId, {
            resource_type: 'image',
            page: i,
            format: 'jpg',
            quality: 'auto:good',
            width: 1000,
            height: 1400,
            crop: 'limit',
          });

          pdfImages.push({
            page: i,
            url,
            cloudinaryId: `${publicId}_page_${i}`,
          });
        }

        console.log('SUCCESS: PDF processed');

        return NextResponse.json({
          type: file.type,
          name: file.name,
          isPdf: true,
          pageCount,
          pdfImages,
          url: pdfImages[0]?.url,
          extractedText: `PDF: ${pdfImages.length} pages`,
          cloudinaryId: publicId,
        }, {
          headers: { 'Content-Type': 'application/json' }
        });

      } catch (error: any) {
        return errorResponse(
          `PDF processing failed: ${error.message}`,
          {
            error: error.message,
            code: error.code,
            httpCode: error.http_code,
          }
        );
      }
    }

    // ===== IMAGE =====
    if (file.type.startsWith('image/')) {
      console.log('Processing image...');
      
      try {
        const uploadPromise = new Promise<any>((resolve, reject) => {
          const timeoutId = setTimeout(() => {
            reject(new Error('Upload timeout'));
          }, 30000);

          cloudinary.uploader.upload_stream(
            {
              resource_type: 'image',
              public_id: `nirmal-ai/images/${timestamp}-${safeName}`,
            },
            (error, result) => {
              clearTimeout(timeoutId);
              error ? reject(error) : resolve(result);
            }
          ).end(buffer);
        });

        const result = await uploadPromise;
        console.log('SUCCESS: Image uploaded');

        return NextResponse.json({
          url: result.secure_url,
          type: file.type,
          name: file.name,
          cloudinaryId: result.public_id,
        }, {
          headers: { 'Content-Type': 'application/json' }
        });

      } catch (error: any) {
        return errorResponse(
          `Image upload failed: ${error.message}`,
          { error: error.message }
        );
      }
    }

    return errorResponse('Unsupported file type', { type: file.type }, 400);

  } catch (error: any) {
    console.error('CRITICAL:', error);
    return errorResponse(
      'Server error',
      {
        message: error.message,
        stack: error.stack?.substring(0, 300),
      }
    );
  }
}