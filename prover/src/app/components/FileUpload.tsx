'use client';

import { useCallback } from 'react';

interface FileUploadProps {
  onFileSelect: (file: File) => void;
  selectedFile: File | null;
}

export default function FileUpload({ onFileSelect, selectedFile }: FileUploadProps) {
  const handleDrop = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file && file.type === 'application/pdf') {
      onFileSelect(file);
    }
  }, [onFileSelect]);

  const handleFileInput = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && file.type === 'application/pdf') {
      onFileSelect(file);
    }
  }, [onFileSelect]);

  const preventDefault = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
  };

  return (
    <div className="space-y-6">
      {!selectedFile ? (
        <div>
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Upload Your Document</h3>
          <div
            onDrop={handleDrop}
            onDragOver={preventDefault}
            onDragEnter={preventDefault}
            className="relative group"
          >
            <div className="relative border-2 border-dashed border-gray-300 rounded-3xl p-12 text-center hover:border-blue-400 transition-all duration-300 cursor-pointer bg-gradient-to-br from-gray-50 to-white group-hover:from-blue-50 group-hover:to-indigo-50">
              {/* Animated background */}
              <div className="absolute inset-0 bg-gradient-to-r from-blue-400/5 via-purple-400/5 to-indigo-400/5 rounded-3xl opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
              
              {/* Upload icon with animation */}
              <div className="relative">
                <div className="mx-auto mb-6 h-16 w-16 rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-600 p-4 shadow-lg group-hover:scale-110 transition-transform duration-300">
                  <svg className="h-full w-full text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                  </svg>
                </div>
                
                <div className="space-y-4">
                  <div>
                    <label htmlFor="file-upload" className="cursor-pointer">
                      <span className="text-xl font-semibold text-gray-900 hover:text-blue-600 transition-colors">
                        Choose a PDF file
                      </span>
                      <input
                        id="file-upload"
                        name="file-upload"
                        type="file"
                        className="sr-only"
                        accept="application/pdf"
                        onChange={handleFileInput}
                      />
                    </label>
                    <p className="text-gray-500 mt-1">or drag and drop it anywhere in this area</p>
                  </div>
                  
                  <div className="inline-flex items-center px-4 py-2 rounded-full bg-blue-50 border border-blue-200">
                    <svg className="h-4 w-4 text-blue-500 mr-2" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4zm2 6a1 1 0 011-1h6a1 1 0 110 2H7a1 1 0 01-1-1zm1 3a1 1 0 100 2h6a1 1 0 100-2H7z" clipRule="evenodd" />
                    </svg>
                    <span className="text-sm font-medium text-blue-700">PDF files only</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-gray-900">Document Ready</h3>
          <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-green-50 to-emerald-50 p-6 border border-green-200">
            <div className="flex items-start space-x-4">
              <div className="flex-shrink-0">
                <div className="h-12 w-12 rounded-xl bg-green-100 p-3">
                  <svg className="h-full w-full text-green-600" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4zm2 6a1 1 0 011-1h6a1 1 0 110 2H7a1 1 0 01-1-1zm1 3a1 1 0 100 2h6a1 1 0 100-2H7z" clipRule="evenodd" />
                  </svg>
                </div>
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center space-x-2 mb-1">
                  <h4 className="text-sm font-semibold text-green-900 truncate">
                    {selectedFile.name}
                  </h4>
                  <div className="flex-shrink-0">
                    <div className="h-2 w-2 bg-green-500 rounded-full animate-pulse"></div>
                  </div>
                </div>
                <p className="text-sm text-green-700">
                  {(selectedFile.size / 1024 / 1024).toFixed(2)} MB • Ready for processing
                </p>
                <div className="mt-3 flex space-x-2">
                  <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                    Valid PDF
                  </span>
                  <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                    Ready to prove
                  </span>
                </div>
              </div>
              <button
                onClick={() => window.location.reload()}
                className="flex-shrink-0 rounded-lg p-1 text-green-600 hover:text-green-700 hover:bg-green-100 transition-colors"
              >
                <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
