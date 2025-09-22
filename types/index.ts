export interface Message {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: Date;
  imageUrls?: string[];
  fileUrls?: string[];
  pdfInfo?: PDFInfo[];
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


// Add this new interface for PDF information
export interface PDFInfo {
  name: string;
  pageCount: number;
  hasImages: boolean;
  hasText: boolean;
  conversionSuccess: boolean;
}



// Add file upload response types
export interface UploadResponse {
  url: string;
  type: string;
  name: string;
  size: number;
  isPdf?: boolean;
  pdfImages?: string[];
  extractedText?: string;
  pageCount?: number;
  conversionSuccess?: boolean;
  processingError?: string;
  parseWarning?: string;
}