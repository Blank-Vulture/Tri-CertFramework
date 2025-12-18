"use client";

import { useState } from 'react';
import { useI18n } from './LanguageProvider';

interface ExtractedDataPreviewProps {
  hasProof: boolean;
  hasVkey: boolean;
  hasSignature: boolean;
  hasPublicKey: boolean;
  circuitId?: string;
  graduationYear?: number | null;
  hashMethod?: 'raw' | 'normalized';
  schema?: string;
}

export default function ExtractedDataPreview({
  hasProof,
  hasVkey,
  hasSignature,
  hasPublicKey,
  circuitId,
  graduationYear,
  hashMethod,
  schema,
}: ExtractedDataPreviewProps) {
  const { t } = useI18n();
  const [isExpanded, setIsExpanded] = useState(false);

  const dataItems = [
    { key: 'proof', label: t('extractedData.proof'), present: hasProof },
    { key: 'vkey', label: t('extractedData.vkey'), present: hasVkey },
    { key: 'signature', label: t('extractedData.signature'), present: hasSignature },
    { key: 'publicKey', label: t('extractedData.publicKey'), present: hasPublicKey },
  ];

  const presentCount = dataItems.filter(item => item.present).length;

  return (
    <div className="bg-white rounded-2xl shadow-md border border-gray-200/50 overflow-hidden">
      <button
        type="button"
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full px-6 py-4 flex items-center justify-between text-gray-700 hover:bg-gray-50 transition-colors"
      >
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-indigo-100 rounded-lg flex items-center justify-center">
            <span className="text-lg">📦</span>
          </div>
          <div className="text-left">
            <span className="text-sm font-medium">{t('extractedData.title')}</span>
            <span className="ml-2 text-xs text-gray-500">
              ({presentCount}/{dataItems.length} {t('extractedData.itemsFound')})
            </span>
          </div>
        </div>
        <svg
          className={`w-5 h-5 text-gray-400 transition-transform duration-200 ${isExpanded ? 'rotate-180' : ''}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {isExpanded && (
        <div className="px-6 pb-6 pt-2 border-t border-gray-100 bg-gray-50/50">
          {/* Data Checklist */}
          <div className="mb-4">
            <p className="text-xs text-gray-500 mb-3">{t('extractedData.description')}</p>
            <div className="grid grid-cols-2 gap-2">
              {dataItems.map((item) => (
                <div
                  key={item.key}
                  className={`flex items-center gap-2 px-3 py-2 rounded-lg ${
                    item.present
                      ? 'bg-green-50 text-green-700'
                      : 'bg-gray-100 text-gray-400'
                  }`}
                >
                  {item.present ? (
                    <svg className="w-4 h-4 text-green-500" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                  ) : (
                    <svg className="w-4 h-4 text-gray-300" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                    </svg>
                  )}
                  <span className="text-sm font-medium">{item.label}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Technical Details */}
          {(circuitId || schema || hashMethod || graduationYear) && (
            <div className="space-y-2">
              <p className="text-xs font-medium text-gray-600 uppercase tracking-wide">
                {t('extractedData.technicalDetails')}
              </p>
              <div className="bg-white rounded-lg border border-gray-200 divide-y divide-gray-100">
                {schema && (
                  <div className="px-3 py-2 flex justify-between items-center">
                    <span className="text-xs text-gray-500">{t('extractedData.schema')}</span>
                    <span className="text-xs font-mono text-gray-700">{schema}</span>
                  </div>
                )}
                {circuitId && (
                  <div className="px-3 py-2 flex justify-between items-center">
                    <span className="text-xs text-gray-500">{t('extractedData.circuitId')}</span>
                    <span className="text-xs font-mono text-gray-700 truncate max-w-[200px]" title={circuitId}>
                      {circuitId}
                    </span>
                  </div>
                )}
                {graduationYear && (
                  <div className="px-3 py-2 flex justify-between items-center">
                    <span className="text-xs text-gray-500">{t('extractedData.graduationYear')}</span>
                    <span className="text-xs font-mono text-gray-700">{graduationYear}年</span>
                  </div>
                )}
                {hashMethod && (
                  <div className="px-3 py-2 flex justify-between items-center">
                    <span className="text-xs text-gray-500">{t('extractedData.hashMethod')}</span>
                    <span className="text-xs font-mono text-gray-700">
                      {hashMethod === 'raw' ? 'Tail-append' : 'Metadata'}
                    </span>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
