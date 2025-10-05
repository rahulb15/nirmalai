// components\FileUpload.tsx
'use client';

import { useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { Upload, Image, FileText } from 'lucide-react';

interface Props {
  onUpload: (files: File[]) => void;
}

export default function FileUpload({ onUpload }: Props) {
  const onDrop = useCallback(
    (acceptedFiles: File[]) => {
      onUpload(acceptedFiles);
    },
    [onUpload]
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'image/*': ['.png', '.jpg', '.jpeg', '.gif', '.webp', '.bmp', '.tiff'],
      'application/pdf': ['.pdf'],
      'text/plain': ['.txt'],
      'application/msword': ['.doc'],
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx'],
    },
    maxSize: 100 * 1024 * 1024, // 100MB limit
  });

  return (
    <div
      {...getRootProps()}
      className={`
        w-full sm:w-80 p-4 sm:p-6 bg-white rounded-xl sm:rounded-2xl shadow-xl cursor-pointer
        border-2 border-dashed transition-colors
        ${isDragActive ? 'border-purple-500 bg-purple-50' : 'border-gray-300 hover:border-gray-400'}
      `}
    >
      <input {...getInputProps()} />
      
      <div className="text-center">
        <div className="mx-auto w-12 h-12 sm:w-16 sm:h-16 bg-gradient-to-br from-purple-500 to-pink-500 rounded-full flex items-center justify-center mb-3 sm:mb-4">
          <Upload className="w-6 h-6 sm:w-8 sm:h-8 text-white" />
        </div>
        
        <h3 className="text-base sm:text-lg font-semibold text-gray-800 mb-1.5 sm:mb-2">
          {isDragActive ? 'Drop files here' : 'Upload Files'}
        </h3>
        
        <p className="text-xs sm:text-sm text-gray-600 mb-3 sm:mb-4">
          Drag & drop or click to browse
        </p>

        <div className="flex items-center justify-center gap-3 sm:gap-4 text-xs text-gray-500">
          <div className="flex items-center gap-1">
            <Image className="w-3 h-3 sm:w-4 sm:h-4" />
            <span>Images</span>
          </div>
          <div className="flex items-center gap-1">
            <FileText className="w-3 h-3 sm:w-4 sm:h-4" />
            <span>PDF & Docs</span>
          </div>
        </div>

        <p className="text-xs text-gray-400 mt-2 sm:mt-3">
          Max file size: 100MB
        </p>
      </div>
    </div>
  );
}