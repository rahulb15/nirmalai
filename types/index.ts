// types\index.ts
export interface Message {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: Date;
  imageUrls?: string[];
  fileUrls?: string[];
}

export interface ChatRequest {
  messages: Message[];
  model?: string;
  temperature?: number;
  max_tokens?: number;
}

export interface ChatRequestNew {
  messages: Message[];
  model?: string;
  temperature?: number;
  max_completion_tokens?: number;
}

export interface ChatResponse {
  message: Message;
  error?: string;
}

export interface FileUploadResponse {
  url: string;
  type: string;
  name: string;
  extractedText?: string;
  pageCount?: number;
  isPdf?: boolean;
  error?: string;
}