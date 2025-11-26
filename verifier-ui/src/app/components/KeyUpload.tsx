'use client';

import { useCallback } from 'react';
import { useI18n } from './LanguageProvider';

interface KeyUploadProps {
  title: string;
  description: string;
  onFileSelect: (file: File) => void;
  selectedFile: File | null;
  accept: string;
  compact?: boolean;
}

export default function KeyUpload({ 
  title, 
  description, 
  onFileSelect, 
  selectedFile, 
  accept,
  compact = false
}: KeyUploadProps) {
  const { t } = useI18n();
  
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

  if (compact) {
    return (
      <div className="flex items-center gap-3">
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-gray-700">{title}</span>
            {selectedFile && (
              <span className="text-xs text-green-600 bg-green-50 px-2 py-0.5 rounded-full">
                ✓ {selectedFile.name}
              </span>
            )}
          </div>
          <p className="text-xs text-gray-400 mt-0.5">{description}</p>
        </div>
        
        <div className="flex items-center gap-2">
          <label className="cursor-pointer">
            <input
              type="file"
              className="hidden"
              accept={accept}
              onChange={handleFileInput}
            />
            <span className="inline-flex items-center px-3 py-1.5 rounded-lg text-xs font-medium bg-gray-100 hover:bg-gray-200 text-gray-700 transition-colors">
              {selectedFile ? t('common.change') : t('common.select')}
            </span>
          </label>
          
          {selectedFile && (
            <button 
              onClick={clearFile}
              className="p-1.5 rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 transition-colors"
              title={t('common.clear')}
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          )}
        </div>
      </div>
    );
  }

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
        className="border border-gray-300 rounded-xl p-4 text-center hover:border-emerald-400 hover:bg-emerald-50 transition-all cursor-pointer group"
      >
        <svg
          className="mx-auto h-8 w-8 text-gray-400 group-hover:text-emerald-500 transition-colors"
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
          <label htmlFor={`key-upload-${title}`} className="relative cursor-pointer rounded-md font-medium text-emerald-600 hover:text-emerald-500">
            <span>{t('common.uploadFile').replace('{name}', title.toLowerCase())}</span>
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
        <div className="mt-2 p-3 bg-emerald-50 rounded-lg">
          <div className="flex justify-between items-center">
            <span className="text-emerald-800 font-medium text-sm flex items-center gap-2">
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
              </svg>
              {selectedFile.name}
            </span>
            <button 
              onClick={clearFile}
              className="text-emerald-600 hover:text-emerald-800 p-1"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
