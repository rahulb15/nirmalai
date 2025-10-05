import { NextRequest, NextResponse } from 'next/server';
import { openai, MODELS } from '@/lib/openai';

export const maxDuration = 300; // 5 minutes
export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  console.log('\n=== VISION BATCH START ===');
  
  try {
    const body = await req.json();
    const { imageUrls, prompt = 'Extract all text and information' } = body;

    if (!imageUrls || imageUrls.length === 0) {
      return NextResponse.json(
        { error: 'Image URLs required' },
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Processing ${imageUrls.length} images`);

    const pagesToAnalyze = imageUrls.map((url: any, i: any) => ({ 
      url, 
      originalPage: i + 1 
    }));

    const batchSize = 3; // Reduced from 5 to avoid rate limits
    const allResults = [];
    let successCount = 0;
    let errorCount = 0;
    
    for (let i = 0; i < pagesToAnalyze.length; i += batchSize) {
      const batch = pagesToAnalyze.slice(i, i + batchSize);
      const batchNum = Math.floor(i / batchSize) + 1;
      const totalBatches = Math.ceil(pagesToAnalyze.length / batchSize);
      
      console.log(`Batch ${batchNum}/${totalBatches}: pages ${batch.map((p: any) => p.originalPage).join(', ')}`);
      
      const batchPromises = batch.map(async (page: any) => {
        const startTime = Date.now();
        try {
          console.log(`  - Processing page ${page.originalPage}...`);
          
          // Wrap OpenAI call with timeout
          const visionPromise = openai.chat.completions.create({
            model: MODELS.GPT4_VISION,
            messages: [
              {
                role: 'user',
                content: [
                  { 
                    type: 'text', 
                    text: `Extract all text and information from page ${page.originalPage}.`
                  },
                  { 
                    type: 'image_url', 
                    image_url: { 
                      url: page.url,
                      detail: 'high'
                    } 
                  },
                ],
              },
            ],
            max_tokens: 800,
          });

          // Add 60 second timeout
          const timeoutPromise = new Promise((_, reject) => 
            setTimeout(() => reject(new Error('Request timeout after 60s')), 60000)
          );

          const response = await Promise.race([visionPromise, timeoutPromise]) as any;

          const duration = Date.now() - startTime;
          console.log(`  ✓ Page ${page.originalPage} done (${duration}ms)`);

          return {
            page: page.originalPage,
            content: response.choices[0]?.message?.content || 'No content extracted',
            success: true,
          };
        } catch (error: any) {
          const duration = Date.now() - startTime;
          console.error(`  ✗ Page ${page.originalPage} failed (${duration}ms):`, error.message);
          
          // Return partial result instead of failing completely
          return {
            page: page.originalPage,
            content: `[Page ${page.originalPage} analysis failed: ${error.message}]`,
            error: true,
            success: false,
          };
        }
      });

      try {
        const batchResults = await Promise.all(batchPromises);
        allResults.push(...batchResults);
        
        // Count successes/errors
        batchResults.forEach(r => {
          if (r.success) successCount++;
          else errorCount++;
        });
        
        console.log(`Batch ${batchNum} complete. Success: ${successCount}, Errors: ${errorCount}`);
        
      } catch (batchError: any) {
        console.error(`Batch ${batchNum} failed completely:`, batchError);
        
        // Add placeholder results for failed batch
        batch.forEach((page: any) => {
          allResults.push({
            page: page.originalPage,
            content: `[Page ${page.originalPage} - batch processing failed]`,
            error: true,
            success: false,
          });
          errorCount++;
        });
      }
      
      // Delay between batches to avoid rate limits
      if (i + batchSize < pagesToAnalyze.length) {
        console.log('Waiting 2s before next batch...');
        await new Promise(resolve => setTimeout(resolve, 2000));
      }
    }

    // Sort by page number
    allResults.sort((a, b) => a.page - b.page);

    console.log(`\n=== BATCH COMPLETE ===`);
    console.log(`Total: ${allResults.length}, Success: ${successCount}, Errors: ${errorCount}`);

    const combinedDescription = `**Complete Document Analysis (${imageUrls.length} pages):**\n\n` +
      allResults.map(r => {
        const prefix = r.error ? '⚠️ ' : '';
        return `${prefix}**Page ${r.page}:**\n${r.content}`;
      }).join('\n\n---\n\n');

    const finalMessage = errorCount > 0 
      ? `\n\n⚠️ Note: ${errorCount} page(s) had processing errors. Successfully analyzed ${successCount} pages.`
      : `\n\n✅ Successfully analyzed all ${successCount} pages.`;

    return NextResponse.json({
      description: combinedDescription + finalMessage,
      pages: allResults,
      totalPages: imageUrls.length,
      analyzedPages: allResults.length,
      successCount,
      errorCount,
      strategy: 'complete',
    }, {
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error: any) {
    console.error('\n=== BATCH CRITICAL ERROR ===');
    console.error('Error:', error.message);
    console.error('Stack:', error.stack?.substring(0, 500));
    
    return NextResponse.json(
      { 
        error: `Vision processing failed: ${error.message}`,
        debug: { 
          message: error.message,
          type: error.name || 'Unknown',
        }
      },
      { 
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      }
    );
  }
}