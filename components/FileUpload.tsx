'use client';

import { useCallback, useState } from 'react';
import { useDropzone } from 'react-dropzone';
import { Upload, Image, FileText, AlertCircle, CheckCircle } from 'lucide-react';

interface Props {
  onUpload: (files: File[]) => void;
}

interface FilePreview {
  file: File;
  id: string;
  status: 'pending' | 'validating' | 'ready' | 'error';
  error?: string;
}

export default function FileUpload({ onUpload }: Props) {
  const [filePreviews, setFilePreviews] = useState<FilePreview[]>([]);
  const [isDragActive, setIsDragActive] = useState(false);

  const validateFile = (file: File): { isValid: boolean; error?: string } => {
    // Check file size (100MB limit)
    const maxSize = 100 * 1024 * 1024;
    if (file.size > maxSize) {
      return {
        isValid: false,
        error: `File size ${Math.round(file.size / 1024 / 1024)}MB exceeds 100MB limit`
      };
    }

    // Check file type
    const allowedTypes = [
      'image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp',
      'application/pdf'
    ];
    
    if (!allowedTypes.includes(file.type)) {
      return {
        isValid: false,
        error: 'Unsupported file type. Please use images (JPG, PNG, GIF, WebP) or PDF files.'
      };
    }

    return { isValid: true };
  };

  const onDrop = useCallback((acceptedFiles: File[], rejectedFiles: any[]) => {
    setIsDragActive(false);

    // Handle rejected files
    const rejectedPreviews: FilePreview[] = rejectedFiles.map((rejection) => ({
      file: rejection.file,
      id: `${Date.now()}-${Math.random()}`,
      status: 'error',
      error: rejection.errors[0]?.message || 'File rejected'
    }));

    // Process accepted files
    const newPreviews: FilePreview[] = acceptedFiles.map((file) => {
      const validation = validateFile(file);
      return {
        file,
        id: `${Date.now()}-${Math.random()}`,
        status: validation.isValid ? 'validating' : 'error',
        error: validation.error
      };
    });

    // Update previews
    setFilePreviews([...newPreviews, ...rejectedPreviews]);

    // Validate and prepare valid files
    setTimeout(() => {
      const validFiles = newPreviews
        .filter(preview => preview.status === 'validating')
        .map(preview => ({ ...preview, status: 'ready' as const }));

      setFilePreviews(prev => 
        prev.map(p => 
          validFiles.find(v => v.id === p.id) || p
        )
      );

      // Auto-upload valid files after a short delay
      const filesToUpload = validFiles.map(p => p.file);
      if (filesToUpload.length > 0) {
        setTimeout(() => {
          onUpload(filesToUpload);
          setFilePreviews([]); // Clear previews after upload
        }, 500);
      }
    }, 500);
  }, [onUpload]);

  const { getRootProps, getInputProps } = useDropzone({
    onDrop,
    onDragEnter: () => setIsDragActive(true),
    onDragLeave: () => setIsDragActive(false),
    accept: {
      'image/*': ['.png', '.jpg', '.jpeg', '.gif', '.webp'],
      'application/pdf': ['.pdf'],
    },
    maxSize: 100 * 1024 * 1024, // 100MB
    multiple: true,
  });

  const getFileIcon = (file: File) => {
    if (file.type === 'application/pdf') {
      return <FileText className="w-4 h-4 text-red-500" />;
    }
    return <Image className="w-4 h-4 text-blue-500" />;
  };

  const getStatusIcon = (status: FilePreview['status']) => {
    switch (status) {
      case 'pending':
        return <div className="w-4 h-4 animate-pulse bg-gray-300 rounded-full" />;
      case 'validating':
        return <div className="w-4 h-4 animate-spin rounded-full border-2 border-blue-500 border-t-transparent" />;
      case 'ready':
        return <CheckCircle className="w-4 h-4 text-green-500" />;
      case 'error':
        return <AlertCircle className="w-4 h-4 text-red-500" />;
      default:
        return null;
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
    return `${Math.round(bytes / 1024 / 1024 * 100) / 100} MB`;
  };

  return (
    <div className="w-full sm:w-96 bg-white rounded-xl sm:rounded-2xl shadow-xl overflow-hidden">
      {/* Drop Zone */}
      <div
        {...getRootProps()}
        className={`
          p-6 cursor-pointer border-2 border-dashed transition-all duration-200
          ${isDragActive 
            ? 'border-purple-500 bg-purple-50' 
            : 'border-gray-300 hover:border-gray-400 hover:bg-gray-50'
          }
        `}
      >
        <input {...getInputProps()} />
        
        <div className="text-center">
          <div className="mx-auto w-16 h-16 bg-gradient-to-br from-purple-500 to-pink-500 rounded-full flex items-center justify-center mb-4">
            <Upload className="w-8 h-8 text-white" />
          </div>
          
          <h3 className="text-lg font-semibold text-gray-800 mb-2">
            {isDragActive ? 'Drop files here!' : 'Upload Files'}
          </h3>
          
          <p className="text-sm text-gray-600 mb-4">
            Drag & drop or click to browse
          </p>

          <div className="flex items-center justify-center gap-4 text-xs text-gray-500 mb-3">
            <div className="flex items-center gap-1">
              <Image className="w-4 h-4" />
              <span>Images</span>
            </div>
            <div className="flex items-center gap-1">
              <FileText className="w-4 h-4" />
              <span>PDF</span>
            </div>
          </div>

          <div className="text-xs text-gray-400 space-y-1">
            <p>Max file size: 100MB per file</p>
            <p>📄 PDFs will be converted to images automatically</p>
          </div>
        </div>
      </div>

      {/* File Previews */}
      {filePreviews.length > 0 && (
        <div className="border-t bg-gray-50 max-h-64 overflow-y-auto">
          <div className="p-4 space-y-3">
            <h4 className="font-medium text-gray-700 text-sm">Processing Files:</h4>
            {filePreviews.map((preview) => (
              <div
                key={preview.id}
                className={`flex items-center gap-3 p-3 rounded-lg border transition-colors ${
                  preview.status === 'error'
                    ? 'bg-red-50 border-red-200'
                    : preview.status === 'ready'
                    ? 'bg-green-50 border-green-200'
                    : 'bg-white border-gray-200'
                }`}
              >
                {getFileIcon(preview.file)}
                
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium text-gray-900 truncate">
                    {preview.file.name}
                  </div>
                  <div className="text-xs text-gray-500">
                    {formatFileSize(preview.file.size)}
                    {preview.file.type === 'application/pdf' && (
                      <span className="ml-2 text-blue-600">→ Will convert to images</span>
                    )}
                  </div>
                  {preview.error && (
                    <div className="text-xs text-red-600 mt-1">
                      {preview.error}
                    </div>
                  )}
                </div>

                <div className="flex-shrink-0">
                  {getStatusIcon(preview.status)}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Help Footer */}
      <div className="border-t bg-gray-100 px-4 py-3">
        <div className="text-xs text-gray-600 space-y-1">
          <p>💡 <strong>Tips:</strong></p>
          <p>• Images: Best quality for analysis</p>
          <p>• PDFs: Each page becomes an image</p>
          <p>• Large files may take longer to process</p>
        </div>
      </div>
    </div>
  );
}