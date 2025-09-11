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

  return (
    <div>
      <h2 className="text-lg font-medium text-gray-900 mb-4">{t('pdfUpload.title')}</h2>
      <div
        onDrop={handleDrop}
        onDragOver={preventDefault}
        onDragEnter={preventDefault}
        className="border-2 border-dashed border-gray-300 rounded-xl p-8 text-center hover:border-green-400 hover:bg-green-50 transition-all duration-300 cursor-pointer group"
      >
        <svg
          className="mx-auto h-12 w-12 text-gray-400 group-hover:text-green-500 transition-colors duration-300"
          stroke="currentColor"
          fill="none"
          viewBox="0 0 24 24"
          aria-hidden="true"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M9 12v6m0 0l-3-3m3 3l3-3m1 3h7a2 2 0 002-2V9a2 2 0 00-2-2h-7m-9 9V6a2 2 0 012-2h4l2 2h4a2 2 0 012 2v2M9 12h12"
          />
        </svg>
        <p className="mt-2 text-sm text-gray-600">
          <label htmlFor="pdf-upload" className="relative cursor-pointer rounded-md font-medium text-green-600 hover:text-green-500">
            <span>{t('pdfUpload.upload')}</span>
            <input
              id="pdf-upload"
              name="pdf-upload"
              type="file"
              className="sr-only"
              accept="application/pdf"
              onChange={handleFileInput}
            />
          </label>
          <span className="pl-1">{t('pdfUpload.orDrag')}</span>
        </p>
        <p className="text-xs text-gray-500">{t('pdfUpload.hint')}</p>
      </div>
      
      {selectedFile && (
        <div className="mt-4 p-4 bg-blue-50 rounded-lg">
          <p className="text-sm text-blue-800">
            {t('pdfUpload.selected')} <span className="font-medium">{selectedFile.name}</span>
          </p>
          <p className="text-xs text-blue-600 mt-1">
            {t('pdfUpload.size')} {(selectedFile.size / 1024 / 1024).toFixed(2)} MB
          </p>
        </div>
      )}
    </div>
  );
}
