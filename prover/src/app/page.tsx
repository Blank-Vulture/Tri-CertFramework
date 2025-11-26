'use client';

import { useMemo, useState } from 'react';
import { useI18n, HeaderLangSwitcher } from './components/LanguageProvider';
import FileUpload from './components/FileUpload';
import ProofGenerator from './components/ProofGenerator';

// Type definitions deleted

export default function Home() {
  const { t } = useI18n();
  const [pdfFile, setPdfFile] = useState<File | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [step, setStep] = useState<number>(0);

  const steps = useMemo(() => [
    { name: t('steps.upload'), icon: '📄' },
    { name: t('steps.hash'), icon: '🔍' },
    { name: t('steps.proof'), icon: '🔐' },
    { name: t('steps.signature'), icon: '✍️' },
    { name: t('steps.export'), icon: '✅' }
  ], [t]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
      {/* Language Switcher - Top Right */}
      <div className="fixed top-4 right-4 z-50">
        <div className="bg-white/80 backdrop-blur-sm rounded-xl px-4 py-2 shadow-lg border border-gray-200/50">
          <HeaderLangSwitcher />
        </div>
      </div>

      {/* Header - Simplified */}
      <header className="relative pt-12 pb-8 sm:pt-16 sm:pb-12">
        <div className="mx-auto max-w-xl text-center px-6">
          {/* Logo */}
          <div className="mx-auto mb-6 h-16 w-16 rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-600 p-4 shadow-xl transform hover:scale-105 transition-transform">
            <svg className="h-full w-full text-white" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 2a1 1 0 011 1v1.323l3.954 1.582 1.599-.8a1 1 0 01.894 1.79l-1.233.617 1.738 5.42a1 1 0 01-.285 1.05A3.989 3.989 0 0115 15a3.989 3.989 0 01-2.667-1.018 1 1 0 01-.285-1.05l1.715-5.349L11 6.477V16h2a1 1 0 110 2H7a1 1 0 110-2h2V6.477L6.237 7.582l1.715 5.349a1 1 0 01-.285 1.05A3.989 3.989 0 015 15a3.989 3.989 0 01-2.667-1.018 1 1 0 01-.285-1.05l1.738-5.42-1.233-.617a1 1 0 01.894-1.79l1.599.8L9 4.323V3a1 1 0 011-1z" clipRule="evenodd" />
            </svg>
          </div>
          
          {/* Title - Large and Clear */}
          <h1 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-3">
            {t('page.title')}
          </h1>
          
          {/* Simple Subtitle */}
          <p className="text-lg text-gray-600 leading-relaxed">
            {t('hero.subtitle.prover')}
          </p>

          {/* Status - Simple */}
          <div className="mt-4 flex justify-center">
            <span className="inline-flex items-center gap-2 px-4 py-2 bg-green-100 text-green-700 rounded-full text-sm font-medium">
              <span className="h-2 w-2 bg-green-500 rounded-full animate-pulse"></span>
              {t('hero.status.online')}
            </span>
          </div>
        </div>
      </header>

      {/* Progress Steps - Visual and Clear */}
      <div className="max-w-3xl mx-auto px-6 mb-8">
        <div className="bg-white/70 backdrop-blur-sm rounded-2xl p-6 shadow-lg border border-gray-200/50">
          <div className="flex justify-between items-center">
            {steps.map((stepItem, stepIndex) => (
              <div key={stepIndex} className="flex flex-col items-center flex-1">
                <div 
                  className={`relative z-10 w-14 h-14 rounded-full flex items-center justify-center text-2xl transition-all duration-500 ${
                    stepIndex < step 
                      ? 'bg-green-500 shadow-lg shadow-green-500/30 text-white' 
                      : stepIndex === step 
                        ? 'bg-blue-600 shadow-xl shadow-blue-600/40 text-white animate-pulse'
                        : 'bg-slate-200 text-slate-400'
                  }`}
                >
                  {stepIndex < step ? '✓' : stepItem.icon}
                </div>
                <span className={`mt-3 text-sm font-bold text-center max-w-[100px] leading-tight tracking-wide ${
                  stepIndex <= step ? 'text-gray-900' : 'text-gray-400'
                }`}>
                  {stepItem.name}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Main Content */}
      <main className="relative px-6 pb-16">
        <div className="mx-auto max-w-2xl space-y-6">
          {/* Step 1: File Upload - Always visible */}
          <div className="bg-white rounded-3xl shadow-xl border border-gray-200/50 overflow-hidden">
            <div className="p-6 sm:p-8">
              <FileUpload
                onFileSelect={(file) => {
                  setPdfFile(file);
                  setStep(1);
                }}
                selectedFile={pdfFile}
              />
            </div>
          </div>

          {/* Step 2+: Proof Generation - Show after file selected */}
          {pdfFile && (
            <div className="bg-white rounded-3xl shadow-xl border border-gray-200/50 overflow-hidden animate-fadeIn">
              <div className="p-6 sm:p-8">
                <ProofGenerator
                  pdfFile={pdfFile}
                  onProofGenerated={() => {
                    setStep(5);
                  }}
                  isProcessing={isProcessing}
                  setIsProcessing={setIsProcessing}
                  onProgress={(evt: { step: number; message: string }) => {
                    setStep(evt.step + 1);
                  }}
                />
              </div>
            </div>
          )}
        </div>
      </main>

      {/* Footer - Minimal */}
      <footer className="py-8 text-center">
        <p className="text-xs text-gray-400">
          © {new Date().getFullYear()} Tri-CertFramework
        </p>
      </footer>

      {/* Animation Styles */}
      <style jsx>{`
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .animate-fadeIn {
          animation: fadeIn 0.5s ease-out;
        }
      `}</style>
    </div>
  );
}
