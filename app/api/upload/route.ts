import { NextRequest, NextResponse } from 'next/server';
import { writeFile, mkdir, readFile } from 'fs/promises';
import { join } from 'path';
import { existsSync } from 'fs';

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get('file') as File;

    if (!file) {
      return NextResponse.json({ error: 'No file uploaded' }, { status: 400 });
    }

    const maxSize = 10 * 1024 * 1024;
    if (file.size > maxSize) {
      return NextResponse.json({ error: 'File size exceeds 10MB limit' }, { status: 400 });
    }

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    const uploadsDir = join(process.cwd(), 'public', 'uploads');
    if (!existsSync(uploadsDir)) {
      await mkdir(uploadsDir, { recursive: true });
    }

    const fileName = `${Date.now()}-${file.name.replace(/[^a-zA-Z0-9.-]/g, '_')}`;
    const filePath = join(uploadsDir, fileName);
    
    // Save file
    await writeFile(filePath, new Uint8Array(buffer));

    // Handle PDF
    if (file.type === 'application/pdf') {
      try {
        // Import differently to avoid the test file issue
        const pdf = require('pdf-parse/lib/pdf-parse.js');
        
        // Parse using the buffer directly
        const data = await pdf(buffer);
        
        console.log('PDF parsed successfully:', {
          pages: data.numpages,
          textLength: data.text.length
        });
        
        return NextResponse.json({
          url: `/uploads/${fileName}`,
          type: file.type,
          name: file.name,
          extractedText: data.text,
          pageCount: data.numpages,
          isPdf: true,
        });
      } catch (error) {
        console.error('PDF parsing error:', error);
        // Still return the file URL even if parsing fails
        return NextResponse.json({
          url: `/uploads/${fileName}`,
          type: file.type,
          name: file.name,
          isPdf: true,
          extractedText: 'Unable to extract text from PDF',
        });
      }
    }

    // Regular image
    return NextResponse.json({
      url: `/uploads/${fileName}`,
      type: file.type,
      name: file.name,
    });
  } catch (error: any) {
    console.error('Upload error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to upload file' },
      { status: 500 }
    );
  }
}