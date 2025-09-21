import { NextRequest, NextResponse } from 'next/server';
import { openai, MODELS } from '@/lib/openai';
import { ChatRequest,ChatRequestNew } from '@/types';

export async function POST(req: NextRequest) {
  try {
    const body: ChatRequestNew = await req.json();
    const { messages, model = MODELS.GPT35, temperature = 0.7, max_completion_tokens = 2000 } = body;

    if (!messages || messages.length === 0) {
      return NextResponse.json(
        { error: 'Messages are required' },
        { status: 400 }
      );
    }

    // Convert messages to OpenAI format
    const openAIMessages = messages.map((msg) => ({
      role: msg.role,
      content: msg.content,
    }));

    const completion = await openai.chat.completions.create({
      model,
      messages: openAIMessages,
    //   temperature,
      max_completion_tokens,
    });

    const assistantMessage = {
      id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      role: 'assistant' as const,
      content: completion.choices[0]?.message?.content || 'No response generated',
      timestamp: new Date(),
    };

    return NextResponse.json({ message: assistantMessage });
  } catch (error: any) {
    console.error('Chat API error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to process chat request' },
      { status: 500 }
    );
  }
}