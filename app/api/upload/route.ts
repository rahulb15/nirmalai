// // app/api/upload/route.ts
// import { NextRequest, NextResponse } from 'next/server';
// import cloudinary from '@/lib/cloudinary';

// export async function POST(req: NextRequest) {
//   console.log('Upload API called');
  
//   try {
//     // Check if Cloudinary is configured
//     if (!process.env.CLOUDINARY_CLOUD_NAME || 
//         !process.env.CLOUDINARY_API_KEY || 
//         !process.env.CLOUDINARY_API_SECRET) {
//       console.error('Cloudinary environment variables missing');
//       return NextResponse.json({ 
//         error: 'Cloudinary not configured properly' 
//       }, { status: 500 });
//     }

//     const formData = await req.formData();
//     const file = formData.get('file') as File;

//     if (!file) {
//       return NextResponse.json({ error: 'No file uploaded' }, { status: 400 });
//     }

//     console.log('File received:', {
//       name: file.name,
//       type: file.type,
//       size: file.size
//     });

//     // Convert file to buffer
//     const bytes = await file.arrayBuffer();
//     const buffer = Buffer.from(bytes);

//     // Generate unique filename
//     const timestamp = Date.now();
//     const cleanName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_');

//     // Handle PDF files - Use Cloudinary's PDF to image conversion
//     if (file.type === 'application/pdf') {
//       console.log('Processing PDF file with Cloudinary...');
      
//       try {
//         // First, upload PDF to Cloudinary
//         console.log('Uploading PDF to Cloudinary...');
//         const pdfUploadResult = await new Promise((resolve, reject) => {
//           cloudinary.uploader.upload_stream(
//             {
//               resource_type: 'image', // Important: use 'image' for PDF to enable transformations
//               public_id: `nirmal-ai/pdfs/${timestamp}-${cleanName}`,
//               folder: 'nirmal-ai/pdfs',
//               format: 'pdf', // Keep as PDF format
//             },
//             (error, result) => {
//               if (error) {
//                 console.error('PDF upload error:', error);
//                 reject(error);
//               } else {
//                 console.log('PDF uploaded successfully:', result?.public_id);
//                 resolve(result);
//               }
//             }
//           ).end(buffer);
//         });

//         const pdfPublicId = (pdfUploadResult as any).public_id;
//         console.log('PDF Public ID:', pdfPublicId);

//         // Get PDF page count using Cloudinary API
//         let pageCount = 1;
//         try {
//           const pdfInfo = await cloudinary.api.resource(pdfPublicId, { 
//             resource_type: 'image',
//             pages: true 
//           });
//           pageCount = pdfInfo.pages || 1;
//           console.log('PDF has', pageCount, 'pages');
//         } catch (infoError) {
//           console.error('Could not get PDF info, assuming 1 page:', infoError);
//         }

//         // Generate image URLs for each page using Cloudinary transformations
//         const pdfImages = [];
//         for (let i = 1; i <= Math.min(pageCount, 20); i++) { // Limit to 20 pages max
//           const imageUrl = cloudinary.url(pdfPublicId, {
//             resource_type: 'image',
//             page: i,
//             format: 'jpg',
//             quality: 'auto:best',
//             width: 1200,
//             height: 1600,
//             crop: 'limit', // Don't upscale, just limit max size
//             dpr: '2.0', // High DPI for better text reading
//           });

//           pdfImages.push({
//             page: i,
//             url: imageUrl,
//             cloudinaryId: `${pdfPublicId}_page_${i}`,
//           });
//         }

//         console.log(`Generated ${pdfImages.length} page images from PDF`);

//         return NextResponse.json({
//           type: file.type,
//           name: file.name,
//           isPdf: true,
//           pageCount: pageCount,
//           pdfImages: pdfImages,
//           // Return first page as main URL for compatibility
//           url: pdfImages[0]?.url,
//           extractedText: `PDF converted to ${pdfImages.length} images for AI analysis`,
//           cloudinaryId: pdfPublicId,
//           originalPdfUrl: (pdfUploadResult as any).secure_url,
//         });

//       } catch (error:any) {
//         console.error('PDF processing error:', error);
//         return NextResponse.json({
//           error: `Failed to process PDF: ${error.message}`
//         }, { status: 500 });
//       }
//     }

//     // Handle regular Image files
//     if (file.type.startsWith('image/')) {
//       console.log('Processing image file...');
      
//       try {
//         const publicId = `nirmal-ai/images/${timestamp}-${cleanName}`;
        
//         const uploadResult = await new Promise((resolve, reject) => {
//           cloudinary.uploader.upload_stream(
//             {
//               resource_type: 'image',
//               public_id: publicId,
//               folder: 'nirmal-ai/images',
//               transformation: [
//                 { quality: 'auto:best' },
//                 { fetch_format: 'auto' }
//               ]
//             },
//             (error, result) => {
//               if (error) {
//                 console.error('Image upload error:', error);
//                 reject(error);
//               } else {
//                 console.log('Image uploaded successfully');
//                 resolve(result);
//               }
//             }
//           ).end(buffer);
//         });

//         return NextResponse.json({
//           url: (uploadResult as any).secure_url,
//           type: file.type,
//           name: file.name,
//           cloudinaryId: (uploadResult as any).public_id,
//         });

//       } catch (error:any) {
//         console.error('Image processing error:', error);
//         return NextResponse.json({
//           error: `Failed to upload image: ${error.message}`
//         }, { status: 500 });
//       }
//     }

//     // Handle other file types
//     try {
//       const publicId = `nirmal-ai/files/${timestamp}-${cleanName}`;
      
//       const uploadResult = await new Promise((resolve, reject) => {
//         cloudinary.uploader.upload_stream(
//           {
//             resource_type: 'raw',
//             public_id: publicId,
//             folder: 'nirmal-ai/files',
//           },
//           (error, result) => {
//             if (error) reject(error);
//             else resolve(result);
//           }
//         ).end(buffer);
//       });

//       return NextResponse.json({
//         url: (uploadResult as any).secure_url,
//         type: file.type,
//         name: file.name,
//         cloudinaryId: (uploadResult as any).public_id,
//       });

//     } catch (error:any) {
//       console.error('File processing error:', error);
//       return NextResponse.json({
//         error: `Failed to upload file: ${error.message}`
//       }, { status: 500 });
//     }

//   } catch (error: any) {
//     console.error('General upload error:', error);
//     return NextResponse.json(
//       { error: `Upload failed: ${error.message}` },
//       { status: 500 }
//     );
//   }
// }

// export const runtime = 'nodejs';
// export const maxDuration = 300;

// app/api/upload/route.ts - Fixed version with better error handling
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