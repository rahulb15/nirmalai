import OpenAI from 'openai';

if (!process.env.OPENAI_API_KEY) {
  throw new Error('OPENAI_API_KEY is not defined in environment variables');
}

export const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export const MODELS = {
  GPT4: 'gpt-5',
  GPT4_VISION: 'gpt-5',
  GPT35: 'gpt-5',
  GPTIMAGE: 'gpt-image-1',
} as const;