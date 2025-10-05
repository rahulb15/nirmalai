import { NextRequest, NextResponse } from 'next/server';
import { openai, MODELS } from '@/lib/openai';

export const maxDuration = 300; // 5 minutes for large documents

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { imageUrls, prompt = 'Extract all text and information' } = body;

    if (!imageUrls || imageUrls.length === 0) {
      return NextResponse.json(
        { error: 'Image URLs required' },
        { 
          status: 400,
          headers: { 'Content-Type': 'application/json' }
        }
      );
    }

    console.log(`Batch processing ${imageUrls.length} images`);

    // Process ALL pages - no sampling
    const pagesToAnalyze = imageUrls.map((url:any, i:any) => ({ 
      url, 
      originalPage: i + 1 
    }));

    // Process in parallel batches
    const batchSize = 5;
    const allResults = [];
    
    for (let i = 0; i < pagesToAnalyze.length; i += batchSize) {
      const batch = pagesToAnalyze.slice(i, i + batchSize);
      console.log(`Processing batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(pagesToAnalyze.length / batchSize)}, pages: ${batch.map((p:any) => p.originalPage).join(', ')}`);
      
      const batchPromises = batch.map(async (page:any) => {
        try {
          const response = await openai.chat.completions.create({
            model: MODELS.GPT4_VISION,
            messages: [
              {
                role: 'user',
                content: [
                  { 
                    type: 'text', 
                    text: `Extract all text and key information from page ${page.originalPage}. Be comprehensive but concise.`
                  },
                  { type: 'image_url', image_url: { url: page.url } },
                ],
              },
            ],
            max_completion_tokens: 800,
          });

          return {
            page: page.originalPage,
            content: response.choices[0]?.message?.content || 'No content extracted',
          };
        } catch (error:any) {
          console.error(`Error processing page ${page.originalPage}:`, error);
          return {
            page: page.originalPage,
            content: `Error analyzing page ${page.originalPage}: ${error.message}`,
            error: true
          };
        }
      });

      const batchResults = await Promise.all(batchPromises);
      allResults.push(...batchResults);
      
      // Small delay between batches to avoid rate limits
      if (i + batchSize < pagesToAnalyze.length) {
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }

    // Sort by page number
    allResults.sort((a, b) => a.page - b.page);

    const combinedDescription = `**Complete Document Analysis (${imageUrls.length} pages):**\n\n` +
      allResults.map(r => `**Page ${r.page}:**\n${r.content}`).join('\n\n---\n\n');

    return NextResponse.json({
      description: combinedDescription,
      pages: allResults,
      totalPages: imageUrls.length,
      analyzedPages: allResults.length,
      strategy: 'complete',
      processingTime: `Processed ${allResults.length} pages`
    }, {
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error: any) {
    console.error('Batch vision API error:', error);
    return NextResponse.json(
      { 
        error: error.message || 'Failed to process images',
        debug: { 
          message: error.message,
          stack: error.stack?.substring(0, 300)
        }
      },
      { 
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      }
    );
  }
}