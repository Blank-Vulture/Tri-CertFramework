'use client';

import { useCallback } from 'react';

interface KeyUploadProps {
  title: string;
  description: string;
  onFileSelect: (file: File) => void;
  selectedFile: File | null;
  accept: string;
}

export default function KeyUpload({ 
  title, 
  description, 
  onFileSelect, 
  selectedFile, 
  accept 
}: KeyUploadProps) {
  const handleDrop = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file) {
      onFileSelect(file);
    }
  }, [onFileSelect]);

  const handleFileInput = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      onFileSelect(file);
    }
  }, [onFileSelect]);

  const preventDefault = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
  };

  const clearFile = () => {
    // @ts-expect-error - We need to pass null to clear the file
    onFileSelect(null);
  };

  return (
    <div>
      <h3 className="text-md font-medium text-gray-900 mb-2">
        {title}
      </h3>
      <p className="text-sm text-gray-600 mb-3">
        {description}
      </p>
      <div
        onDrop={handleDrop}
        onDragOver={preventDefault}
        onDragEnter={preventDefault}
        className="border border-gray-300 rounded-lg p-4 text-center hover:border-gray-400 transition-colors cursor-pointer bg-gray-50"
      >
        <svg
          className="mx-auto h-8 w-8 text-gray-400"
          stroke="currentColor"
          fill="none"
          viewBox="0 0 24 24"
          aria-hidden="true"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1}
            d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z"
          />
        </svg>
        <p className="mt-2 text-xs text-gray-600">
          <label htmlFor={`key-upload-${title}`} className="relative cursor-pointer rounded-md font-medium text-gray-600 hover:text-gray-500">
            <span>Upload {title.toLowerCase()}</span>
            <input
              id={`key-upload-${title}`}
              name={`key-upload-${title}`}
              type="file"
              className="sr-only"
              accept={accept}
              onChange={handleFileInput}
            />
          </label>
        </p>
      </div>
      
      {selectedFile && (
        <div className="mt-2 p-2 bg-yellow-50 rounded text-xs">
          <div className="flex justify-between items-center">
            <span className="text-yellow-800 font-medium">
              {selectedFile.name}
            </span>
            <button 
              onClick={clearFile}
              className="text-yellow-600 hover:text-yellow-800"
            >
              ✕
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
