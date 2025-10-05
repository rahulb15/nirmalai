import { NextRequest, NextResponse } from 'next/server';
import cloudinary from '@/lib/cloudinary';

// Set 60 second timeout for Vercel/DigitalOcean
export const maxDuration = 60;

export async function POST(req: NextRequest) {
  console.log('=== UPLOAD API START ===');
  
  try {
    // Check Cloudinary config
    if (!process.env.CLOUDINARY_CLOUD_NAME || 
        !process.env.CLOUDINARY_API_KEY || 
        !process.env.CLOUDINARY_API_SECRET) {
      console.error('Missing Cloudinary env vars');
      return NextResponse.json({ 
        error: 'Server configuration error: Cloudinary not configured',
        debug: {
          hasCloudName: !!process.env.CLOUDINARY_CLOUD_NAME,
          hasApiKey: !!process.env.CLOUDINARY_API_KEY,
          hasApiSecret: !!process.env.CLOUDINARY_API_SECRET,
        }
      }, { status: 500 });
    }

    // Parse formData with timeout protection
    let formData;
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 50000); // 50s timeout
      
      formData = await req.formData();
      clearTimeout(timeoutId);
      
      console.log('FormData parsed');
    } catch (formError: any) {
      console.error('FormData parse error:', formError);
      return NextResponse.json({ 
        error: 'Failed to read upload data. File may be too large.',
        debug: {
          message: formError.message,
          name: formError.name,
          type: 'FORMDATA_ERROR'
        }
      }, { status: 400 });
    }

    const file = formData.get('file') as File;
    if (!file) {
      return NextResponse.json({ 
        error: 'No file provided',
        debug: { type: 'NO_FILE' }
      }, { status: 400 });
    }

    console.log(`File: ${file.name}, Type: ${file.type}, Size: ${(file.size / 1024 / 1024).toFixed(2)}MB`);

    // Check size
    const MAX_SIZE = 50 * 1024 * 1024; // Reduced to 50MB for stability
    if (file.size > MAX_SIZE) {
      return NextResponse.json({ 
        error: `File too large. Max: 50MB, Your file: ${(file.size / 1024 / 1024).toFixed(2)}MB`,
        debug: { fileSize: file.size, maxSize: MAX_SIZE }
      }, { status: 400 });
    }

    // Convert to buffer
    let buffer: Buffer;
    try {
      const bytes = await file.arrayBuffer();
      buffer = Buffer.from(bytes);
      console.log(`Buffer created: ${buffer.length} bytes`);
    } catch (bufferError: any) {
      console.error('Buffer error:', bufferError);
      return NextResponse.json({ 
        error: 'Failed to process file data',
        debug: { message: bufferError.message, type: 'BUFFER_ERROR' }
      }, { status: 500 });
    }

    const timestamp = Date.now();
    const cleanName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_');

    // ===== PDF HANDLING =====
    if (file.type === 'application/pdf') {
      console.log('Processing PDF...');
      
      try {
        // Upload to Cloudinary
        const uploadResult: any = await new Promise((resolve, reject) => {
          const timeout = setTimeout(() => reject(new Error('Upload timeout')), 45000);
          
          const stream = cloudinary.uploader.upload_stream(
            {
              resource_type: 'image',
              public_id: `nirmal-ai/pdfs/${timestamp}-${cleanName}`,
              format: 'pdf',
            },
            (error, result) => {
              clearTimeout(timeout);
              if (error) {
                console.error('Cloudinary error:', error);
                reject(error);
              } else {
                console.log('Upload success:', result?.public_id);
                resolve(result);
              }
            }
          );
          
          stream.end(buffer);
        });

        const pdfPublicId = uploadResult.public_id;
        
        // Get page count
        let pageCount = 5;
        try {
          const info = await cloudinary.api.resource(pdfPublicId, { 
            resource_type: 'image',
            pages: true 
          });
          pageCount = info.pages || 5;
          console.log(`Pages: ${pageCount}`);
        } catch (e) {
          console.warn('Could not get page count, using 5');
        }

        // Generate page URLs
        const maxPages = Math.min(pageCount, 20);
        const pdfImages = [];
        
        for (let i = 1; i <= maxPages; i++) {
          const url = cloudinary.url(pdfPublicId, {
            resource_type: 'image',
            page: i,
            format: 'jpg',
            quality: 'auto:good',
            width: 1200,
            height: 1600,
            crop: 'limit',
          });

          pdfImages.push({
            page: i,
            url: url,
            cloudinaryId: `${pdfPublicId}_page_${i}`,
          });
        }

        console.log(`PDF complete: ${pdfImages.length} pages`);

        return NextResponse.json({
          type: file.type,
          name: file.name,
          isPdf: true,
          pageCount: pageCount,
          pdfImages: pdfImages,
          url: pdfImages[0]?.url,
          extractedText: `PDF converted to ${pdfImages.length} images`,
          cloudinaryId: pdfPublicId,
        });

      } catch (pdfError: any) {
        console.error('PDF processing failed:', pdfError);
        return NextResponse.json({
          error: `PDF upload failed: ${pdfError.message}`,
          debug: {
            message: pdfError.message,
            stack: pdfError.stack?.substring(0, 500),
            type: 'PDF_ERROR'
          }
        }, { status: 500 });
      }
    }

    // ===== IMAGE HANDLING =====
    if (file.type.startsWith('image/')) {
      console.log('Processing image...');
      
      try {
        const uploadResult: any = await new Promise((resolve, reject) => {
          const timeout = setTimeout(() => reject(new Error('Upload timeout')), 30000);
          
          cloudinary.uploader.upload_stream(
            {
              resource_type: 'image',
              public_id: `nirmal-ai/images/${timestamp}-${cleanName}`,
            },
            (error, result) => {
              clearTimeout(timeout);
              error ? reject(error) : resolve(result);
            }
          ).end(buffer);
        });

        return NextResponse.json({
          url: uploadResult.secure_url,
          type: file.type,
          name: file.name,
          cloudinaryId: uploadResult.public_id,
        });
      } catch (imgError: any) {
        console.error('Image upload failed:', imgError);
        return NextResponse.json({
          error: `Image upload failed: ${imgError.message}`,
          debug: { message: imgError.message, type: 'IMAGE_ERROR' }
        }, { status: 500 });
      }
    }

    return NextResponse.json({
      error: 'Unsupported file type',
      debug: { fileType: file.type }
    }, { status: 400 });

  } catch (error: any) {
    console.error('CRITICAL ERROR:', error);
    return NextResponse.json({
      error: `Upload failed: ${error.message || 'Unknown error'}`,
      debug: {
        message: error.message,
        name: error.name,
        type: 'CRITICAL'
      }
    }, { status: 500 });
  }
}