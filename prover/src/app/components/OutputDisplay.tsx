"use client";

import { useState } from 'react';
import { useI18n } from './LanguageProvider';

interface ProofData {
  schema: string;
  circuit_id: string;
  vkey_hash: string;
  public_signals: {
    pdf_sha3_512: string;
    commit: string;
  };
  proof: {
    pi_a: string[];
    pi_b: string[][];
    pi_c: string[];
  };
}

interface VKeyData {
  protocol: string;
  curve: string;
  nPublic: number;
  vk_alpha_1: string[];
  vk_beta_2: string[][];
  vk_gamma_2: string[][];
  vk_delta_2: string[][];
  vk_alphabeta_12: string[][][];
  IC: string[][];
}

interface SignatureData {
  webauthn: {
    credentialId: string;
    authenticatorData: string;
    clientDataJSON: string;
    signature: string;
  };
  sig_target: {
    schema: string;
    circuit_id: string;
    vkey_hash: string;
    pdf_sha3_512: string;
    commit: string;
    issued_at: string;
  };
  webauthn_pub: {
    kty: string;
    crv: string;
    x: string;
    y: string;
    alg: string;
    kid: string;
  };
}

interface OutputDisplayProps {
  outputPdf: Blob;
  proofData: ProofData;
  vkeyData: VKeyData;
  signatureData: SignatureData;
}

export default function OutputDisplay({ outputPdf, proofData, vkeyData, signatureData }: OutputDisplayProps) {
  const { t } = useI18n();
  const [showDetails, setShowDetails] = useState(false);

  const downloadPdf = () => {
    const url = URL.createObjectURL(outputPdf);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'secured-certificate.pdf';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const downloadJson = (data: ProofData | VKeyData | SignatureData['webauthn_pub'] | SignatureData['sig_target'], filename: string) => {
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      {/* Success Header */}
      <div className="text-center">
        <h3 className="text-xl font-bold text-gray-900">{t('output.successTitle')}</h3>
        <p className="text-gray-600 mt-1">{t('output.successSubtitle')}</p>
      </div>
      
      {/* Main Download Button - Large and Prominent */}
      <button
        onClick={downloadPdf}
        className="w-full py-5 px-6 rounded-2xl font-bold text-xl text-white bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 transition-all shadow-xl hover:shadow-2xl transform hover:scale-[1.02]"
      >
        <span className="flex items-center justify-center gap-3">
          <svg className="h-7 w-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v2a2 2 0 002 2h12a2 2 0 002-2v-2M7 10l5 5m0 0l5-5m-5 5V4" />
          </svg>
          {t('output.securedPdf')}
        </span>
        <span className="text-sm font-normal text-green-100 mt-1 block">{t('output.securedPdfCaption')}</span>
      </button>

      {/* Additional Files - Collapsible */}
      <div className="border border-gray-200 rounded-xl overflow-hidden">
        <button
          type="button"
          onClick={() => setShowDetails(!showDetails)}
          className="w-full px-5 py-3 flex items-center justify-between text-gray-500 hover:bg-gray-50 transition-colors"
        >
          <span className="text-sm font-medium">{t('output.previewTitle')}</span>
          <svg 
            className={`w-5 h-5 transition-transform ${showDetails ? 'rotate-180' : ''}`} 
            fill="none" 
            stroke="currentColor" 
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </button>
        
        {showDetails && (
          <div className="p-5 bg-gray-50 border-t border-gray-200 space-y-4">
            {/* Additional download buttons - Compact */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              <button
                onClick={() => downloadJson(proofData, 'proof.json')}
                className="flex items-center justify-center gap-2 p-3 rounded-xl text-xs font-medium bg-white border border-gray-200 hover:bg-blue-50 hover:border-blue-200 transition-colors"
              >
                <span className="text-blue-500">📋</span>
                {t('output.zkProof')}
              </button>

              <button
                onClick={() => downloadJson(vkeyData, 'vkey.json')}
                className="flex items-center justify-center gap-2 p-3 rounded-xl text-xs font-medium bg-white border border-gray-200 hover:bg-purple-50 hover:border-purple-200 transition-colors"
              >
                <span className="text-purple-500">🔑</span>
                {t('output.vkey')}
              </button>

              <button
                onClick={() => downloadJson(signatureData.webauthn_pub, 'webauthn_pub.jwk.json')}
                className="flex items-center justify-center gap-2 p-3 rounded-xl text-xs font-medium bg-white border border-gray-200 hover:bg-orange-50 hover:border-orange-200 transition-colors"
              >
                <span className="text-orange-500">🔐</span>
                {t('output.publicKey')}
              </button>

              <button
                onClick={() => {
                  const blob = new Blob([JSON.stringify(signatureData.webauthn, null, 2)], { type: 'application/json' });
                  const url = URL.createObjectURL(blob);
                  const a = document.createElement('a');
                  a.href = url;
                  a.download = 'webauthn_sig.json';
                  document.body.appendChild(a);
                  a.click();
                  document.body.removeChild(a);
                  URL.revokeObjectURL(url);
                }}
                className="flex items-center justify-center gap-2 p-3 rounded-xl text-xs font-medium bg-white border border-gray-200 hover:bg-yellow-50 hover:border-yellow-200 transition-colors"
              >
                <span className="text-yellow-500">✍️</span>
                {t('output.signature')}
              </button>
            </div>

            {/* JSON Preview */}
            <div className="bg-white rounded-xl p-4 border border-gray-200">
              <h4 className="text-xs font-medium text-gray-500 mb-2">証明データ（JSON）</h4>
              <div className="bg-gray-900 rounded-lg p-4 max-h-48 overflow-y-auto">
                <pre className="text-xs text-green-400 font-mono leading-relaxed">
                  {JSON.stringify(proofData, null, 2)}
                </pre>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
