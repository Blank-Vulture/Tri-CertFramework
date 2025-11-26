"use client";

import { useEffect, useState } from 'react';
import { useI18n } from './LanguageProvider';
import WebAuthnSetup from './WebAuthnSetup';
import {
  createWebAuthnAssertion,
} from '../../utils/webauthn';
import {
  verifySalt,
  type SaltVerificationResult,
} from '../../utils/salt-verifier';
import {
  isEncryptedPdf,
  calculateRawPdfHash,
  attachProofToTail,
  type ProofBundle,
} from '../../utils/pdf-proof-utils';
// @ts-expect-error - snarkjs doesn't have proper TypeScript declarations
import * as snarkjs from 'snarkjs';

// Type definitions
interface ProofData {
  schema: string;
  circuit_id: string;
  vkey_hash: string;
  public_signals: {
    pdf_sha3_512: string;
    graduation_year: string;
    commit: string;
  };
  proof: {
    pi_a: string[];
    pi_b: string[][];
    pi_c: string[];
  };
  registration?: {
    activation_hash: string;
    student_id_hash: string;
    verified_at: string;
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
    graduation_year: string;
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

interface ProofGeneratorProps {
  pdfFile: File;
  onProofGenerated: (outputPdf: Blob, proof: ProofData, vkey: VKeyData, signature: SignatureData) => void;
  isProcessing: boolean;
  setIsProcessing: (processing: boolean) => void;
  onProgress?: (evt: { step: number; message: string }) => void;
}

interface WebAuthnCredentialInfo {
  credentialId: string;
  publicKey: {
    x: string;
    y: string;
  };
  createdAt: string;
}

export default function ProofGenerator({
  pdfFile,
  onProofGenerated,
  isProcessing,
  setIsProcessing,
  onProgress
}: ProofGeneratorProps) {
  const { t } = useI18n();
  const [status, setStatus] = useState('');
  const [secretInput, setSecretInput] = useState('');
  const [graduationYear, setGraduationYear] = useState<number>(new Date().getFullYear());
  const [availableYears, setAvailableYears] = useState<number[]>([]);
  const [webauthnCredential, setWebauthnCredential] = useState<WebAuthnCredentialInfo | null>(null);
  const [vkeyFile, setVkeyFile] = useState<File | null>(null);
  const [downloadUrl, setDownloadUrl] = useState<string | null>(null);
  const [downloadName, setDownloadName] = useState<string | null>(null);
  const [downloadSize, setDownloadSize] = useState<number | null>(null);
  
  // Output data for details view
  const [proofData, setProofData] = useState<ProofData | null>(null);
  const [vkeyData, setVkeyData] = useState<VKeyData | null>(null);
  const [signatureData, setSignatureData] = useState<SignatureData | null>(null);
  const [showDetails, setShowDetails] = useState(false);

  // Salt-based registration fields
  const [saltInput, setSaltInput] = useState('');
  const [studentName, setStudentName] = useState('');
  const [studentBirthdate, setStudentBirthdate] = useState('');
  const [saltVerification, setSaltVerification] = useState<SaltVerificationResult | null>(null);
  const [isVerifyingSalt, setIsVerifyingSalt] = useState(false);
  
  // UI state
  const [showAdvanced, setShowAdvanced] = useState(false);

  // Detect available years from VKNFT directory via API
  useEffect(() => {
    const detectAvailableYears = async () => {
      try {
        const response = await fetch('/api/vknft/years');
        const data = await response.json();
        
        if (data.success && Array.isArray(data.years)) {
          const years = (data.years as number[]).sort((a: number, b: number) => a - b);
          setAvailableYears(years);
          
          if (years.length > 0 && !years.includes(graduationYear)) {
            setGraduationYear(years[years.length - 1]);
          }
        } else {
          setAvailableYears([]);
        }
      } catch {
        setAvailableYears([]);
      }
    };
    
    detectAvailableYears();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    return () => {
      if (downloadUrl) URL.revokeObjectURL(downloadUrl);
    };
  }, [downloadUrl]);

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${(bytes / Math.pow(k, i)).toFixed(1)} ${sizes[i]}`;
  };

  // Verify salt against allowlist
  const handleVerifySalt = async () => {
    if (!saltInput.trim()) {
      alert(t('proofGen.salt.alert.enterSalt'));
      return;
    }
    if (!studentName.trim()) {
      alert(t('proofGen.salt.alert.enterName'));
      return;
    }
    if (!studentBirthdate.trim()) {
      alert(t('proofGen.salt.alert.enterBirthdate'));
      return;
    }

    setIsVerifyingSalt(true);
    setSaltVerification(null);

    try {
      const result = await verifySalt(saltInput.trim(), studentName.trim(), studentBirthdate.trim());
      setSaltVerification(result);
    } catch (error) {
      setSaltVerification({
        isValid: false,
        error: error instanceof Error ? error.message : 'Verification failed',
      });
    } finally {
      setIsVerifyingSalt(false);
    }
  };

  const generateProof = async () => {
    if (!secretInput) {
      alert(t('proofGen.alert.enterSecret'));
      return;
    }

    if (graduationYear < 2000 || graduationYear > 2050) {
      alert(t('proofGen.alert.yearInvalid'));
      return;
    }

    if (!webauthnCredential) {
      alert(t('proofGen.alert.setupWebAuthn'));
      return;
    }

    if (!saltVerification?.isValid) {
      alert(t('proofGen.salt.alert.verifySaltFirst'));
      return;
    }

    if (downloadUrl) {
      URL.revokeObjectURL(downloadUrl);
      setDownloadUrl(null);
      setDownloadName(null);
      setDownloadSize(null);
    }

    setIsProcessing(true);
    setStatus(t('proofGen.status.processingPdf'));
    onProgress?.({ step: 0, message: t('proofGen.progress.selected') });

    try {
      // Step 1: Calculate PDF hash
      setStatus(t('proofGen.status.calcHash'));
      onProgress?.({ step: 1, message: t('proofGen.progress.hash') });
      const pdfBuffer = await pdfFile.arrayBuffer();
      const pdfBytes = new Uint8Array(pdfBuffer);
      
      // Detect if PDF is encrypted (password-protected)
      const isEncrypted = isEncryptedPdf(pdfBytes);
      
      // Use raw hash for encrypted PDFs, normalized hash for regular PDFs
      const pdfHash = isEncrypted
        ? await calculateRawPdfHash(pdfBytes)
        : await calculatePdfHash(pdfBytes);

      // Step 2: Generate ZKP
      setStatus(t('proofGen.status.generatingZkp'));
      onProgress?.({ step: 2, message: t('proofGen.progress.zkp') });
      let selectedVKey: VKeyData | undefined = undefined;
      if (vkeyFile) {
        selectedVKey = JSON.parse(await vkeyFile.text());
      }
      const { proof, vkey } = await generateZKProof(secretInput, pdfHash, graduationYear, selectedVKey);

      if (saltVerification?.isValid && saltVerification.activationHash && saltVerification.studentIdHash) {
        proof.registration = {
          activation_hash: saltVerification.activationHash,
          student_id_hash: saltVerification.studentIdHash,
          verified_at: new Date().toISOString(),
        };
      }

      // Step 3: Sign with WebAuthn
      setStatus(t('proofGen.status.signing'));
      onProgress?.({ step: 3, message: t('proofGen.progress.sign') });
      const signature = await createWebAuthnSignature(proof, vkey, pdfHash, webauthnCredential);

      // Step 4: Attach to PDF
      // Use tail-append method for encrypted PDFs, Subject metadata for regular PDFs
      setStatus(t('proofGen.status.attaching'));
      onProgress?.({ step: 4, message: t('proofGen.progress.attach') });
      
      let outputPdf: Blob;
      if (isEncrypted) {
        // Encrypted PDF: Use tail-append method (doesn't require opening the PDF)
        const proofBundle: ProofBundle = {
          version: '1.0',
          hash_method: 'raw',
          proof,
          vkey,
          webauthn_sig: signature.webauthn,
          webauthn_pub: signature.webauthn_pub,
          sig_target: signature.sig_target,
        };
        const resultBytes = attachProofToTail(pdfBytes, proofBundle);
        // Create a new ArrayBuffer copy for Blob compatibility
        const arrayBuffer = new ArrayBuffer(resultBytes.length);
        new Uint8Array(arrayBuffer).set(resultBytes);
        outputPdf = new Blob([arrayBuffer], { type: 'application/pdf' });
      } else {
        // Regular PDF: Use Subject metadata method
        outputPdf = await attachToPdf(pdfBuffer, proof, signature, vkey);
      }

      setStatus(t('proofGen.status.complete'));
      onProgress?.({ step: 4, message: t('proofGen.progress.done') });
      
      // Store data for display
      setProofData(proof);
      setVkeyData(vkey);
      setSignatureData(signature);
      
      onProofGenerated(outputPdf, proof, vkey, signature);

      const base = (pdfFile.name || 'document').replace(/\.pdf$/i, '');
      const name = `${base}-secured.pdf`;
      const url = URL.createObjectURL(outputPdf);
      setDownloadUrl(url);
      setDownloadName(name);
      setDownloadSize(outputPdf.size);
    } catch {
      // Generic error message to prevent information leakage
      setStatus(t('proofGen.status.error'));
    } finally {
      setIsProcessing(false);
    }
  };

  // Check if can proceed
  const canGenerate = secretInput && webauthnCredential && saltVerification?.isValid;

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
      {/* Section Title */}
      <div className="text-center mb-2">
        <h3 className="text-xl font-bold text-gray-900">{t('section.generateTitle')}</h3>
      </div>

      {/* Step 1: Identity Verification - Most Important */}
      <div className="bg-gradient-to-br from-amber-50 to-orange-50 rounded-2xl p-5 border-2 border-amber-200">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-8 h-8 bg-amber-500 rounded-full flex items-center justify-center text-white font-bold">1</div>
          <h4 className="text-lg font-bold text-gray-900">{t('proofGen.salt.title')}</h4>
          {saltVerification?.isValid && (
            <span className="ml-auto bg-green-500 text-white px-3 py-1 rounded-full text-sm font-medium">
              ✓ {t('proofGen.salt.verified')}
            </span>
          )}
        </div>
        
        <p className="text-sm text-gray-600 mb-4">{t('proofGen.salt.desc')}</p>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {t('proofGen.salt.label')}
            </label>
            <input
              type="text"
              value={saltInput}
              onChange={(e) => { setSaltInput(e.target.value); setSaltVerification(null); }}
              className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 focus:border-amber-500 focus:ring-0 text-lg font-mono"
              placeholder={t('proofGen.salt.placeholder')}
              disabled={isProcessing || isVerifyingSalt}
            />
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {t('proofGen.salt.name')}
              </label>
              <input
                type="text"
                value={studentName}
                onChange={(e) => { setStudentName(e.target.value); setSaltVerification(null); }}
                className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 focus:border-amber-500 focus:ring-0"
                placeholder={t('proofGen.salt.namePlaceholder')}
                disabled={isProcessing || isVerifyingSalt}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {t('proofGen.salt.birthdate')}
              </label>
              <input
                type="date"
                value={studentBirthdate}
                onChange={(e) => { setStudentBirthdate(e.target.value); setSaltVerification(null); }}
                className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 focus:border-amber-500 focus:ring-0"
                disabled={isProcessing || isVerifyingSalt}
              />
            </div>
          </div>

          <button
            onClick={handleVerifySalt}
            disabled={isProcessing || isVerifyingSalt || !saltInput.trim() || !studentName.trim() || !studentBirthdate.trim()}
            className="w-full py-3 px-4 rounded-xl font-bold text-white bg-amber-500 hover:bg-amber-600 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
          >
            {isVerifyingSalt ? t('proofGen.salt.verifying') : t('proofGen.salt.verify')}
          </button>

          {saltVerification && !saltVerification.isValid && (
            <div className="bg-red-100 text-red-700 px-4 py-3 rounded-xl text-sm">
              ❌ {saltVerification.error || t('proofGen.salt.invalid')}
            </div>
          )}
        </div>
      </div>

      {/* Step 2: Authenticator Setup */}
      <div className={`rounded-2xl p-5 border-2 transition-all ${
        saltVerification?.isValid 
          ? 'bg-gradient-to-br from-green-50 to-emerald-50 border-green-200' 
          : 'bg-gray-50 border-gray-200 opacity-60'
      }`}>
        <div className="flex items-center gap-3 mb-4">
          <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white font-bold ${
            saltVerification?.isValid ? 'bg-green-500' : 'bg-gray-400'
          }`}>2</div>
          <h4 className="text-lg font-bold text-gray-900">{t('webauthn.title')}</h4>
          {webauthnCredential && (
            <span className="ml-auto bg-green-500 text-white px-3 py-1 rounded-full text-sm font-medium">
              ✓ {t('webauthn.registered.title')}
            </span>
          )}
        </div>
        
        {saltVerification?.isValid ? (
          <WebAuthnSetup
            onCredentialRegistered={setWebauthnCredential}
            registeredCredential={webauthnCredential}
            isDisabled={isProcessing}
          />
        ) : (
          <p className="text-gray-500 text-center py-4">
            {t('proofGen.salt.alert.verifySaltFirst')}
          </p>
        )}
      </div>

      {/* Step 3: Secret & Year Selection */}
      <div className={`rounded-2xl p-5 border-2 transition-all ${
        webauthnCredential 
          ? 'bg-gradient-to-br from-blue-50 to-indigo-50 border-blue-200' 
          : 'bg-gray-50 border-gray-200 opacity-60'
      }`}>
        <div className="flex items-center gap-3 mb-4">
          <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white font-bold ${
            webauthnCredential ? 'bg-blue-500' : 'bg-gray-400'
          }`}>3</div>
          <h4 className="text-lg font-bold text-gray-900">{t('proofGen.secret.label')}</h4>
        </div>

        {webauthnCredential ? (
          <div className="space-y-4">
            {/* Secret Input - Simplified */}
            <div>
              <input
                type="password"
                value={secretInput}
                onChange={(e) => setSecretInput(e.target.value)}
                className="w-full px-4 py-4 rounded-xl border-2 border-gray-200 focus:border-blue-500 focus:ring-0 text-lg"
                placeholder={t('proofGen.secret.placeholder')}
                disabled={isProcessing}
              />
              <p className="mt-2 text-sm text-gray-500">{t('proofGen.secret.help')}</p>
            </div>

            {/* Year Selection - Simplified */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                {t('proofGen.year.label')}
              </label>
              <div className="flex flex-wrap gap-2">
                {(availableYears.length > 0 
                  ? availableYears 
                  : [new Date().getFullYear() - 1, new Date().getFullYear(), new Date().getFullYear() + 1]
                ).map((year) => (
                  <button
                    key={year}
                    type="button"
                    onClick={() => setGraduationYear(year)}
                    className={`px-6 py-3 rounded-xl text-lg font-bold transition-all ${
                      graduationYear === year
                        ? 'bg-blue-500 text-white shadow-lg'
                        : 'bg-white text-gray-700 border-2 border-gray-200 hover:border-blue-300'
                    }`}
                    disabled={isProcessing}
                  >
                    {year}
                  </button>
                ))}
              </div>
            </div>
          </div>
        ) : (
          <p className="text-gray-500 text-center py-4">
            {t('proofGen.alert.setupWebAuthn')}
          </p>
        )}
      </div>

      {/* Advanced Settings - Collapsible */}
      <div className="border border-gray-200 rounded-xl overflow-hidden">
        <button
          type="button"
          onClick={() => setShowAdvanced(!showAdvanced)}
          className="w-full px-5 py-3 flex items-center justify-between text-gray-500 hover:bg-gray-50 transition-colors"
        >
          <span className="text-sm font-medium">{t('proofGen.advanced.title')}</span>
          <svg 
            className={`w-5 h-5 transition-transform ${showAdvanced ? 'rotate-180' : ''}`} 
            fill="none" 
            stroke="currentColor" 
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </button>
        
        {showAdvanced && (
          <div className="px-5 py-4 bg-gray-50 border-t border-gray-200">
            <div className="flex items-center gap-3">
              <span className="text-sm text-gray-600">{t('proofGen.vkey.label')}:</span>
              <label className="cursor-pointer">
                <input
                  type="file"
                  accept=".json"
                  className="hidden"
                  onChange={(e) => setVkeyFile(e.target.files?.[0] || null)}
                  disabled={isProcessing}
                />
                <span className="text-sm text-blue-600 hover:underline">
                  {vkeyFile ? vkeyFile.name : t('proofGen.vkey.select')}
                </span>
              </label>
              {vkeyFile && (
                <button
                  onClick={() => setVkeyFile(null)}
                  className="text-xs text-red-500 hover:text-red-700"
                >
                  {t('common.clear')}
                </button>
              )}
            </div>
            <p className="text-xs text-gray-400 mt-2">{t('proofGen.vkey.help')}</p>
          </div>
        )}
      </div>

      {/* Main Action Button */}
      <button
        onClick={generateProof}
        disabled={isProcessing || !canGenerate}
        className="w-full py-5 px-6 rounded-2xl font-bold text-xl text-white bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 disabled:from-gray-400 disabled:to-gray-400 disabled:cursor-not-allowed transition-all transform hover:scale-[1.02] disabled:transform-none shadow-xl hover:shadow-2xl disabled:shadow-none"
      >
        {isProcessing ? (
          <span className="flex items-center justify-center gap-3">
            <svg className="animate-spin h-6 w-6" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
            {t('proofGen.mainButtonProcessing')}
          </span>
        ) : (
          <span className="flex items-center justify-center gap-2">
            🔐 {t('proofGen.mainButton')}
          </span>
        )}
      </button>

      {/* Status Display */}
      {status && (
        <div className={`rounded-xl p-4 ${
          status.includes('Error') 
            ? 'bg-red-50 border border-red-200' 
            : 'bg-blue-50 border border-blue-200'
        }`}>
          <div className="flex items-center gap-3">
            {isProcessing && !status.includes('Error') && (
              <svg className="animate-spin h-5 w-5 text-blue-600" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
            )}
            <span className={status.includes('Error') ? 'text-red-700' : 'text-blue-700'}>
              {status}
            </span>
          </div>
        </div>
      )}

      {/* Download Section */}
      {downloadUrl && !isProcessing && (
        <div className="space-y-4">
          <div className="bg-green-50 rounded-2xl p-5 border-2 border-green-200">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div>
                <p className="font-bold text-green-800">{t('download.readyTitle')}</p>
                <p className="text-sm text-green-600 mt-1">
                  {downloadName} {typeof downloadSize === 'number' && `(${formatBytes(downloadSize)})`}
                </p>
              </div>
              <a
                href={downloadUrl}
                download={downloadName || 'secured.pdf'}
                className="inline-flex items-center justify-center px-8 py-4 rounded-xl font-bold text-white bg-green-600 hover:bg-green-700 transition-colors shadow-lg"
              >
                <svg className="w-6 h-6 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v2a2 2 0 002 2h12a2 2 0 002-2v-2M7 10l5 5m0 0l5-5m-5 5V4" />
                </svg>
                {t('download.button')}
              </a>
            </div>
          </div>

          {/* Additional Files - Collapsible */}
          {proofData && vkeyData && signatureData && (
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
          )}
        </div>
      )}
    </div>
  );
}

// Helper functions
async function calculatePdfHash(pdfData: Uint8Array): Promise<string> {
  try {
    const { PDFDocument } = await import('pdf-lib');
    const pdfDoc = await PDFDocument.load(pdfData);
    
    pdfDoc.setSubject('');
    pdfDoc.setTitle('');
    pdfDoc.setCreator('');
    pdfDoc.setProducer('');
    
    const epochDate = new Date('1970-01-01T00:00:00Z');
    pdfDoc.setCreationDate(epochDate);
    pdfDoc.setModificationDate(epochDate);
    
    const normalizedPdfBytes = await pdfDoc.save();
    
    const crypto = await import('crypto-js');
    const wordArray = crypto.lib.WordArray.create(normalizedPdfBytes);
    const hash = crypto.SHA3(wordArray, { outputLength: 512 });
    
    return hash.toString();
  } catch (error) {
    console.error('PDF hash calculation error:', error);
    const crypto = await import('crypto-js');
    const wordArray = crypto.lib.WordArray.create(pdfData);
    const hash = crypto.SHA3(wordArray, { outputLength: 512 });
    return hash.toString();
  }
}

function fnv1a64(str: string): string {
  const uint64Max = BigInt(2) ** BigInt(64);
  let hash = BigInt('0xCBF29CE484222325');
  for (let i = 0; i < str.length; i++) {
    hash ^= BigInt(str.charCodeAt(i));
    hash *= BigInt(0x100000001B3);
    hash %= uint64Max;
  }
  let hex = hash.toString(16);
  if (hex.length < 16) hex = '0'.repeat(16 - hex.length) + hex;
  return hex;
}

async function circuitAcceptsSignal(wasmPath: string, signalName: string): Promise<boolean> {
  try {
    const res = await fetch(wasmPath);
    const wasmBin = await res.arrayBuffer();
    const mod = await WebAssembly.compile(wasmBin);
    const instance = await WebAssembly.instantiate(mod, {
      runtime: {
        exceptionHandler: () => {},
        printErrorMessage: () => {},
        writeBufferMessage: () => {},
        showSharedRWMemory: () => {},
      },
    } as WebAssembly.Imports);
    const h = fnv1a64(signalName);
    const hMSB = parseInt(h.slice(0, 8), 16);
    const hLSB = parseInt(h.slice(8, 16), 16);
    const size = (instance.exports as { getInputSignalSize: (msb: number, lsb: number) => number }).getInputSignalSize(hMSB, hLSB);
    return size > 0;
  } catch {
    return false;
  }
}

function getAssetPath(path: string): string {
  let basePath = '';
  
  if (typeof window !== 'undefined') {
    const pathname = window.location.pathname;
    const match = pathname.match(/^(\/Tri-CertFramework\/(?:prover|verifier-ui))/);
    if (match) {
      basePath = match[1];
    }
    
    if (!basePath) {
      const envBasePath = process.env.NEXT_PUBLIC_BASE_PATH;
      if (envBasePath && typeof envBasePath === 'string') {
        basePath = envBasePath;
      }
    }
  }
  
  const normalizedBasePath = basePath.endsWith('/') ? basePath.slice(0, -1) : basePath;
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;
  return `${normalizedBasePath}${normalizedPath}`;
}

class ProofGenerationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ProofGenerationError';
  }
}

async function generateZKProof(secret: string, pdfHash: string, graduationYear: number, overrideVKey?: VKeyData): Promise<{ proof: ProofData; vkey: VKeyData }> {
  try {
    let vkey = {} as VKeyData;
    let vkeyHash = '';
    let wasmPath = '';
    let zkeyPath = '';
    let useVknftAssets = false;
    
    try {
      const manifestResponse = await fetch(`/api/vknft/${graduationYear}/manifest`);
      
      if (manifestResponse.ok) {
        const manifestData = await manifestResponse.json();
        
        if (manifestData.success && manifestData.manifest) {
          const manifest = manifestData.manifest;
          const wasmFileName = manifest.files?.wasm?.fileName;
          const zkeyFileName = manifest.files?.zkey?.fileName;
          const vkFileName = manifest.files?.vk?.fileName;
          
          if (wasmFileName && zkeyFileName && vkFileName) {
            wasmPath = `/api/vknft/${graduationYear}/files/${wasmFileName}`;
            zkeyPath = `/api/vknft/${graduationYear}/files/${zkeyFileName}`;
            
            const vkeyResponse = await fetch(`/api/vknft/${graduationYear}/files/${vkFileName}`);
            if (vkeyResponse.ok) {
              vkey = overrideVKey ?? (await vkeyResponse.json());
              vkeyHash = await calculateVKeyHash(vkey);
              useVknftAssets = true;
            }
          }
        }
      }
    } catch {
      // Fallback to public assets
    }
    
    if (!useVknftAssets) {
      const vkeyPath = getAssetPath('/vkey.json');
      const vkeyResponse = await fetch(vkeyPath);
      if (!vkeyResponse.ok) {
        throw new Error(`Failed to load vkey.json: ${vkeyResponse.status}`);
      }
      vkey = overrideVKey ?? (await vkeyResponse.json());
      vkeyHash = await calculateVKeyHash(vkey);
      
      wasmPath = getAssetPath('/commitment_js/commitment.wasm');
      zkeyPath = getAssetPath('/commitment_final.zkey');
      
      try {
        const wasmYear = getAssetPath(`/commitment_js/commitment_${graduationYear}.wasm`);
        const zkeyYear = getAssetPath(`/commitment_final_${graduationYear}.zkey`);
        const [wr, zr] = await Promise.all([
          fetch(wasmYear, { method: 'HEAD' }).catch(() => null),
          fetch(zkeyYear, { method: 'HEAD' }).catch(() => null),
        ]);
        if (wr && wr.ok && zr && zr.ok) {
          wasmPath = wasmYear;
          zkeyPath = zkeyYear;
        }
      } catch {
        // Use default assets
      }
    }

    // BN128 scalar field modulus (approximately 254 bits)
    const FIELD_MODULUS = BigInt('21888242871839275222246405745257275088548364400416034343698204186575808495617');
    
    const secretBytes = new TextEncoder().encode(secret);
    const secretBigInt = BigInt('0x' + Array.from(secretBytes).map(b => b.toString(16).padStart(2, '0')).join(''));
    
    // Use full SHA3-512 hash (128 hex chars = 512 bits), then reduce modulo field
    // This preserves maximum entropy while fitting into the field
    const pdfHashBigInt = BigInt('0x' + pdfHash);

    const acceptsYear = await circuitAcceptsSignal(wasmPath, 'graduation_year');

    const input: Record<string, string> = {
      owner_secret: (secretBigInt % FIELD_MODULUS).toString(),
      // Apply modular reduction to fit into BN128 field while preserving hash integrity
      pdf_sha3_512: (pdfHashBigInt % FIELD_MODULUS).toString(),
    };
    if (acceptsYear) {
      input.graduation_year = graduationYear.toString();
    }

    const [wasmCheck, zkeyCheck] = await Promise.all([
      fetch(wasmPath, { method: 'HEAD' }).catch(() => null),
      fetch(zkeyPath, { method: 'HEAD' }).catch(() => null),
    ]);
    
    if (!wasmCheck || !wasmCheck.ok) {
      throw new Error(`WASM file not found: ${wasmPath}`);
    }
    if (!zkeyCheck || !zkeyCheck.ok) {
      throw new Error(`ZKey file not found: ${zkeyPath}`);
    }
    
    const { proof, publicSignals } = await snarkjs.groth16.fullProve(input, wasmPath, zkeyPath);

    const proofData: ProofData = {
      schema: "tri-cert/proof@0",
      circuit_id: (acceptsYear ? `commitment_poseidon_${graduationYear}_v1` : `commitment_poseidon_v1`),
      vkey_hash: `sha3-256:${vkeyHash}`,
      public_signals: {
        pdf_sha3_512: `hex:${pdfHash}`,
        graduation_year: acceptsYear ? graduationYear.toString() : '',
        commit: `field:${publicSignals[0]}`
      },
      proof: {
        pi_a: [proof.pi_a[0], proof.pi_a[1]],
        pi_b: [[proof.pi_b[0][0], proof.pi_b[0][1]], [proof.pi_b[1][0], proof.pi_b[1][1]]],
        pi_c: [proof.pi_c[0], proof.pi_c[1]]
      }
    };

    return { proof: proofData, vkey };
  } catch {
    // Generic error to prevent leaking internal details
    throw new ProofGenerationError('Failed to generate proof');
  }
}

async function calculateVKeyHash(vkey: VKeyData): Promise<string> {
  const crypto = await import('crypto-js');
  const canonicalJson = JSON.stringify(vkey, Object.keys(vkey).sort());
  return crypto.SHA3(canonicalJson, { outputLength: 256 }).toString();
}

async function createWebAuthnSignature(
  proof: ProofData, 
  vkey: VKeyData, 
  pdfHash: string,
  webauthnCredential: { credentialId: string; publicKey: { x: string; y: string }; createdAt: string }
): Promise<SignatureData> {
  const sigTarget = {
    schema: "tri-cert/sig-target@0",
    circuit_id: proof.circuit_id,
    vkey_hash: proof.vkey_hash,
    pdf_sha3_512: `hex:${pdfHash}`,
    graduation_year: proof.public_signals.graduation_year,
    commit: proof.public_signals.commit,
    issued_at: new Date().toISOString()
  };

  const webauthnResponse = await createWebAuthnAssertion(webauthnCredential.credentialId, sigTarget);

  const { calculateJwkThumbprint } = await import('jose');
  const kid = await calculateJwkThumbprint({
    kty: 'EC',
    crv: 'P-256',
    x: webauthnCredential.publicKey.x,
    y: webauthnCredential.publicKey.y,
  });

  return {
    webauthn: {
      credentialId: webauthnResponse.credentialId,
      authenticatorData: webauthnResponse.authenticatorData,
      clientDataJSON: webauthnResponse.clientDataJSON,
      signature: webauthnResponse.signature,
    },
    sig_target: sigTarget,
    webauthn_pub: {
      kty: 'EC',
      crv: 'P-256',
      x: webauthnCredential.publicKey.x,
      y: webauthnCredential.publicKey.y,
      alg: 'ES256',
      kid,
    },
  };
}

async function attachToPdf(pdfBuffer: ArrayBuffer, proof: ProofData, signature: SignatureData, vkey: VKeyData): Promise<Blob> {
  try {
    const { PDFDocument } = await import('pdf-lib');
    const pdfDoc = await PDFDocument.load(pdfBuffer);
    
    const attachments = {
      'proof.json': JSON.stringify(proof, null, 2),
      'webauthn_sig.json': JSON.stringify(signature.webauthn, null, 2),
      'vkey.json': JSON.stringify(vkey, null, 2),
      'webauthn_pub.jwk.json': JSON.stringify(signature.webauthn_pub, null, 2),
      'sig_target.json': JSON.stringify(signature.sig_target, null, 2)
    };

    const metadata = {
      attachments: Object.keys(attachments).map(filename => ({
        name: filename,
        size: attachments[filename as keyof typeof attachments].length,
        data: btoa(attachments[filename as keyof typeof attachments])
      }))
    };

    pdfDoc.setSubject(JSON.stringify(metadata));

    const pdfBytes = await pdfDoc.save();
    return new Blob([new Uint8Array(pdfBytes)], { type: 'application/pdf' });
  } catch {
    return new Blob([pdfBuffer], { type: 'application/pdf' });
  }
}
