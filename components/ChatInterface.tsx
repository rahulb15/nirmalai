// components\ChatInterface.tsx
'use client';

import { useState, useRef, useEffect } from 'react';
import Image from 'next/image';
import { Message } from '@/types';
import { generateId } from '@/lib/utils';
import MessageList from './MessageList';
import InputArea from './InputArea';
import { Sparkles, Eye } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { LogOut } from 'lucide-react';

export default function ChatInterface() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [uploadedFiles, setUploadedFiles] = useState<any[]>([]);
  const [imageMode, setImageMode] = useState<'analyze' | 'generate'>('analyze');
    const [processingProgress, setProcessingProgress] = useState<string>(''); // Add this
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const router = useRouter();


  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

// const handleSendMessage = async (content: string) => {
//   if (!content.trim() && uploadedFiles.length === 0) return;

//   const imageFiles = uploadedFiles.filter(f => f.type?.startsWith('image/'));
//   const pdfFiles = uploadedFiles.filter(f => f.isPdf);

//   let enhancedContent = content;
//   let allImageUrls = [];

//   // Collect regular image URLs
//   allImageUrls.push(...imageFiles.map(f => f.url));

//   // Collect PDF page images
//   pdfFiles.forEach(pdf => {
//     if (pdf.pdfImages && pdf.pdfImages.length > 0) {
//       allImageUrls.push(...pdf.pdfImages.map((page:any) => page.url));
//     }
//   });

//   const userMessage: Message = {
//     id: generateId(),
//     role: 'user',
//     content: content.trim() || 'Uploaded files',
//     timestamp: new Date(),
//     imageUrls: allImageUrls,
//   };

//   setMessages(prev => [...prev, userMessage]);
//   setIsLoading(true);
//   setUploadedFiles([]);

//   try {
//     if (imageMode === 'generate' && content.trim()) {
//       // Image generation logic (same as before)
//       const response = await fetch('/api/generate-image', {
//         method: 'POST',
//         headers: { 'Content-Type': 'application/json' },
//         body: JSON.stringify({ prompt: content }),
//       });
//       const data = await response.json();
//       if (data.error) throw new Error(data.error);
      
//       setMessages(prev => [...prev, {
//         id: generateId(),
//         role: 'assistant',
//         content: `🎨 Image Generated!\n\n${data.revisedPrompt || content}`,
//         timestamp: new Date(),
//         imageUrls: [data.imageUrl],
//       }]);
//     }
//     else if (allImageUrls.length > 0) {
//       // Image/PDF analysis
//       const response = await fetch('/api/vision', {
//         method: 'POST',
//         headers: { 'Content-Type': 'application/json' },
//         body: JSON.stringify({
//           imageUrls: allImageUrls, // Send all images including PDF pages
//           prompt: content || 'Analyze these images and extract all text and information',
//         }),
//       });
//       const data = await response.json();
//       if (data.error) throw new Error(data.error);
      
//       setMessages(prev => [...prev, {
//         id: generateId(),
//         role: 'assistant',
//         content: data.description,
//         timestamp: new Date(),
//       }]);
//     }
//     else {
//       // Regular chat
//       const response = await fetch('/api/chat', {
//         method: 'POST',
//         headers: { 'Content-Type': 'application/json' },
//         body: JSON.stringify({ 
//           messages: [
//             ...messages.map(m => ({ role: m.role, content: m.content })),
//             { role: 'user', content: enhancedContent }
//           ]
//         }),
//       });
//       const data = await response.json();
//       if (data.error) throw new Error(data.error);
      
//       setMessages(prev => [...prev, data.message]);
//     }
//   } catch (error: any) {
//     setMessages(prev => [...prev, {
//       id: generateId(),
//       role: 'assistant',
//       content: `Error: ${error.message}`,
//       timestamp: new Date(),
//     }]);
//   } finally {
//     setIsLoading(false);
//   }
// };


// Add this before handleSendMessage function
const fetchWithRetry = async (url: string, options: RequestInit, retries = 2) => {
  for (let i = 0; i < retries; i++) {
    try {
      const response = await fetch(url, options);
      
      // Check if we got JSON
      const contentType = response.headers.get('content-type');
      if (!contentType || !contentType.includes('application/json')) {
        const text = await response.text();
        console.error(`Attempt ${i + 1}: Non-JSON response:`, text.substring(0, 200));
        
        if (i === retries - 1) {
          throw new Error('Server returned HTML instead of JSON. Please check server logs and try again.');
        }
        
        // Wait before retry
        await new Promise(resolve => setTimeout(resolve, 2000));
        continue;
      }
      
      return response;
      
    } catch (error: any) {
      console.error(`Attempt ${i + 1} failed:`, error.message);
      
      if (i === retries - 1) {
        throw error;
      }
      
      await new Promise(resolve => setTimeout(resolve, 2000));
    }
  }
  
  throw new Error('All retry attempts failed');
};

const handleSendMessage = async (content: string) => {
  if (!content.trim() && uploadedFiles.length === 0) return;

  const imageFiles = uploadedFiles.filter(f => f.type?.startsWith('image/'));
  const pdfFiles = uploadedFiles.filter(f => f.isPdf);

  let allImageUrls = [];
  allImageUrls.push(...imageFiles.map(f => f.url));

  pdfFiles.forEach(pdf => {
    if (pdf.pdfImages && pdf.pdfImages.length > 0) {
      allImageUrls.push(...pdf.pdfImages.map((page:any) => page.url));
    }
  });

  const userMessage: Message = {
    id: generateId(),
    role: 'user',
    content: content.trim() || 'Uploaded files',
    timestamp: new Date(),
    imageUrls: allImageUrls,
  };

  setMessages(prev => [...prev, userMessage]);
  setIsLoading(true);
  setUploadedFiles([]);

  // Set processing progress
  if (allImageUrls.length > 5) {
    setProcessingProgress(`Processing ${allImageUrls.length} images with parallel batching...`);
  }

  try {
    if (imageMode === 'generate' && content.trim()) {
      // Image generation
      const response = await fetch('/api/generate-image', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: content }),
      });

      // Check if response is JSON
      const contentType = response.headers.get('content-type');
      if (!contentType || !contentType.includes('application/json')) {
        const text = await response.text();
        console.error('Non-JSON response from generate-image:', text.substring(0, 500));
        throw new Error('Server returned HTML instead of JSON. Check server logs.');
      }

      const data = await response.json();
      if (data.error) throw new Error(data.error);
      
      setMessages(prev => [...prev, {
        id: generateId(),
        role: 'assistant',
        content: `🎨 Image Generated!\n\n${data.revisedPrompt || content}`,
        timestamp: new Date(),
        imageUrls: [data.imageUrl],
      }]);
    }
    else if (allImageUrls.length > 0) {
  const endpoint = allImageUrls.length > 5 ? '/api/vision-batch' : '/api/vision';
  
  console.log(`Using ${endpoint} for ${allImageUrls.length} images`);
  
  if (allImageUrls.length > 10) {
    setProcessingProgress(`Processing ${allImageUrls.length} pages... This may take 2-3 minutes.`);
  } else if (allImageUrls.length > 5) {
    setProcessingProgress(`Processing ${allImageUrls.length} images in batches...`);
  }
  
  try {
    const response = await fetchWithRetry(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        imageUrls: allImageUrls,
        prompt: content || 'Analyze these images and extract all text and information',
      }),
    });
    
    const data = await response.json();
    if (data.error) throw new Error(data.error);
    
    let responseContent = data.description;
    
    if (data.errorCount > 0) {
      responseContent += `\n\n⚠️ ${data.errorCount} page(s) had processing errors.`;
    } else if (data.totalPages > 5) {
      responseContent += `\n\n✅ Successfully processed all ${data.totalPages} pages.`;
    }
    
    setMessages(prev => [...prev, {
      id: generateId(),
      role: 'assistant',
      content: responseContent,
      timestamp: new Date(),
    }]);
    
  } catch (visionError: any) {
    throw new Error(`Vision API error: ${visionError.message}`);
  }
}
    else {
      // Regular chat
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          messages: [
            ...messages.map(m => ({ role: m.role, content: m.content })),
            { role: 'user', content: content }
          ]
        }),
      });

      // Check if response is JSON
      const contentType = response.headers.get('content-type');
      if (!contentType || !contentType.includes('application/json')) {
        const text = await response.text();
        console.error('Non-JSON response from chat:', text.substring(0, 500));
        throw new Error('Server returned HTML instead of JSON. Check server logs.');
      }
      
      const data = await response.json();
      if (data.error) throw new Error(data.error);
      
      setMessages(prev => [...prev, data.message]);
    }
    
  } catch (error: any) {
    console.error('Chat error:', error);
    setMessages(prev => [...prev, {
      id: generateId(),
      role: 'assistant',
      content: `❌ Error: ${error.message}`,
      timestamp: new Date(),
    }]);
  } finally {
    setIsLoading(false);
    setProcessingProgress('');
  }
};


  const handleLogout = async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
      router.push('/login');
      router.refresh();
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

// const handleFileUpload = async (files: File[]) => {
//   const uploadPromises = files.map(async (file) => {
//     const formData = new FormData();
//     formData.append('file', file);

//     const response = await fetch('/api/upload', {
//       method: 'POST',
//       body: formData,
//     });

//     if (!response.ok) {
//       throw new Error('Upload failed');
//     }

//     return response.json(); // This should include extractedText for PDFs
//   });

//   try {
//     const results = await Promise.all(uploadPromises);
//     setUploadedFiles(prev => [...prev, ...results]);
//   } catch (error) {
//     console.error('Upload error:', error);
//     alert('Failed to upload files');
//   }
// };

const handleFileUpload = async (files: File[]) => {
  const uploadPromises = files.map(async (file) => {
    const formData = new FormData();
    formData.append('file', file);

    try {
      console.log(`Uploading ${file.name}...`);
      
      const response = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      });

      // Check content type
      const contentType = response.headers.get('content-type');
      console.log('Response content-type:', contentType);

      if (!contentType || !contentType.includes('application/json')) {
        // Server returned HTML instead of JSON
        const text = await response.text();
        console.error('Server returned HTML:', text.substring(0, 500));
        
        throw new Error('Server error: Received HTML instead of JSON. Check server logs.');
      }

      const data = await response.json();

      if (!response.ok) {
        const errorMsg = data.error || 'Upload failed';
        const debugMsg = data.debug ? `\n\nDebug: ${JSON.stringify(data.debug, null, 2)}` : '';
        
        console.error('Upload failed:', data);
        alert(`Upload Failed\n\n${errorMsg}${debugMsg}`);
        
        throw new Error(errorMsg);
      }

      console.log('Upload success:', file.name);
      return data;

    } catch (error: any) {
      console.error('Upload error:', error);
      alert(`Error: ${file.name}\n\n${error.message}`);
      throw error;
    }
  });

  try {
    const results = await Promise.all(uploadPromises);
    setUploadedFiles(prev => [...prev, ...results]);
  } catch (error) {
    console.error('Batch upload failed:', error);
  }
};

  return (
    <div className="flex flex-col h-screen bg-blue-900">
      {/* Header with Toggle */}
      <header className="bg-white/10 backdrop-blur-lg border-b border-white/20 px-3 sm:px-4 md:px-6 py-3 md:py-4">
        <div className="max-w-6xl mx-auto">
          <div className="flex items-center justify-between gap-2 md:gap-4">
            <div className="flex flex-col gap-0.5 md:gap-1 min-w-0">
              {/* App Logo and Name */}
              <div className="flex items-center gap-2 md:gap-3">
                <Image 
                  src="/2.jpg" 
                  alt="Nirmal AI Logo" 
                  width={32} 
                  height={32}
                  className="w-8 h-8 md:w-10 md:h-10 rounded-lg flex-shrink-0"
                />
                <h1 className="text-lg sm:text-xl md:text-2xl font-bold text-white truncate">
                  Nirmal AI
                </h1>
              </div>
              {/* Powered By with Logo */}
              <div className="flex items-center gap-1 md:gap-2 ml-0.5 md:ml-1">
                <p className="text-xs md:text-sm text-blue-200">Powered by</p>
                <Image 
                  src="/1.png" 
                  alt="Bheem Bharat Logo" 
                  width={16} 
                  height={16}
                  className="w-4 h-4 md:w-5 md:h-5 rounded flex-shrink-0"
                />
                <p className="text-xs md:text-sm text-blue-200 font-medium truncate">
                  Bheem Bharat
                </p>
              </div>
            </div>

            {/* Image Mode Toggle */}
            <div className="flex items-center gap-1 sm:gap-2 md:gap-3 bg-white/20 rounded-full p-0.5 md:p-1">
              <button
                onClick={() => setImageMode('analyze')}
                className={`flex items-center gap-1 md:gap-2 px-2 sm:px-3 md:px-4 py-1.5 md:py-2 rounded-full transition-all text-xs sm:text-sm ${
                  imageMode === 'analyze'
                    ? 'bg-white text-purple-600 shadow-lg'
                    : 'text-white hover:bg-white/10'
                }`}
              >
                <Eye className="w-3 h-3 md:w-4 md:h-4" />
                <span className="hidden sm:inline font-medium">Analyze</span>
              </button>
              <button
                onClick={() => setImageMode('generate')}
                className={`flex items-center gap-1 md:gap-2 px-2 sm:px-3 md:px-4 py-1.5 md:py-2 rounded-full transition-all text-xs sm:text-sm ${
                  imageMode === 'generate'
                    ? 'bg-white text-purple-600 shadow-lg'
                    : 'text-white hover:bg-white/10'
                }`}
              >
                <Sparkles className="w-3 h-3 md:w-4 md:h-4" />
                <span className="hidden sm:inline font-medium">Generate</span>
              </button>

                          <button
              onClick={handleLogout}
              className="p-2 rounded-lg bg-white/10 hover:bg-white/20 transition-colors"
              title="Logout"
            >
              <LogOut className="w-5 h-5 text-white" />
            </button>
            </div>
          </div>
        </div>
      </header>

      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto px-2 sm:px-4 py-4 md:py-6">
        <div className="max-w-4xl mx-auto">
          {messages.length === 0 ? (
            <div className="text-center text-white/70 mt-10 md:mt-20 px-4">
              <h2 className="text-2xl sm:text-3xl font-bold mb-3 md:mb-4">Welcome! 👋</h2>
              <p className="text-base sm:text-lg mb-4 md:mb-6">
                {imageMode === 'analyze' 
                  ? 'Upload an image to analyze it with AI'
                  : 'Type a description to generate an image with DALL-E'}
              </p>
              
              {/* Mode Info Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 md:gap-4 max-w-2xl mx-auto mt-6 md:mt-8">
                <div className={`p-4 sm:p-5 md:p-6 rounded-xl md:rounded-2xl transition-all ${
                  imageMode === 'analyze' 
                    ? 'bg-white/20 border-2 border-white/40' 
                    : 'bg-white/10'
                }`}>
                  <Eye className="w-6 h-6 sm:w-7 sm:h-7 md:w-8 md:h-8 mx-auto mb-2 md:mb-3 text-blue-300" />
                  <h3 className="font-semibold text-white mb-1 md:mb-2 text-sm sm:text-base">Analyze Mode</h3>
                  <p className="text-xs sm:text-sm text-white/70">Upload images and ask questions about them</p>
                </div>
                
                <div className={`p-4 sm:p-5 md:p-6 rounded-xl md:rounded-2xl transition-all ${
                  imageMode === 'generate' 
                    ? 'bg-white/20 border-2 border-white/40' 
                    : 'bg-white/10'
                }`}>
                  <Sparkles className="w-6 h-6 sm:w-7 sm:h-7 md:w-8 md:h-8 mx-auto mb-2 md:mb-3 text-pink-300" />
                  <h3 className="font-semibold text-white mb-1 md:mb-2 text-sm sm:text-base">Generate Mode</h3>
                  <p className="text-xs sm:text-sm text-white/70">Create images from text descriptions</p>
                </div>
              </div>
            </div>
          ) : (
            <MessageList messages={messages} />
          )}
          {/* {isLoading && (
            <div className="flex items-center justify-center py-4">
              <div className="animate-spin rounded-full h-6 w-6 md:h-8 md:w-8 border-b-2 border-white"></div>
            </div>
          )} */}
          {isLoading && (
  <div className="flex flex-col items-center justify-center py-4">
    <div className="animate-spin rounded-full h-6 w-6 md:h-8 md:w-8 border-b-2 border-white mb-2"></div>
    {processingProgress && (
      <p className="text-white/70 text-sm text-center">
        {processingProgress}
      </p>
    )}
  </div>
)}
          <div ref={messagesEndRef} />
        </div>
      </div>

      {/* Input Area */}
      <InputArea
        onSendMessage={handleSendMessage}
        onFileUpload={handleFileUpload}
        isLoading={isLoading}
        uploadedFiles={uploadedFiles}
        onRemoveFile={(index) => setUploadedFiles(prev => prev.filter((_, i) => i !== index))}
        imageMode={imageMode}
      />
    </div>
  );
}