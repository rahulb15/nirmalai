// app\api\vision\route.ts
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