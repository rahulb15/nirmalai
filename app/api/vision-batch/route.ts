// app\api\vision-batch\route.ts
import { NextRequest, NextResponse } from 'next/server';
import { openai, MODELS } from '@/lib/openai';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { imageUrls, prompt = 'Extract all text and information' } = body;

    if (!imageUrls || imageUrls.length === 0) {
      return NextResponse.json({ error: 'Image URLs required' }, { status: 400 });
    }

    console.log(`Batch processing ${imageUrls.length} images`);

    // Smart strategy selection
    let pagesToAnalyze = imageUrls;
    let analysisStrategy = 'complete';
    
    // if (imageUrls.length > 10) {
    if (imageUrls.length > 25) {  // Only sample for 25+ pages
      // For large documents, analyze key pages
      const keyPages = [0]; // First page
      
      // Every 3rd page
      for (let i = 2; i < imageUrls.length - 1; i += 3) {
        keyPages.push(i);
      }
      
      // Last page
      if (imageUrls.length > 1) {
        keyPages.push(imageUrls.length - 1);
      }
      
    //   pagesToAnalyze = keyPages.map(i => ({ url: imageUrls[i], originalPage: i + 1 }));
    //   analysisStrategy = 'sampling';
    pagesToAnalyze = imageUrls.map((url:any, i:any) => ({ url, originalPage: i + 1 }));
analysisStrategy = 'complete';
      
      console.log(`Using sampling: analyzing ${pagesToAnalyze.length} key pages from ${imageUrls.length} total`);
    } else {
      pagesToAnalyze = imageUrls.map((url:any, i:any) => ({ url, originalPage: i + 1 }));
    }

    // Process in parallel batches
    const batchSize = 5;
    const allResults = [];
    
    for (let i = 0; i < pagesToAnalyze.length; i += batchSize) {
      const batch = pagesToAnalyze.slice(i, i + batchSize);
      console.log(`Processing batch ${Math.floor(i / batchSize) + 1}, pages: ${batch.map((p:any) => p.originalPage).join(', ')}`);
      
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
                    text: analysisStrategy === 'sampling' 
                      ? `This is page ${page.originalPage} of a ${imageUrls.length}-page document. Extract the most important text, headings, and key information. Focus on main content.`
                      : `Extract all text and key information from page ${page.originalPage}. Be comprehensive but concise.`
                  },
                  { type: 'image_url', image_url: { url: page.url } },
                ],
              },
            ],
            max_completion_tokens: analysisStrategy === 'sampling' ? 600 : 800,
          });

          return {
            page: page.originalPage,
            content: response.choices[0]?.message?.content || 'No content extracted',
            isSampled: analysisStrategy === 'sampling'
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
      
      // Small delay between batches
      if (i + batchSize < pagesToAnalyze.length) {
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }

    // Sort by page number
    allResults.sort((a, b) => a.page - b.page);

    let combinedDescription;
    if (analysisStrategy === 'sampling') {
      combinedDescription = `**Document Summary (${imageUrls.length} pages, analyzed ${allResults.length} key pages):**\n\n` +
        allResults.map(r => `**Page ${r.page}:**\n${r.content}`).join('\n\n---\n\n') +
        `\n\n*Note: This is a smart analysis of key pages for quick overview. For complete analysis, use fewer pages at a time.*`;
    } else {
      combinedDescription = `**Complete Document Analysis (${imageUrls.length} pages):**\n\n` +
        allResults.map(r => `**Page ${r.page}:**\n${r.content}`).join('\n\n---\n\n');
    }

    return NextResponse.json({
      description: combinedDescription,
      pages: allResults,
      totalPages: imageUrls.length,
      analyzedPages: allResults.length,
      strategy: analysisStrategy,
      processingTime: `Processed ${allResults.length} pages using ${analysisStrategy} mode`
    });

  } catch (error: any) {
    console.error('Batch vision API error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to process images' },
      { status: 500 }
    );
  }
}