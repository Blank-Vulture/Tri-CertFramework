"use client";

import { useCallback } from 'react';
import { useI18n } from './LanguageProvider';

interface PdfUploadProps {
  onFileSelect: (file: File) => void;
  selectedFile: File | null;
}

export default function PdfUpload({ onFileSelect, selectedFile }: PdfUploadProps) {
  const { t } = useI18n();
  
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

  const clearFile = () => {
    // @ts-expect-error - We need to pass null to clear the file
    onFileSelect(null);
  };

  return (
    <div className="space-y-4">
      <h2 className="text-xl font-bold text-gray-900 text-center">{t('pdfUpload.title')}</h2>
      
      {!selectedFile ? (
        <div
          onDrop={handleDrop}
          onDragOver={preventDefault}
          onDragEnter={preventDefault}
          className="relative group cursor-pointer"
        >
          <div className="border-3 border-dashed border-gray-300 rounded-2xl p-10 text-center hover:border-emerald-400 hover:bg-emerald-50/50 transition-all duration-300">
            {/* Icon */}
            <div className="mx-auto mb-6 h-20 w-20 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-600 p-5 shadow-lg group-hover:scale-110 transition-transform">
              <svg className="h-full w-full text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
            
            <div className="space-y-3">
              <label htmlFor="pdf-upload" className="cursor-pointer">
                <span className="text-xl font-semibold text-gray-900 hover:text-emerald-600 transition-colors">
                  {t('pdfUpload.upload')}
                </span>
                <input
                  id="pdf-upload"
                  name="pdf-upload"
                  type="file"
                  className="sr-only"
                  accept="application/pdf"
                  onChange={handleFileInput}
                />
              </label>
              <p className="text-gray-500">{t('pdfUpload.orDrag')}</p>
              
              <div className="inline-flex items-center px-4 py-2 rounded-full bg-emerald-100 border border-emerald-200">
                <svg className="h-4 w-4 text-emerald-600 mr-2" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4zm2 6a1 1 0 011-1h6a1 1 0 110 2H7a1 1 0 01-1-1zm1 3a1 1 0 100 2h6a1 1 0 100-2H7z" clipRule="evenodd" />
                </svg>
                <span className="text-sm font-medium text-emerald-700">{t('pdfUpload.hint')}</span>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="bg-gradient-to-br from-emerald-50 to-teal-50 rounded-2xl p-6 border-2 border-emerald-200">
          <div className="flex items-center gap-4">
            <div className="flex-shrink-0">
              <div className="h-14 w-14 rounded-xl bg-emerald-500 flex items-center justify-center shadow-lg">
                <svg className="h-8 w-8 text-white" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4zm2 6a1 1 0 011-1h6a1 1 0 110 2H7a1 1 0 01-1-1zm1 3a1 1 0 100 2h6a1 1 0 100-2H7z" clipRule="evenodd" />
                </svg>
              </div>
            </div>
            
            <div className="flex-1 min-w-0">
              <h3 className="font-bold text-emerald-900 truncate">{selectedFile.name}</h3>
              <p className="text-sm text-emerald-700 mt-1">
                {t('pdfUpload.size')} {(selectedFile.size / 1024 / 1024).toFixed(2)} MB
              </p>
              <div className="mt-2 flex items-center gap-2">
                <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-emerald-200 text-emerald-800">
                  ✓ {t('pdfUpload.ready')}
                </span>
              </div>
            </div>
            
            <button
              onClick={clearFile}
              className="flex-shrink-0 p-2 rounded-lg text-emerald-600 hover:text-red-600 hover:bg-red-50 transition-colors"
              title={t('common.clear')}
            >
              <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
