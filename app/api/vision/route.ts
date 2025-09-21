// import { NextRequest, NextResponse } from 'next/server';
// import { readFile } from 'fs/promises';
// import { join } from 'path';
// import { openai, MODELS } from '@/lib/openai';

// export async function POST(req: NextRequest) {
//   try {
//     const body = await req.json();
//     const { imageUrl, prompt = 'What is in this image?' } = body;

//     if (!imageUrl) {
//       return NextResponse.json(
//         { error: 'Image URL is required' },
//         { status: 400 }
//       );
//     }

//     let finalImageUrl: string;

//     // Check if it's a local upload (starts with /uploads/)
//     if (imageUrl.startsWith('/uploads/')) {
//       // Read the local file and convert to base64
//       const filePath = join(process.cwd(), 'public', imageUrl);
//       const imageBuffer = await readFile(filePath);
//       const base64Image = imageBuffer.toString('base64');
      
//       // Detect mime type from file extension
//       let mimeType = 'image/jpeg';
//       const lowerUrl = imageUrl.toLowerCase();
//       if (lowerUrl.endsWith('.png')) mimeType = 'image/png';
//       else if (lowerUrl.endsWith('.gif')) mimeType = 'image/gif';
//       else if (lowerUrl.endsWith('.webp')) mimeType = 'image/webp';
//       else if (lowerUrl.endsWith('.jpg') || lowerUrl.endsWith('.jpeg')) mimeType = 'image/jpeg';
      
//       // Create data URL for OpenAI
//       finalImageUrl = `data:${mimeType};base64,${base64Image}`;
//     } else {
//       // External URL - use as is
//       finalImageUrl = imageUrl;
//     }

//     const response = await openai.chat.completions.create({
//       model: MODELS.GPT4_VISION,
//       messages: [
//         {
//           role: 'user',
//           content: [
//             { type: 'text', text: prompt },
//             {
//               type: 'image_url',
//               image_url: {
//                 url: finalImageUrl,
//               },
//             },
//           ],
//         },
//       ],
//       max_tokens: 1000,
//     });

//     return NextResponse.json({
//       description: response.choices[0]?.message?.content || 'No description generated',
//     });
//   } catch (error: any) {
//     console.error('Vision API error:', error);
//     return NextResponse.json(
//       { error: error.message || 'Failed to process image' },
//       { status: 500 }
//     );
//   }
// }


import { NextRequest, NextResponse } from 'next/server';
import { readFile } from 'fs/promises';
import { join } from 'path';
import { openai, MODELS } from '@/lib/openai';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { imageUrl, prompt = 'What is in this image?' } = body;

    if (!imageUrl) {
      return NextResponse.json(
        { error: 'Image URL is required' },
        { status: 400 }
      );
    }

    let finalImageUrl: string;

    // Check if it's a local upload
    if (imageUrl.startsWith('/uploads/')) {
      const filePath = join(process.cwd(), 'public', imageUrl);
      const imageBuffer = await readFile(filePath);
      const base64Image = imageBuffer.toString('base64');
      
      let mimeType = 'image/jpeg';
      const lowerUrl = imageUrl.toLowerCase();
      if (lowerUrl.endsWith('.png')) mimeType = 'image/png';
      else if (lowerUrl.endsWith('.gif')) mimeType = 'image/gif';
      else if (lowerUrl.endsWith('.webp')) mimeType = 'image/webp';
      
      finalImageUrl = `data:${mimeType};base64,${base64Image}`;
    } else {
      finalImageUrl = imageUrl;
    }

    const response = await openai.chat.completions.create({
      model: MODELS.GPT4_VISION,
      messages: [
        {
          role: 'user',
          content: [
            { type: 'text', text: prompt },
            {
              type: 'image_url',
              image_url: {
                url: finalImageUrl,
              },
            },
          ],
        },
      ],
      max_completion_tokens: 1000,
    });

    return NextResponse.json({
      description: response.choices[0]?.message?.content || 'No description generated',
    });
  } catch (error: any) {
    console.error('Vision API error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to process image' },
      { status: 500 }
    );
  }
}