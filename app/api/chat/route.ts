// // app\api\chat\route.ts
// import { NextRequest, NextResponse } from 'next/server';
// import { openai, MODELS } from '@/lib/openai';
// import { ChatRequest,ChatRequestNew } from '@/types';

// export async function POST(req: NextRequest) {
//   try {
//     const body: ChatRequestNew = await req.json();
//     const { messages, model = MODELS.GPT35, temperature = 0.7, max_completion_tokens = 2000 } = body;

//     if (!messages || messages.length === 0) {
//       return NextResponse.json(
//         { error: 'Messages are required' },
//         { status: 400 }
//       );
//     }

//     // Convert messages to OpenAI format
//     const openAIMessages = messages.map((msg) => ({
//       role: msg.role,
//       content: msg.content,
//     }));

//     const completion = await openai.chat.completions.create({
//       model,
//       messages: openAIMessages,
//     //   temperature,
//       // max_completion_tokens,
//     });

//     const assistantMessage = {
//       id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
//       role: 'assistant' as const,
//       content: completion.choices[0]?.message?.content || 'No response generated',
//       timestamp: new Date(),
//     };

//     return NextResponse.json({ message: assistantMessage });
//   } catch (error: any) {
//     console.error('Chat API error:', error);
//     return NextResponse.json(
//       { error: error.message || 'Failed to process chat request' },
//       { status: 500 }
//     );
//   }
// }

import { NextRequest, NextResponse } from 'next/server';
import cloudinary from '@/lib/cloudinary';

// ✅ CORRECT: Use new App Router config format
export const runtime = 'nodejs';
export const maxDuration = 60; // 60 seconds for serverless functions

export async function POST(req: NextRequest) {
  console.log('=== UPLOAD API CALLED ===');
  console.log('Content-Type:', req.headers.get('content-type'));
  console.log('Content-Length:', req.headers.get('content-length'));
  
  try {
    // ✅ Check Cloudinary configuration FIRST
    if (!process.env.CLOUDINARY_CLOUD_NAME || 
        !process.env.CLOUDINARY_API_KEY || 
        !process.env.CLOUDINARY_API_SECRET) {
      console.error('❌ Cloudinary environment variables missing');
      return NextResponse.json({ 
        error: 'Server configuration error: Cloudinary credentials missing',
        debug: {
          hasCloudName: !!process.env.CLOUDINARY_CLOUD_NAME,
          hasApiKey: !!process.env.CLOUDINARY_API_KEY,
          hasApiSecret: !!process.env.CLOUDINARY_API_SECRET,
        }
      }, { status: 500 });
    }

    console.log('✅ Cloudinary configured');

    // ✅ Parse form data with error handling
    let formData;
    try {
      formData = await req.formData();
      console.log('✅ FormData parsed successfully');
    } catch (formError: any) {
      console.error('❌ FormData parsing failed:', formError);
      return NextResponse.json({ 
        error: 'Failed to parse upload data',
        debug: {
          message: formError.message,
          type: 'FORMDATA_PARSE_ERROR'
        }
      }, { status: 400 });
    }

    const file = formData.get('file') as File;

    if (!file) {
      console.error('❌ No file in FormData');
      return NextResponse.json({ 
        error: 'No file uploaded',
        debug: { type: 'NO_FILE' }
      }, { status: 400 });
    }

    console.log('📄 File details:', {
      name: file.name,
      type: file.type,
      size: file.size,
      sizeInMB: (file.size / (1024 * 1024)).toFixed(2) + 'MB'
    });

    // ✅ Check file size (100MB limit)
    const MAX_FILE_SIZE = 100 * 1024 * 1024; // 100MB
    if (file.size > MAX_FILE_SIZE) {
      console.error('❌ File too large:', file.size);
      return NextResponse.json({ 
        error: `File too large. Maximum size is 100MB. Your file: ${(file.size / (1024 * 1024)).toFixed(2)}MB`,
        debug: { 
          fileSize: file.size,
          maxSize: MAX_FILE_SIZE,
          type: 'FILE_TOO_LARGE'
        }
      }, { status: 400 });
    }

    // ✅ Convert file to buffer with error handling
    let buffer;
    try {
      const bytes = await file.arrayBuffer();
      buffer = Buffer.from(bytes);
      console.log('✅ Buffer created:', buffer.length, 'bytes');
    } catch (bufferError: any) {
      console.error('❌ Buffer conversion failed:', bufferError);
      return NextResponse.json({ 
        error: 'Failed to process file',
        debug: {
          message: bufferError.message,
          type: 'BUFFER_CONVERSION_ERROR'
        }
      }, { status: 500 });
    }

    const timestamp = Date.now();
    const cleanName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_');

    // ========== HANDLE PDF FILES ==========
    if (file.type === 'application/pdf') {
      console.log('📑 Processing PDF file...');
      
      try {
        console.log('☁️ Uploading PDF to Cloudinary...');
        
        const pdfUploadResult = await new Promise((resolve, reject) => {
          const uploadStream = cloudinary.uploader.upload_stream(
            {
              resource_type: 'image',
              public_id: `nirmal-ai/pdfs/${timestamp}-${cleanName}`,
              format: 'pdf',
            },
            (error, result) => {
              if (error) {
                console.error('❌ Cloudinary upload error:', error);
                reject(error);
              } else {
                console.log('✅ Cloudinary upload success:', result?.public_id);
                resolve(result);
              }
            }
          );
          
          uploadStream.end(buffer);
        });

        const pdfPublicId = (pdfUploadResult as any).public_id;
        console.log('📄 PDF uploaded with ID:', pdfPublicId);
        
        // Get page count
        let pageCount = 1;
        try {
          console.log('📊 Fetching PDF info...');
          const pdfInfo = await cloudinary.api.resource(pdfPublicId, { 
            resource_type: 'image',
            pages: true 
          });
          pageCount = pdfInfo.pages || 1;
          console.log('✅ Page count:', pageCount);
        } catch (infoError: any) {
          console.warn('⚠️ Could not get page count, using default:', infoError.message);
          pageCount = 5;
        }

        const maxPages = Math.min(pageCount, 20);
        const pdfImages = [];
        
        console.log(`🖼️ Generating ${maxPages} page images...`);
        
        for (let i = 1; i <= maxPages; i++) {
          const imageUrl = cloudinary.url(pdfPublicId, {
            resource_type: 'image',
            page: i,
            format: 'jpg',
            quality: 'auto:best',
            width: 1200,
            height: 1600,
            crop: 'limit',
            dpr: '2.0',
          });

          if (imageUrl && imageUrl.startsWith('http')) {
            pdfImages.push({
              page: i,
              url: imageUrl,
              cloudinaryId: `${pdfPublicId}_page_${i}`,
            });
          }
        }

        console.log('✅ PDF processing complete:', pdfImages.length, 'pages');

        return NextResponse.json({
          type: file.type,
          name: file.name,
          isPdf: true,
          pageCount: pageCount,
          pdfImages: pdfImages,
          url: pdfImages[0]?.url,
          extractedText: `PDF converted to ${pdfImages.length} images for AI analysis`,
          cloudinaryId: pdfPublicId,
          debug: {
            success: true,
            totalPages: pageCount,
            processedPages: pdfImages.length
          }
        });

      } catch (error: any) {
        console.error('❌ PDF processing failed:', error);
        return NextResponse.json({
          error: `PDF upload failed: ${error.message}`,
          debug: {
            errorName: error.name,
            errorMessage: error.message,
            errorStack: error.stack,
            type: 'PDF_PROCESSING_ERROR',
            cloudinaryConfigured: !!(process.env.CLOUDINARY_CLOUD_NAME && 
                                      process.env.CLOUDINARY_API_KEY && 
                                      process.env.CLOUDINARY_API_SECRET)
          }
        }, { status: 500 });
      }
    }

    // ========== HANDLE IMAGE FILES ==========
    if (file.type.startsWith('image/')) {
      console.log('🖼️ Processing image file...');
      
      try {
        const uploadResult = await new Promise((resolve, reject) => {
          cloudinary.uploader.upload_stream(
            {
              resource_type: 'image',
              public_id: `nirmal-ai/images/${timestamp}-${cleanName}`,
            },
            (error, result) => {
              if (error) {
                console.error('❌ Image upload error:', error);
                reject(error);
              } else {
                console.log('✅ Image upload success');
                resolve(result);
              }
            }
          ).end(buffer);
        });

        return NextResponse.json({
          url: (uploadResult as any).secure_url,
          type: file.type,
          name: file.name,
          cloudinaryId: (uploadResult as any).public_id,
        });
      } catch (error: any) {
        console.error('❌ Image upload failed:', error);
        return NextResponse.json({
          error: `Image upload failed: ${error.message}`,
          debug: {
            errorName: error.name,
            errorMessage: error.message,
            type: 'IMAGE_UPLOAD_ERROR'
          }
        }, { status: 500 });
      }
    }

    // Unsupported file type
    return NextResponse.json({
      error: 'Unsupported file type',
      debug: {
        fileType: file.type,
        type: 'UNSUPPORTED_TYPE'
      }
    }, { status: 400 });

  } catch (error: any) {
    console.error('❌ CRITICAL ERROR:', error);
    return NextResponse.json({
      error: `Upload failed: ${error.message}`,
      debug: {
        errorName: error.name,
        errorMessage: error.message,
        errorStack: error.stack,
        type: 'CRITICAL_ERROR'
      }
    }, { status: 500 });
  }
}