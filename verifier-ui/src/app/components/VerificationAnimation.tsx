"use client";

import { useEffect, useState } from 'react';

interface VerificationStep {
  id: string;
  name: string;
  description: string;
  status: 'pending' | 'running' | 'success' | 'error';
}

interface VerificationAnimationProps {
  steps: VerificationStep[];
  currentStepIndex: number;
}

export default function VerificationAnimation({ steps, currentStepIndex }: VerificationAnimationProps) {
  const [animatedValues, setAnimatedValues] = useState<{ [key: string]: number }>({});

  // Animate progress values
  useEffect(() => {
    const interval = setInterval(() => {
      setAnimatedValues(prev => {
        const newValues: { [key: string]: number } = {};
        steps.forEach(step => {
          if (step.status === 'running') {
            const current = prev[step.id] || 0;
            newValues[step.id] = current >= 90 ? 90 : current + Math.random() * 15;
          } else if (step.status === 'success' || step.status === 'error') {
            newValues[step.id] = 100;
          } else {
            newValues[step.id] = 0;
          }
        });
        return newValues;
      });
    }, 100);

    return () => clearInterval(interval);
  }, [steps]);

  const getStepIcon = (step: VerificationStep) => {
    switch (step.id) {
      case 'extract':
        return (
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
        );
      case 'hash':
        return (
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 20l4-16m2 16l4-16M6 9h14M4 15h14" />
          </svg>
        );
      case 'zkp':
        return (
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
          </svg>
        );
      case 'signature':
        return (
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
          </svg>
        );
      case 'registration':
        return (
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
          </svg>
        );
      default:
        return (
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        );
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'running':
        return 'bg-blue-500 text-white';
      case 'success':
        return 'bg-green-500 text-white';
      case 'error':
        return 'bg-red-500 text-white';
      default:
        return 'bg-gray-200 text-gray-400';
    }
  };

  const getProgressColor = (status: string) => {
    switch (status) {
      case 'running':
        return 'bg-blue-500';
      case 'success':
        return 'bg-green-500';
      case 'error':
        return 'bg-red-500';
      default:
        return 'bg-gray-200';
    }
  };

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-bold text-gray-900 text-center mb-6">検証中...</h3>
      
      {steps.map((step, index) => {
        const progress = animatedValues[step.id] || 0;
        const isActive = index === currentStepIndex;
        const isPast = index < currentStepIndex;
        
        return (
          <div 
            key={step.id} 
            className={`relative transition-all duration-300 ${
              isActive ? 'scale-105' : isPast ? 'opacity-70' : 'opacity-40'
            }`}
          >
            <div className="flex items-center gap-4">
              {/* Icon */}
              <div className={`w-14 h-14 rounded-full flex items-center justify-center text-2xl transition-all duration-300 shadow-sm ${getStatusColor(step.status)}`}>
                {step.status === 'running' ? (
                  <svg className="w-8 h-8 animate-spin" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                ) : step.status === 'success' ? (
                  <span className="text-2xl">✅</span>
                ) : step.status === 'error' ? (
                  <span className="text-2xl">❌</span>
                ) : (
                  getStepIcon(step)
                )}
              </div>
              
              {/* Content */}
              <div className="flex-1">
                <div className="flex items-center justify-between mb-1">
                  <span className="font-bold text-gray-900 text-lg">{step.name}</span>
                  {step.status === 'running' && (
                    <span className="text-sm text-blue-600 font-mono font-bold">{Math.round(progress)}%</span>
                  )}
                </div>
                <p className="text-sm text-gray-600 font-medium mb-2">{step.description}</p>
                
                {/* Progress Bar */}
                <div className="h-3 bg-gray-100 rounded-full overflow-hidden shadow-inner">
                  <div 
                    className={`h-full transition-all duration-300 rounded-full ${getProgressColor(step.status)}`}
                    style={{ width: `${progress}%` }}
                  />
                </div>
              </div>
            </div>
          </div>
        );
      })}
      
      {/* Visual Explanation */}
      <div className="mt-6 pt-6 border-t border-gray-100">
        <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl p-4">
          <h4 className="text-sm font-medium text-gray-700 mb-2">🔬 検証の仕組み</h4>
          <p className="text-xs text-gray-600 leading-relaxed">
            1️⃣ PDFから証明データを抽出 → 
            2️⃣ ファイルのハッシュ値を計算して改ざんをチェック → 
            3️⃣ ゼロ知識証明で数学的に正当性を検証 → 
            4️⃣ 電子署名で本人確認 → 
            5️⃣ 登録情報との照合
          </p>
        </div>
      </div>
    </div>
  );
}

