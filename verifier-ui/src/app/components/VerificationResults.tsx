"use client";

import { useI18n } from './LanguageProvider';

interface VerificationResult {
  zkpValid: boolean;
  signatureValid: boolean;
  hashValid: boolean;
  vkeyHashValid: boolean;
  registrationValid?: boolean;
  saltRegistrationValid?: boolean;
  details: {
    zkp?: string;
    signature?: string;
    hash?: string;
    vkeyHash?: string;
    registration?: string;
    saltRegistration?: string;
  };
}

interface VerificationResultsProps {
  result: VerificationResult;
}

export default function VerificationResults({ result }: VerificationResultsProps) {
  const { t } = useI18n();
  
  // Overall validity
  const overallValid = result.zkpValid && result.signatureValid && result.hashValid && result.vkeyHashValid && 
    (result.registrationValid !== false) && 
    (result.saltRegistrationValid === true);
  
  const validCount = [
    result.zkpValid,
    result.signatureValid,
    result.hashValid,
    result.vkeyHashValid,
    result.saltRegistrationValid,
  ].filter(Boolean).length;
  
  const totalCount = 5;

  return (
    <div className="space-y-6">
      {/* Overall Result - Big and Clear */}
      <div className={`rounded-3xl p-8 text-center ${
        overallValid 
          ? 'bg-gradient-to-br from-green-500 to-emerald-600' 
          : 'bg-gradient-to-br from-red-500 to-rose-600'
      } shadow-xl`}>
        <div className="mb-4">
          {overallValid ? (
            <div className="mx-auto w-20 h-20 bg-white/20 rounded-full flex items-center justify-center">
              <span className="text-5xl">✅</span>
            </div>
          ) : (
            <div className="mx-auto w-20 h-20 bg-white/20 rounded-full flex items-center justify-center">
              <span className="text-5xl">❌</span>
            </div>
          )}
        </div>
        
        <h2 className="text-2xl font-bold text-white mb-2">
          {overallValid ? t('results.successTitle') : t('results.failedTitle')}
        </h2>
        <p className="text-white/80">
          {overallValid ? t('results.successDesc') : t('results.failedDesc')}
        </p>
        
        {/* Progress indicator */}
        <div className="mt-6 flex items-center justify-center gap-2">
          <span className="text-white/70 text-sm">{t('results.checksPassedLabel')}</span>
          <span className="text-white font-bold">{validCount}/{totalCount}</span>
        </div>
      </div>

      {/* Detailed Results */}
      <div className="bg-white rounded-2xl shadow-lg border border-gray-200 overflow-hidden">
        <div className="p-4 bg-gray-50 border-b border-gray-200">
          <h3 className="font-bold text-gray-900">{t('results.detailsTitle')}</h3>
        </div>
        
        <div className="divide-y divide-gray-100">
          {/* ZKP */}
          <ResultRow 
            icon="🔐"
            label={t('results.zkp')}
            isValid={result.zkpValid}
            details={result.details.zkp}
          />
          
          {/* Signature */}
          <ResultRow 
            icon="✍️"
            label={t('results.signature')}
            isValid={result.signatureValid}
            details={result.details.signature}
          />
          
          {/* Hash */}
          <ResultRow 
            icon="🔍"
            label={t('results.hash')}
            isValid={result.hashValid}
            details={result.details.hash}
          />
          
          {/* VKey Hash */}
          <ResultRow 
            icon="🔑"
            label={t('results.vkeyHash')}
            isValid={result.vkeyHashValid}
            details={result.details.vkeyHash}
          />
          
          {/* Salt Registration */}
          {result.saltRegistrationValid !== undefined && (
            <ResultRow 
              icon="👤"
              label={t('results.saltRegistration.label')}
              isValid={result.saltRegistrationValid}
              details={result.details.saltRegistration}
              isImportant
            />
          )}
          
          {/* Public Key Registration (if available) */}
          {result.registrationValid !== undefined && result.registrationValid !== null && (
            <ResultRow 
              icon="📋"
              label={t('results.registration')}
              isValid={result.registrationValid}
              details={result.details.registration}
            />
          )}
        </div>
      </div>

      {/* What does this mean? - Educational */}
      <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-2xl p-6 border border-blue-100">
        <h3 className="font-bold text-gray-900 mb-4 flex items-center gap-2">
          <span className="text-xl">💡</span>
          {t('results.whatThisMeans')}
        </h3>
        
        {overallValid ? (
          <div className="space-y-3 text-sm text-gray-700">
            <p>✅ <strong>{t('results.meaning.authentic')}</strong> - {t('results.meaning.authenticDesc')}</p>
            <p>✅ <strong>{t('results.meaning.unchanged')}</strong> - {t('results.meaning.unchangedDesc')}</p>
            <p>✅ <strong>{t('results.meaning.verified')}</strong> - {t('results.meaning.verifiedDesc')}</p>
          </div>
        ) : (
          <div className="space-y-3 text-sm text-gray-700">
            <p className="text-red-700">⚠️ {t('results.meaning.warning')}</p>
            <ul className="list-disc list-inside text-gray-600 space-y-1">
              {!result.zkpValid && <li>{t('results.issue.zkp')}</li>}
              {!result.signatureValid && <li>{t('results.issue.signature')}</li>}
              {!result.hashValid && <li>{t('results.issue.hash')}</li>}
              {!result.vkeyHashValid && <li>{t('results.issue.vkeyHash')}</li>}
              {result.saltRegistrationValid === false && <li>{t('results.issue.saltRegistration')}</li>}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
}

function ResultRow({ 
  icon, 
  label, 
  isValid, 
  details,
  isImportant = false
}: { 
  icon: string;
  label: string; 
  isValid: boolean; 
  details?: string;
  isImportant?: boolean;
}) {
  return (
    <div className={`p-4 flex items-start gap-4 ${isImportant ? 'bg-amber-50/50' : ''}`}>
      <div className="text-2xl">{icon}</div>
      
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1">
          <span className="font-medium text-gray-900">{label}</span>
          {isImportant && (
            <span className="text-xs text-amber-600 bg-amber-100 px-2 py-0.5 rounded-full">
              重要
            </span>
          )}
        </div>
        {details && (
          <p className="text-sm text-gray-500 break-words">{details}</p>
        )}
      </div>
      
      <div className={`flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center ${
        isValid ? 'bg-green-100' : 'bg-red-100'
      }`}>
        {isValid ? (
          <svg className="w-6 h-6 text-green-600" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
          </svg>
        ) : (
          <svg className="w-6 h-6 text-red-600" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
          </svg>
        )}
      </div>
    </div>
  );
}
