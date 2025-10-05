// app\api\upload\route.ts
import { NextRequest, NextResponse } from 'next/server';
import cloudinary from '@/lib/cloudinary';

export async function POST(req: NextRequest) {
  console.log('Upload API called');
  
  try {
    if (!process.env.CLOUDINARY_CLOUD_NAME || 
        !process.env.CLOUDINARY_API_KEY || 
        !process.env.CLOUDINARY_API_SECRET) {
      return NextResponse.json({ 
        error: 'Cloudinary not configured properly' 
      }, { status: 500 });
    }

    const formData = await req.formData();
    const file = formData.get('file') as File;

    if (!file) {
      return NextResponse.json({ error: 'No file uploaded' }, { status: 400 });
    }

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    const timestamp = Date.now();
    const cleanName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_');

    // Handle PDF files
    if (file.type === 'application/pdf') {
      try {
        const pdfUploadResult = await new Promise((resolve, reject) => {
          cloudinary.uploader.upload_stream(
            {
              resource_type: 'image',
              public_id: `nirmal-ai/pdfs/${timestamp}-${cleanName}`,
              format: 'pdf',
            },
            (error, result) => {
              if (error) reject(error);
              else resolve(result);
            }
          ).end(buffer);
        });

        const pdfPublicId = (pdfUploadResult as any).public_id;
        
        let pageCount = 1;
        try {
          const pdfInfo = await cloudinary.api.resource(pdfPublicId, { 
            resource_type: 'image',
            pages: true 
          });
          pageCount = pdfInfo.pages || 1;
        } catch (infoError) {
          pageCount = 5; // Default fallback
        }

        const maxPages = Math.min(pageCount, 20);
        const pdfImages = [];
        
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

        return NextResponse.json({
          type: file.type,
          name: file.name,
          isPdf: true,
          pageCount: pageCount,
          pdfImages: pdfImages,
          url: pdfImages[0]?.url,
          extractedText: `PDF converted to ${pdfImages.length} images for AI analysis`,
          cloudinaryId: pdfPublicId,
        });

      } catch (error:any) {
        return NextResponse.json({
          error: `Failed to process PDF: ${error.message}`
        }, { status: 500 });
      }
    }

    // Handle images
    if (file.type.startsWith('image/')) {
      try {
        const uploadResult = await new Promise((resolve, reject) => {
          cloudinary.uploader.upload_stream(
            {
              resource_type: 'image',
              public_id: `nirmal-ai/images/${timestamp}-${cleanName}`,
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
      } catch (error:any) {
        return NextResponse.json({
          error: `Failed to upload image: ${error.message}`
        }, { status: 500 });
      }
    }

  } catch (error: any) {
    return NextResponse.json(
      { error: `Upload failed: ${error.message}` },
      { status: 500 }
    );
  }
}