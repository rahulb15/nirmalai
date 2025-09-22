// // import { NextRequest, NextResponse } from 'next/server';
// // import { writeFile, mkdir, readFile } from 'fs/promises';
// // import { join } from 'path';
// // import { existsSync } from 'fs';

// // export async function POST(req: NextRequest) {
// //   try {
// //     const formData = await req.formData();
// //     const file = formData.get('file') as File;

// //     if (!file) {
// //       return NextResponse.json({ error: 'No file uploaded' }, { status: 400 });
// //     }

// //     const maxSize = 10 * 1024 * 1024;
// //     if (file.size > maxSize) {
// //       return NextResponse.json({ error: 'File size exceeds 10MB limit' }, { status: 400 });
// //     }

// //     const bytes = await file.arrayBuffer();
// //     const buffer = Buffer.from(bytes);

// //     const uploadsDir = join(process.cwd(), 'public', 'uploads');
// //     if (!existsSync(uploadsDir)) {
// //       await mkdir(uploadsDir, { recursive: true });
// //     }

// //     const fileName = `${Date.now()}-${file.name.replace(/[^a-zA-Z0-9.-]/g, '_')}`;
// //     const filePath = join(uploadsDir, fileName);
    
// //     // Save file
// //     await writeFile(filePath, new Uint8Array(buffer));

// //     // Handle PDF
// //     if (file.type === 'application/pdf') {
// //       try {
// //         // Import differently to avoid the test file issue
// //         const pdf = require('pdf-parse/lib/pdf-parse.js');
        
// //         // Parse using the buffer directly
// //         const data = await pdf(buffer);
        
// //         console.log('PDF parsed successfully:', {
// //           pages: data.numpages,
// //           textLength: data.text.length
// //         });
        
// //         return NextResponse.json({
// //           url: `/uploads/${fileName}`,
// //           type: file.type,
// //           name: file.name,
// //           extractedText: data.text,
// //           pageCount: data.numpages,
// //           isPdf: true,
// //         });
// //       } catch (error) {
// //         console.error('PDF parsing error:', error);
// //         // Still return the file URL even if parsing fails
// //         return NextResponse.json({
// //           url: `/uploads/${fileName}`,
// //           type: file.type,
// //           name: file.name,
// //           isPdf: true,
// //           extractedText: 'Unable to extract text from PDF',
// //         });
// //       }
// //     }

// //     // Regular image
// //     return NextResponse.json({
// //       url: `/uploads/${fileName}`,
// //       type: file.type,
// //       name: file.name,
// //     });
// //   } catch (error: any) {
// //     console.error('Upload error:', error);
// //     return NextResponse.json(
// //       { error: error.message || 'Failed to upload file' },
// //       { status: 500 }
// //     );
// //   }
// // }



// import { NextRequest, NextResponse } from 'next/server';
// import { writeFile, mkdir } from 'fs/promises';
// import { join } from 'path';
// import { existsSync } from 'fs';

// const MAX_FILE_SIZE_MB = 50;
// const MAX_FILE_SIZE_BYTES = MAX_FILE_SIZE_MB * 1024 * 1024;
// const PDF_PARSE_TIMEOUT = 15000; // 15 seconds timeout for PDF parsing

// // Helper function to parse PDF with timeout
// async function parsePDFWithTimeout(buffer: Buffer, timeoutMs: number) {
//   return Promise.race([
//     // PDF parsing promise
//     (async () => {
//       const pdf = require('pdf-parse/lib/pdf-parse.js');
//       return await pdf(buffer);
//     })(),
//     // Timeout promise
//     new Promise((_, reject) => 
//       setTimeout(() => reject(new Error('PDF parsing timeout')), timeoutMs)
//     )
//   ]);
// }

// export async function POST(req: NextRequest) {
//   let filePath: string | null = null;
  
//   try {
//     const formData = await req.formData();
//     const file = formData.get('file') as File;

//     if (!file) {
//       return NextResponse.json({ error: 'No file uploaded' }, { status: 400 });
//     }

//     if (file.size > MAX_FILE_SIZE_BYTES) {
//       return NextResponse.json({ 
//         error: `File size exceeds ${MAX_FILE_SIZE_MB}MB limit` 
//       }, { status: 400 });
//     }

//     const bytes = await file.arrayBuffer();
//     const buffer = Buffer.from(bytes);

//     // Ensure uploads directory exists
//     const uploadsDir = join(process.cwd(), 'public', 'uploads');
//     if (!existsSync(uploadsDir)) {
//       await mkdir(uploadsDir, { recursive: true });
//     }

//     // Generate filename and save
//     const sanitizedName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_');
//     const fileName = `${Date.now()}-${sanitizedName}`;
//     filePath = join(uploadsDir, fileName);
    
//     await writeFile(filePath, new Uint8Array(buffer));
    
//     const fileUrl = `/uploads/${fileName}`;
//     console.log(`✅ File saved: ${fileName} (${file.size} bytes)`);

//     // Handle PDF
//     if (file.type === 'application/pdf') {
//       try {
//         console.log('🔄 Starting PDF parsing...');
        
//         const data = await parsePDFWithTimeout(buffer, PDF_PARSE_TIMEOUT) as any;
        
//         console.log(`✅ PDF parsed: ${data.numpages} pages, ${data.text?.length || 0} chars`);
        
//         // Return success response immediately
//         return NextResponse.json({
//           url: fileUrl,
//           type: file.type,
//           name: file.name,
//           size: file.size,
//           extractedText: data.text || '',
//           pageCount: data.numpages || 0,
//           isPdf: true,
//         });
        
//       } catch (pdfError: any) {
//         console.error('⚠️ PDF parsing failed:', pdfError.message);
        
//         // File is saved, just return without text extraction
//         return NextResponse.json({
//           url: fileUrl,
//           type: file.type,
//           name: file.name,
//           size: file.size,
//           isPdf: true,
//           extractedText: '', // Empty string instead of error message
//           pageCount: 0,
//           parseWarning: 'Text extraction skipped due to timeout or error',
//         });
//       }
//     }

//     // Regular file (image, etc.)
//     console.log(`✅ File uploaded: ${fileName}`);
//     return NextResponse.json({
//       url: fileUrl,
//       type: file.type,
//       name: file.name,
//       size: file.size,
//     });

//   } catch (error: any) {
//     console.error('❌ Upload error:', error.message);
    
//     // If file was saved but response failed, clean up
//     if (filePath && existsSync(filePath)) {
//       console.log('⚠️ File saved but error occurred. File kept at:', filePath);
//     }
    
//     return NextResponse.json(
//       { 
//         error: error.message || 'Upload failed',
//         details: process.env.NODE_ENV === 'development' ? error.stack : undefined
//       },
//       { status: 500 }
//     );
//   }
// }

// // Increase timeout for large files
// export const config = {
//   api: {
//     bodyParser: false,
//     responseLimit: false,
//   },
// };

import { NextRequest, NextResponse } from 'next/server';
import { writeFile, mkdir, unlink } from 'fs/promises';
import { join } from 'path';
import { existsSync } from 'fs';

// Increased file size to 100MB as requested
const MAX_FILE_SIZE_MB = 100;
const MAX_FILE_SIZE_BYTES = MAX_FILE_SIZE_MB * 1024 * 1024;
const PDF_PARSE_TIMEOUT = 30000; // 30 seconds timeout
const PDF_TO_IMAGE_TIMEOUT = 45000; // 45 seconds for PDF to image conversion

// Helper function to convert PDF to images
async function convertPdfToImages(buffer: Buffer, fileName: string): Promise<string[]> {
  try {
    // Using pdf2pic for PDF to image conversion
    const pdf2pic = require('pdf2pic');
    
    const convert = pdf2pic.fromBuffer(buffer, {
      density: 150, // DPI - higher = better quality but larger files
      saveFilename: `${Date.now()}-${fileName.replace('.pdf', '')}`,
      savePath: join(process.cwd(), 'public', 'uploads', 'pdf-images'),
      format: "jpeg", // or "png" for better quality
      width: 1200, // max width
      height: 1600, // max height
    });

    // Ensure directory exists
    const pdfImagesDir = join(process.cwd(), 'public', 'uploads', 'pdf-images');
    if (!existsSync(pdfImagesDir)) {
      await mkdir(pdfImagesDir, { recursive: true });
    }

    // Convert all pages
    const results = await convert.bulk(-1, { responseType: "image" });
    
    const imageUrls = results.map((result: any, index: number) => {
      const imageName = `${Date.now()}-${fileName.replace('.pdf', '')}.${index + 1}.jpeg`;
      return `/uploads/pdf-images/${imageName}`;
    });

    return imageUrls;
  } catch (error) {
    console.error('PDF to image conversion failed:', error);
    throw error;
  }
}

// Alternative PDF to images using canvas and pdf.js (fallback method)
async function convertPdfToImagesAlternative(buffer: Buffer): Promise<string[]> {
  try {
    // Using pdf-parse to get page count first
    const pdf = require('pdf-parse/lib/pdf-parse.js');
    const data = await pdf(buffer);
    
    // For server-side PDF to image, we can use pdf2png or similar
    const sharp = require('sharp');
    const pdfjsLib = require('pdfjs-dist/legacy/build/pdf.js');
    
    // Load PDF
    const loadingTask = pdfjsLib.getDocument({ data: buffer });
    const pdfDoc = await loadingTask.promise;
    
    const imageUrls: string[] = [];
    const uploadsDir = join(process.cwd(), 'public', 'uploads', 'pdf-images');
    
    if (!existsSync(uploadsDir)) {
      await mkdir(uploadsDir, { recursive: true });
    }

    // Convert each page to image
    for (let pageNum = 1; pageNum <= pdfDoc.numPages; pageNum++) {
      const page = await pdfDoc.getPage(pageNum);
      const viewport = page.getViewport({ scale: 2.0 });
      
      // Create canvas context (server-side)
      const canvas = require('canvas');
      const canvasElement = canvas.createCanvas(viewport.width, viewport.height);
      const context = canvasElement.getContext('2d');

      const renderContext = {
        canvasContext: context,
        viewport: viewport,
      };

      await page.render(renderContext).promise;
      
      // Save as image
      const imageBuffer = canvasElement.toBuffer('image/jpeg', { quality: 0.8 });
      const imageName = `pdf-page-${Date.now()}-${pageNum}.jpeg`;
      const imagePath = join(uploadsDir, imageName);
      
      await writeFile(imagePath, imageBuffer);
      imageUrls.push(`/uploads/pdf-images/${imageName}`);
    }

    return imageUrls;
  } catch (error) {
    console.error('Alternative PDF to image conversion failed:', error);
    throw error;
  }
}

// Retry mechanism for file operations
async function retryOperation<T>(
  operation: () => Promise<T>, 
  maxRetries: number = 3, 
  delay: number = 1000
): Promise<T> {
  let lastError: Error;
  
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await operation();
    } catch (error) {
      lastError = error as Error;
      console.warn(`Attempt ${i + 1} failed:`, error);
      
      if (i < maxRetries - 1) {
        await new Promise(resolve => setTimeout(resolve, delay * (i + 1)));
      }
    }
  }
  
  throw lastError!;
}

export async function POST(req: NextRequest) {
  let filePath: string | null = null;
  let tempFiles: string[] = [];
  
  try {
    console.log('📤 Upload request received');
    
    const formData = await req.formData();
    const file = formData.get('file') as File;

    if (!file) {
      return NextResponse.json({ error: 'No file uploaded' }, { status: 400 });
    }

    console.log(`📁 Processing file: ${file.name} (${file.size} bytes, ${file.type})`);

    // Check file size
    if (file.size > MAX_FILE_SIZE_BYTES) {
      return NextResponse.json({ 
        error: `File size exceeds ${MAX_FILE_SIZE_MB}MB limit. Current size: ${Math.round(file.size / 1024 / 1024 * 100) / 100}MB` 
      }, { status: 400 });
    }

    // Get file buffer with retry
    const buffer = await retryOperation(async () => {
      const bytes = await file.arrayBuffer();
      return Buffer.from(bytes);
    });

    // Ensure uploads directory exists
    const uploadsDir = join(process.cwd(), 'public', 'uploads');
    if (!existsSync(uploadsDir)) {
      await mkdir(uploadsDir, { recursive: true });
    }

    // Generate filename and save with retry
    const sanitizedName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_');
    const fileName = `${Date.now()}-${sanitizedName}`;
    filePath = join(uploadsDir, fileName);
    
    await retryOperation(async () => {
      await writeFile(filePath!, new Uint8Array(buffer));
    });
    
    const fileUrl = `/uploads/${fileName}`;
    console.log(`✅ File saved: ${fileName} (${file.size} bytes)`);

    // Handle PDF - Convert to images instead of text extraction
    if (file.type === 'application/pdf') {
      try {
        console.log('🔄 Converting PDF to images...');
        
        // Try to convert PDF to images with timeout
        const pdfImages = await Promise.race([
          convertPdfToImages(buffer, sanitizedName),
          new Promise((_, reject) => 
            setTimeout(() => reject(new Error('PDF conversion timeout')), PDF_TO_IMAGE_TIMEOUT)
          )
        ]) as string[];

        console.log(`✅ PDF converted to ${pdfImages.length} images`);
        
        // Also try to extract text as backup (non-blocking)
        let extractedText = '';
        let pageCount = 0;
        
        try {
          const pdf = require('pdf-parse/lib/pdf-parse.js');
          const textData = await Promise.race([
            pdf(buffer),
            new Promise((_, reject) => 
              setTimeout(() => reject(new Error('Text extraction timeout')), 10000)
            )
          ]) as any;
          
          extractedText = textData.text || '';
          pageCount = textData.numpages || pdfImages.length;
          console.log(`📄 Text extracted: ${extractedText.length} characters`);
        } catch (textError) {
          console.warn('⚠️ Text extraction failed, using images only:', textError);
          pageCount = pdfImages.length;
        }
        
        return NextResponse.json({
          url: fileUrl,
          type: file.type,
          name: file.name,
          size: file.size,
          isPdf: true,
          pdfImages: pdfImages,
          extractedText: extractedText,
          pageCount: pageCount,
          conversionSuccess: true,
        });
        
      } catch (pdfError: any) {
        console.error('⚠️ PDF processing failed:', pdfError.message);
        
        // Return basic file info if PDF processing fails
        return NextResponse.json({
          url: fileUrl,
          type: file.type,
          name: file.name,
          size: file.size,
          isPdf: true,
          pdfImages: [],
          extractedText: '',
          pageCount: 0,
          conversionSuccess: false,
          processingError: 'PDF processing failed - file saved but cannot be processed',
        });
      }
    }

    // Handle regular files (images, etc.)
    console.log(`✅ Regular file uploaded: ${fileName}`);
    return NextResponse.json({
      url: fileUrl,
      type: file.type,
      name: file.name,
      size: file.size,
    });

  } catch (error: any) {
    console.error('❌ Upload error:', error.message);
    console.error('Stack trace:', error.stack);
    
    // Clean up any temporary files
    for (const tempFile of tempFiles) {
      try {
        await unlink(tempFile);
      } catch (cleanupError) {
        console.warn('Cleanup error:', cleanupError);
      }
    }
    
    // If file was saved but error occurred later, keep it
    if (filePath && existsSync(filePath)) {
      console.log('⚠️ File saved but processing error occurred. File kept at:', filePath);
    }
    
    return NextResponse.json(
      { 
        error: `Upload failed: ${error.message}`,
        details: process.env.NODE_ENV === 'development' ? error.stack : undefined,
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    );
  }
}

// Increase timeout for large files and PDF processing
export const config = {
  api: {
    bodyParser: false,
    responseLimit: '100mb',
  },
  maxDuration: 60, // 60 seconds for PDF conversion
};