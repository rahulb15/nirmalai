import { NextResponse } from 'next/server';
import { openai } from '@/lib/openai';

export async function GET() {
  try {
    const response = await openai.chat.completions.create({
      model: 'gpt-4-vision-preview',
      messages: [{ role: 'user', content: 'test' }],
      max_tokens: 10,
    });
    
    return NextResponse.json({ 
      status: 'ok',
      message: 'OpenAI API working'
    });
  } catch (error: any) {
    return NextResponse.json({ 
      status: 'error',
      message: error.message,
      code: error.code,
    }, { status: 500 });
  }
}