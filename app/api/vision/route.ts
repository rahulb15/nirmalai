// // app/api/vision/route.ts
// import { NextRequest, NextResponse } from 'next/server';
// import { readFile } from 'fs/promises';
// import { join } from 'path';
// import { openai, MODELS } from '@/lib/openai';

// export async function POST(req: NextRequest) {
//   try {
//     const body = await req.json();
//     const { imageUrl, imageUrls, prompt = 'What is in this image?' } = body;

//     // Handle multiple images (for PDF pages)
//     const imagesToProcess = imageUrls || [imageUrl];
    
//     if (!imagesToProcess || imagesToProcess.length === 0) {
//       return NextResponse.json(
//         { error: 'Image URL(s) required' },
//         { status: 400 }
//       );
//     }

//     console.log(`Processing ${imagesToProcess.length} images`);

//     // Process multiple images for comprehensive analysis
//     if (imagesToProcess.length > 1) {
//       // For multiple images (PDF pages), process each page
//       const pageAnalyses = [];
      
//       for (let i = 0; i < imagesToProcess.length; i++) {
//         const imageUrl = imagesToProcess[i];
//         console.log(`Processing page ${i + 1}...`);

//         try {
//           const response = await openai.chat.completions.create({
//             model: MODELS.GPT4_VISION,
//             messages: [
//               {
//                 role: 'user',
//                 content: [
//                   { 
//                     type: 'text', 
//                     text: `Analyze page ${i + 1} of the document. Extract and describe all text, images, diagrams, and key information: ${prompt}` 
//                   },
//                   {
//                     type: 'image_url',
//                     image_url: {
//                       url: imageUrl,
//                     },
//                   },
//                 ],
//               },
//             ],
//             max_completion_tokens: 1500,
//           });

//           const pageContent = response.choices[0]?.message?.content || `No content extracted from page ${i + 1}`;
//           pageAnalyses.push({
//             page: i + 1,
//             content: pageContent
//           });

//           console.log(`Page ${i + 1} analyzed successfully`);
//         } catch (error:any) {
//           console.error(`Error processing page ${i + 1}:`, error);
//           pageAnalyses.push({
//             page: i + 1,
//             content: `Error analyzing page ${i + 1}: ${error.message}`
//           });
//         }
//       }

//       // Combine all page analyses
//       const combinedDescription = pageAnalyses
//         .map(page => `**Page ${page.page}:**\n${page.content}`)
//         .join('\n\n---\n\n');

//       return NextResponse.json({
//         description: `**Document Analysis (${imagesToProcess.length} pages):**\n\n${combinedDescription}`,
//         pages: pageAnalyses,
//         totalPages: imagesToProcess.length
//       });
//     }

//     // Handle single image
//     let finalImageUrl = imagesToProcess[0];

//     // Check if it's a local upload
//     if (finalImageUrl.startsWith('/uploads/')) {
//       const filePath = join(process.cwd(), 'public', finalImageUrl);
//       const imageBuffer = await readFile(filePath);
//       const base64Image = imageBuffer.toString('base64');
      
//       let mimeType = 'image/jpeg';
//       const lowerUrl = finalImageUrl.toLowerCase();
//       if (lowerUrl.endsWith('.png')) mimeType = 'image/png';
//       else if (lowerUrl.endsWith('.gif')) mimeType = 'image/gif';
//       else if (lowerUrl.endsWith('.webp')) mimeType = 'image/webp';
      
//       finalImageUrl = `data:${mimeType};base64,${base64Image}`;
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
//       max_completion_tokens: 1500,
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


// app/api/vision/route.ts - Updated for parallel processing of multiple images
import { NextRequest, NextResponse } from 'next/server';
import { openai, MODELS } from '@/lib/openai';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { imageUrl, imageUrls, prompt = 'What is in this image?' } = body;

    const imagesToProcess = imageUrls || [imageUrl];
    
    if (!imagesToProcess || imagesToProcess.length === 0) {
      return NextResponse.json({ error: 'Image URL(s) required' }, { status: 400 });
    }

    console.log(`Processing ${imagesToProcess.length} images in parallel`);

    // For multiple images, process in parallel
    if (imagesToProcess.length > 1) {
      const analysisPromises = imagesToProcess.map(async (imageUrl:any, index:any) => {
        try {
          const response = await openai.chat.completions.create({
            model: MODELS.GPT4_VISION,
            messages: [
              {
                role: 'user',
                content: [
                  { 
                    type: 'text', 
                    text: `Analyze page ${index + 1}. ${prompt}` 
                  },
                  { type: 'image_url', image_url: { url: imageUrl } },
                ],
              },
            ],
            max_completion_tokens: 1000,
          });

          return {
            page: index + 1,
            content: response.choices[0]?.message?.content || `No content from page ${index + 1}`
          };
        } catch (error:any) {
          return {
            page: index + 1,
            content: `Error analyzing page ${index + 1}: ${error.message}`
          };
        }
      });

      const results = await Promise.all(analysisPromises);
      results.sort((a, b) => a.page - b.page);
      
      const combinedDescription = results
        .map(page => `**Page ${page.page}:**\n${page.content}`)
        .join('\n\n---\n\n');

      return NextResponse.json({
        description: `**Document Analysis (${imagesToProcess.length} pages):**\n\n${combinedDescription}`,
        pages: results,
        totalPages: imagesToProcess.length
      });
    }

    // Single image processing
    const response = await openai.chat.completions.create({
      model: MODELS.GPT4_VISION,
      messages: [
        {
          role: 'user',
          content: [
            { type: 'text', text: prompt },
            { type: 'image_url', image_url: { url: imagesToProcess[0] } },
          ],
        },
      ],
      max_completion_tokens: 1500,
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