// components\InputArea.tsx
'use client';

import { useState, KeyboardEvent } from 'react';
import { Send, Image, X, Sparkles, Eye } from 'lucide-react';
import FileUpload from './FileUpload';

interface Props {
  onSendMessage: (content: string) => void;
  onFileUpload: (files: File[]) => void;
  isLoading: boolean;
  uploadedFiles: any[];
  onRemoveFile: (index: number) => void;
  imageMode: 'analyze' | 'generate';
}

export default function InputArea({
  onSendMessage,
  onFileUpload,
  isLoading,
  uploadedFiles,
  onRemoveFile,
  imageMode,
}: Props) {
  const [input, setInput] = useState('');
  const [showFileUpload, setShowFileUpload] = useState(false);

  const handleSubmit = () => {
    if (input.trim() || uploadedFiles.length > 0) {
      onSendMessage(input);
      setInput('');
    }
  };

  const handleKeyPress = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  const getPlaceholder = () => {
    if (imageMode === 'generate') {
      return 'Describe the image you want to generate...';
    }
    return 'Type your message here...';
  };

  return (
    <div className="bg-white/10 backdrop-blur-lg border-t border-white/20 px-2 sm:px-4 py-3 sm:py-4">
      <div className="max-w-4xl mx-auto">
        {/* Mode Indicator */}
        <div className="mb-2 flex items-center gap-1.5 md:gap-2 text-xs text-white/70">
          {imageMode === 'analyze' ? (
            <>
              <Eye className="w-3 h-3 flex-shrink-0" />
              <span className="truncate">
                <span className="hidden sm:inline">Image Analysis Mode - </span>
                <span>Upload image to analyze</span>
              </span>
            </>
          ) : (
            <>
              <Sparkles className="w-3 h-3 flex-shrink-0" />
              <span className="truncate">
                <span className="hidden sm:inline">Image Generation Mode - </span>
                <span>Describe to create</span>
              </span>
            </>
          )}
        </div>

        {/* Uploaded Files Preview */}
        {uploadedFiles.length > 0 && (
          <div className="mb-2 md:mb-3 flex flex-wrap gap-1.5 md:gap-2">
            {uploadedFiles.map((file, index) => (
              <div
                key={index}
                className="flex items-center gap-1.5 md:gap-2 bg-white/20 rounded-lg px-2 md:px-3 py-1.5 md:py-2 text-xs md:text-sm text-white"
              >
                <Image className="w-3 h-3 md:w-4 md:h-4 flex-shrink-0" />
                {/* <span className="truncate max-w-[100px] sm:max-w-[150px]">{file.name}</span> */}
    <span className="truncate">
      {file.name}
      {file.pdfImages && ` (${file.pageCount} pages)`}
    </span>
                <button
                  onClick={() => onRemoveFile(index)}
                  className="hover:bg-white/20 rounded p-0.5 md:p-1"
                >
                  <X className="w-3 h-3 md:w-4 md:h-4" />
                </button>
              </div>
            ))}
          </div>
        )}

        {/* Input Container */}
        <div className="flex items-end gap-2 md:gap-3">
          {/* File Upload Button */}
          {imageMode === 'analyze' && (
            <div className="relative">
              <button
                onClick={() => setShowFileUpload(!showFileUpload)}
                className="p-2 md:p-3 rounded-xl bg-white/20 hover:bg-white/30 transition-colors text-white"
                disabled={isLoading}
                title="Upload image to analyze"
              >
                <Image className="w-4 h-4 md:w-5 md:h-5" />
              </button>
              {showFileUpload && (
                <div className="fixed sm:absolute bottom-20 sm:bottom-full left-2 right-2 sm:left-0 sm:right-auto mb-2 z-50">
                  <FileUpload
                    onUpload={(files) => {
                      onFileUpload(files);
                      setShowFileUpload(false);
                    }}
                  />
                </div>
              )}
            </div>
          )}

          {/* Text Input */}
          <div className="flex-1 bg-white/20 rounded-xl md:rounded-2xl border border-white/30 focus-within:border-white/50 transition-colors">
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder={getPlaceholder()}
              className="w-full bg-transparent text-white placeholder-white/60 px-3 sm:px-4 md:px-5 py-2.5 sm:py-3 md:py-4 rounded-xl md:rounded-2xl resize-none focus:outline-none text-sm md:text-base"
              rows={1}
              style={{
                minHeight: '44px',
                maxHeight: '150px',
              }}
              disabled={isLoading}
            />
          </div>

          {/* Send Button */}
          <button
            onClick={handleSubmit}
            disabled={isLoading || (!input.trim() && uploadedFiles.length === 0)}
            className={`p-2 md:p-3 rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed text-white flex-shrink-0 ${
              imageMode === 'generate'
                ? 'bg-gradient-to-br from-pink-600 to-purple-600 hover:from-pink-700 hover:to-purple-700'
                : 'bg-gradient-to-br from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700'
            }`}
          >
            {imageMode === 'generate' ? (
              <Sparkles className="w-4 h-4 md:w-5 md:h-5" />
            ) : (
              <Send className="w-4 h-4 md:w-5 md:h-5" />
            )}
          </button>
        </div>

        {/* Help Text */}
        <div className="text-center text-white/60 text-xs mt-1.5 md:mt-2">
          {imageMode === 'generate' 
            ? '💡 Tip: Be descriptive! Include details like style, colors, mood'
            : (
              <>
                <span className="hidden sm:inline">Press Enter to send • Shift + Enter for new line</span>
                <span className="sm:hidden">Tap send to submit</span>
              </>
            )
          }
        </div>
      </div>
    </div>
  );
}