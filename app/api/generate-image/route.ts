// app\api\generate-image\route.ts
import { NextRequest, NextResponse } from 'next/server';
import { openai } from '@/lib/openai';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { prompt, size = '1024x1024', quality = 'standard' } = body;

    if (!prompt) {
      return NextResponse.json(
        { error: 'Prompt is required' },
        { status: 400 }
      );
    }

    if (!process.env.OPENAI_API_KEY) {
      return NextResponse.json(
        { error: 'OpenAI API key is not configured' },
        { status: 500 }
      );
    }

    const response = await openai.images.generate({
      model: 'dall-e-3',
      prompt: prompt,
      n: 1,
      size: size as '1024x1024' | '1792x1024' | '1024x1792',
      quality: quality as 'standard' | 'hd',
    });

    // ✅ FIX: Add proper null checking
    if (!response.data || response.data.length === 0) {
      return NextResponse.json(
        { error: 'No image was generated' },
        { status: 500 }
      );
    }

    const imageData = response.data[0];
    
    if (!imageData || !imageData.url) {
      return NextResponse.json(
        { error: 'Image URL not available' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      imageUrl: imageData.url,
      revisedPrompt: imageData.revised_prompt || prompt,
    });
  } catch (error: any) {
    console.error('Image generation error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to generate image' },
      { status: 500 }
    );
  }
}