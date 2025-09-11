"use client";

import { useEffect, useState } from 'react';
import { useI18n } from './LanguageProvider';
import WebAuthnSetup from './WebAuthnSetup';
import {
  createWebAuthnAssertion,
} from '../../utils/webauthn';
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
    authenticatorData: string; // base64url
    clientDataJSON: string; // base64url
    signature: string; // base64url
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
  const [webauthnCredential, setWebauthnCredential] = useState<WebAuthnCredentialInfo | null>(null);
  const [vkeyFile, setVkeyFile] = useState<File | null>(null);
  const [vkeyHashPreview, setVkeyHashPreview] = useState<string | null>(null);
  const [downloadUrl, setDownloadUrl] = useState<string | null>(null);
  const [downloadName, setDownloadName] = useState<string | null>(null);
  const [downloadSize, setDownloadSize] = useState<number | null>(null);

  useEffect(() => {
    return () => {
      if (downloadUrl) URL.revokeObjectURL(downloadUrl);
    };
  }, [downloadUrl]);

  // When a VK file is selected, pre-compute and show its hash (for operator confidence)
  useEffect(() => {
    (async () => {
      try {
        if (!vkeyFile) {
          setVkeyHashPreview(null);
          return;
        }
        const json = JSON.parse(await vkeyFile.text());
        const hash = await calculateVKeyHash(json);
        setVkeyHashPreview(`sha3-256:${hash}`);
      } catch (e) {
        console.warn('Failed to preview VK hash', e);
        setVkeyHashPreview(null);
      }
    })();
  }, [vkeyFile]);

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${(bytes / Math.pow(k, i)).toFixed(1)} ${sizes[i]}`;
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
      const pdfHash = await calculatePdfHash(new Uint8Array(pdfBuffer));

      // Step 2: Generate ZKP
      setStatus(t('proofGen.status.generatingZkp'));
      onProgress?.({ step: 2, message: t('proofGen.progress.zkp') });
      // If a local VK is selected, use it; otherwise fetch default public VK
      let selectedVKey: VKeyData | undefined = undefined;
      if (vkeyFile) {
        selectedVKey = JSON.parse(await vkeyFile.text());
      }
      const { proof, vkey } = await generateZKProof(secretInput, pdfHash, graduationYear, selectedVKey);

      // Step 3: Sign with WebAuthn
      setStatus(t('proofGen.status.signing'));
      onProgress?.({ step: 3, message: t('proofGen.progress.sign') });
      const signature = await createWebAuthnSignature(proof, vkey, pdfHash, webauthnCredential);

      // Step 4: Attach to PDF
      setStatus(t('proofGen.status.attaching'));
      onProgress?.({ step: 4, message: t('proofGen.progress.attach') });
      const outputPdf = await attachToPdf(pdfBuffer, proof, signature, vkey);

      setStatus(t('proofGen.status.complete'));
      onProgress?.({ step: 4, message: t('proofGen.progress.done') });
      onProofGenerated(outputPdf, proof, vkey, signature);

      const base = (pdfFile.name || 'document').replace(/\.pdf$/i, '');
      const name = `${base}-secured.pdf`;
      const url = URL.createObjectURL(outputPdf);
      setDownloadUrl(url);
      setDownloadName(name);
      setDownloadSize(outputPdf.size);
    } catch (error) {
      console.error('Error generating proof:', error);
      setStatus('Error: ' + (error as Error).message);
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="space-y-8">
      <div>
        <h3 className="text-lg font-semibold text-gray-900 mb-6">{t('section.generateTitle')}</h3>
        
        <div className="space-y-8">
          {/* WebAuthn Setup */}
          <WebAuthnSetup
            onCredentialRegistered={setWebauthnCredential}
            registeredCredential={webauthnCredential}
            isDisabled={isProcessing}
          />

          {/* Secret Input */}
          <div className="relative">
            <label htmlFor="secret" className="block text-sm font-medium text-gray-900 mb-3">
              <div className="flex items-center space-x-2">
                <div className="h-5 w-5 rounded bg-gradient-to-br from-blue-500 to-indigo-600 p-1">
                  <svg className="h-full w-full text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                  </svg>
                </div>
                <span>{t('proofGen.secret.label')}</span>
              </div>
            </label>
            <div className="relative">
              <input
                type="password"
                id="secret"
                value={secretInput}
                onChange={(e) => setSecretInput(e.target.value)}
                className="block w-full rounded-2xl border-0 bg-gray-50 px-4 py-4 text-gray-900 placeholder:text-gray-400 focus:bg-white focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-all duration-200 disabled:bg-gray-100 disabled:text-gray-500"
                placeholder={t('proofGen.secret.placeholder')}
                disabled={isProcessing}
              />
              <div className="absolute inset-y-0 right-0 flex items-center pr-4">
                <svg className="h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                </svg>
              </div>
            </div>
            <p className="mt-2 text-sm text-gray-600">
              {t('proofGen.secret.help')}
            </p>
          </div>

          {/* Graduation Year Input */}
          <div className="relative">
            <label htmlFor="graduation-year" className="block text-sm font-medium text-gray-900 mb-3">
              <div className="flex items-center space-x-2">
                <div className="h-5 w-5 rounded bg-gradient-to-br from-green-500 to-emerald-600 p-1">
                  <svg className="h-full w-full text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3a2 2 0 012-2h4l2 2h4a2 2 0 012 2v1M8 7v8a2 2 0 002 2h8a2 2 0 002-2V9a2 2 0 00-2-2h-2M8 7H6a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2v-1" />
                  </svg>
                </div>
                <span>{t('proofGen.year.label')}</span>
              </div>
            </label>
            <div className="flex items-center space-x-4">
              {/* Quick Select Buttons */}
              <div className="flex space-x-2">
                {[new Date().getFullYear() - 1, new Date().getFullYear(), new Date().getFullYear() + 1].map((year) => (
                  <button
                    key={year}
                    type="button"
                    onClick={() => setGraduationYear(year)}
                    className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                      graduationYear === year
                        ? 'bg-green-500 text-white shadow-md'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                    disabled={isProcessing}
                  >
                    {year}
                  </button>
                ))}
              </div>
              
              {/* Custom Year Input */}
              <div className="flex items-center space-x-2">
                <span className="text-sm text-gray-500">{t('proofGen.year.or')}</span>
                <input
                  type="text"
                  id="graduation-year"
                  value={graduationYear}
                  onChange={(e) => {
                    const value = e.target.value.replace(/[^0-9]/g, ''); // Remove non-numeric characters
                    if (value === '') {
                      setGraduationYear(new Date().getFullYear());
                    } else {
                      const year = parseInt(value, 10);
                      if (year >= 2000 && year <= 2050) {
                        setGraduationYear(year);
                      }
                    }
                  }}
                  placeholder={t('proofGen.year.placeholder')}
                  maxLength={4}
                  className="block w-20 rounded-lg border-gray-300 border px-3 py-2 text-center text-sm focus:border-green-500 focus:ring-green-500 disabled:bg-gray-100 disabled:text-gray-500"
                  disabled={isProcessing}
                  inputMode="numeric"
                  pattern="[0-9]*"
                />
                <span className="text-sm text-gray-500">年</span>
              </div>
            </div>
            <p className="mt-2 text-sm text-gray-600">
              {t('proofGen.year.help')}
            </p>
          </div>

          {/* Verification Key Selection (Fail-safe) */}
          <div className="relative">
            <label className="block text-sm font-medium text-gray-900 mb-3">
              <div className="flex items-center space-x-2">
                <div className="h-5 w-5 rounded bg-gradient-to-br from-emerald-500 to-teal-600 p-1">
                  <svg className="h-full w-full text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                </div>
                <span>{t('proofGen.vkey.label')}</span>
              </div>
            </label>
            <div className="flex items-center gap-3">
              <label className="inline-flex items-center px-3 py-2 rounded-lg border border-gray-300 bg-gray-50 text-sm text-gray-700 hover:bg-gray-100 cursor-pointer">
                <input
                  type="file"
                  accept=".json,application/json"
                  className="sr-only"
                  onChange={(e) => setVkeyFile(e.target.files?.[0] || null)}
                  disabled={isProcessing}
                />
                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v16c0 1.1.9 2 2 2h12a2 2 0 002-2V8l-6-4H6a2 2 0 00-2 2z" />
                </svg>
                <span>{vkeyFile ? t('proofGen.vkey.changeFile') : t('proofGen.vkey.select')}</span>
              </label>
              {vkeyFile && (
                <div className="text-xs text-gray-600">
                  <div className="font-medium">{vkeyFile.name}</div>
                  {vkeyHashPreview && (
                    <div className="text-emerald-600">{t('proofGen.vkey.hash')}: {vkeyHashPreview.substring(0, 20)}...</div>
                  )}
                </div>
              )}
              {vkeyFile && (
                <button
                  type="button"
                  onClick={() => setVkeyFile(null)}
                  className="ml-auto text-xs text-red-600 hover:text-red-700"
                  disabled={isProcessing}
                >
                  {t('common.clear')}
                </button>
              )}
            </div>
            <p className="mt-2 text-sm text-gray-600">{t('proofGen.vkey.help')}</p>
          </div>

          {/* Generate Button */}
          <div>
            <button
              onClick={generateProof}
              disabled={isProcessing || !secretInput || !webauthnCredential}
              className="group relative w-full flex items-center justify-center px-8 py-4 border border-transparent rounded-2xl text-base font-semibold text-white bg-gradient-to-r from-blue-600 via-blue-700 to-indigo-700 hover:from-blue-700 hover:via-blue-800 hover:to-indigo-800 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:from-gray-400 disabled:to-gray-500 disabled:cursor-not-allowed transition-all duration-300 shadow-xl hover:shadow-2xl disabled:shadow-none transform hover:scale-105 disabled:transform-none"
            >
              <div className="absolute inset-0 bg-gradient-to-r from-blue-400/20 to-indigo-400/20 rounded-2xl blur-xl group-hover:blur-2xl transition-all duration-300 opacity-0 group-hover:opacity-100"></div>
              <div className="relative flex items-center">
                {isProcessing ? (
                  <>
                    <div className="mr-3">
                      <div className="animate-spin h-6 w-6 border-2 border-white border-t-transparent rounded-full"></div>
                    </div>
                    <span>Generating Proof...</span>
                  </>
                ) : (
                  <>
                    <svg className="w-6 h-6 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                    </svg>
                    <span>Generate Proof & Digital Signature</span>
                  </>
                )}
              </div>
            </button>
          </div>
        </div>
      </div>

      {/* Status Display */}
      {status && (
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-blue-50 to-indigo-50 p-6 border border-blue-200">
          <div className="flex items-start space-x-4">
            <div className="flex-shrink-0">
              <div className="h-10 w-10 rounded-xl bg-blue-100 p-2">
                {isProcessing ? (
                  <div className="h-full w-full rounded-full border-2 border-blue-500 border-t-transparent animate-spin"></div>
                ) : (
                  <svg className="h-full w-full text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                )}
              </div>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-blue-900 mb-1">Processing Status</p>
              <p className="text-sm text-blue-700">{status}</p>
              {isProcessing && (
                <div className="mt-3">
                  <div className="h-1 bg-blue-200 rounded-full overflow-hidden">
                    <div className="h-full bg-gradient-to-r from-blue-500 to-indigo-500 rounded-full animate-pulse"></div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {downloadUrl && !isProcessing && (
        <div className="relative overflow-hidden rounded-2xl bg-white p-6 border border-gray-200 shadow-sm">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <p className="text-sm font-semibold text-gray-900">{t('download.readyTitle')}</p>
              <p className="text-sm text-gray-600 mt-1">
                {downloadName} {typeof downloadSize === 'number' && (
                  <span className="text-gray-500">({formatBytes(downloadSize)})</span>
                )}
              </p>
            </div>
            <div className="flex items-center gap-3">
              <a
                href={downloadUrl}
                download={downloadName || 'secured.pdf'}
                className="inline-flex items-center justify-center px-5 py-3 rounded-xl text-sm font-semibold text-white bg-green-600 hover:bg-green-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-green-500 transition-colors"
                aria-label={t('download.aria')}
              >
                <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v2a2 2 0 002 2h12a2 2 0 002-2v-2M7 10l5 5m0 0l5-5m-5 5V4" />
                </svg>
                {t('download.button')}
              </a>
              <button
                type="button"
                onClick={() => {
                  if (downloadUrl) URL.revokeObjectURL(downloadUrl);
                  setDownloadUrl(null);
                  setDownloadName(null);
                  setDownloadSize(null);
                }}
                className="inline-flex items-center justify-center px-4 py-3 rounded-xl text-sm font-semibold text-gray-700 bg-gray-100 hover:bg-gray-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-gray-400 transition-colors"
              >
                {t('common.clear')}
              </button>
            </div>
          </div>
          <p className="sr-only">{t('download.afterHint')}</p>
        </div>
      )}
    </div>
  );
}

// Helper functions - Real implementation
async function calculatePdfHash(pdfData: Uint8Array): Promise<string> {
  // Use SHA3-512 as specified in Phase 0
  // Process PDF to normalize state for consistent hashing
  try {
    const { PDFDocument } = await import('pdf-lib');
    const pdfDoc = await PDFDocument.load(pdfData);
    
    console.log('Prover: Original PDF loaded, normalizing for hash calculation...');
    
    // Clear any existing metadata/attachments for consistent hashing
    pdfDoc.setSubject('');
    pdfDoc.setTitle('');
    pdfDoc.setCreator('');
    pdfDoc.setProducer('');
    
    // Set consistent dates (matches Verifier)
    const epochDate = new Date('1970-01-01T00:00:00Z');
    pdfDoc.setCreationDate(epochDate);
    pdfDoc.setModificationDate(epochDate);
    
    // Save normalized PDF
    const normalizedPdfBytes = await pdfDoc.save();
    
    console.log('Prover: Normalized PDF size:', normalizedPdfBytes.length);
    
    const crypto = await import('crypto-js');
    const wordArray = crypto.lib.WordArray.create(normalizedPdfBytes);
    const hash = crypto.SHA3(wordArray, { outputLength: 512 });
    
    const hashString = hash.toString();
    console.log('Prover: Calculated hash:', hashString.substring(0, 20) + '...');
    
    return hashString;
  } catch (error) {
    console.error('PDF hash calculation error:', error);
    // Fallback to direct hash for development
    const crypto = await import('crypto-js');
    const wordArray = crypto.lib.WordArray.create(pdfData);
    const hash = crypto.SHA3(wordArray, { outputLength: 512 });
    return hash.toString();
  }
}

// Minimal FNV-1a 64-bit hash to mirror witness_calculator behavior
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
  } catch (e) {
    // If introspection fails, default to not including optional signals
    console.warn('Circuit introspection failed; skipping optional signal', signalName, e);
    return false;
  }
}

async function generateZKProof(secret: string, pdfHash: string, graduationYear: number, overrideVKey?: VKeyData): Promise<{ proof: ProofData; vkey: VKeyData }> {
  console.log('Starting ZKP generation with:', { 
    secret: secret.substring(0, 10) + '...', 
    pdfHash: pdfHash.substring(0, 20) + '...', 
    graduationYear 
  });
  
  try {
    // Load verification key first to get vkey hash
    const vkey: VKeyData = overrideVKey ?? (await (await fetch('/vkey.json')).json());
    const vkeyHash = await calculateVKeyHash(vkey);

    // Prepare circuit inputs (compatible with both legacy and year-aware circuits)
    // Convert secret to field element (mod prime field)
    const secretBytes = new TextEncoder().encode(secret);
    const secretBigInt = BigInt('0x' + Array.from(secretBytes).map(b => b.toString(16).padStart(2, '0')).join(''));
    
    // Convert PDF hash to field element (use first part)
    const pdfHashBigInt = BigInt('0x' + pdfHash.slice(0, 60)); // Use first 60 chars to fit in field
    
    // Prefer year-specific assets if available; fallback to default Phase 0 assets
    let wasmPath = '/commitment_js/commitment.wasm';
    let zkeyPath = '/commitment_final.zkey';
    try {
      const wasmYear = `/commitment_js/commitment_${graduationYear}.wasm`;
      const zkeyYear = `/commitment_final_${graduationYear}.zkey`;
      const [wr, zr] = await Promise.all([
        fetch(wasmYear, { method: 'HEAD' }).catch(() => null),
        fetch(zkeyYear, { method: 'HEAD' }).catch(() => null),
      ]);
      if (wr && wr.ok && zr && zr.ok) {
        wasmPath = wasmYear;
        zkeyPath = zkeyYear;
        console.log('Using year-specific circuit assets:', { wasmPath, zkeyPath });
      } else {
        console.log('Year-specific circuit assets not found; using default assets');
      }
    } catch (e) {
      console.warn('Asset detection error; using default assets', e);
    }

    // Introspect circuit to see if it accepts graduation_year as input
    const acceptsYear = await circuitAcceptsSignal(wasmPath, 'graduation_year');

    const input: Record<string, string> = {
      owner_secret: (secretBigInt % BigInt('21888242871839275222246405745257275088548364400416034343698204186575808495617')).toString(),
      pdf_sha3_512: (pdfHashBigInt % BigInt('21888242871839275222246405745257275088548364400416034343698204186575808495617')).toString(),
    };
    if (acceptsYear) {
      input.graduation_year = graduationYear.toString();
    }

    console.log('Circuit inputs prepared:', input);
    
    console.log('Loading circuit files:', { wasmPath, zkeyPath });
    
    // Generate proof using snarkjs
    const { proof, publicSignals } = await snarkjs.groth16.fullProve(
      input,
      wasmPath,
      zkeyPath
    );

    console.log('ZKP generated successfully:', { publicSignals });

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
        // Keep snarkjs ordering intact (no swapping)
        pi_b: [[proof.pi_b[0][0], proof.pi_b[0][1]], [proof.pi_b[1][0], proof.pi_b[1][1]]],
        pi_c: [proof.pi_c[0], proof.pi_c[1]]
      }
    };

    return { proof: proofData, vkey };
  } catch (error) {
    console.error('ZKP Generation Error:', error);
    throw new Error('Failed to generate ZK proof. Ensure circuit assets are available and try again.');
  }
}

async function calculateVKeyHash(vkey: VKeyData): Promise<string> {
  const crypto = await import('crypto-js');
  const canonicalJson = JSON.stringify(vkey, Object.keys(vkey).sort());
  return crypto.SHA3(canonicalJson, { outputLength: 256 }).toString();
}

// removed mock proof generation

async function createWebAuthnSignature(
  proof: ProofData, 
  vkey: VKeyData, 
  pdfHash: string,
  webauthnCredential: WebAuthnCredentialInfo
): Promise<SignatureData> {
  try {
    console.log('Creating WebAuthn signature with credential:', webauthnCredential);

    // Prepare payload to bind all critical artifacts
    const sigTarget = {
      schema: "tri-cert/sig-target@0",
      circuit_id: proof.circuit_id,
      vkey_hash: proof.vkey_hash,
      pdf_sha3_512: `hex:${pdfHash}`,
      graduation_year: proof.public_signals.graduation_year,
      commit: proof.public_signals.commit,
      issued_at: new Date().toISOString()
    };

    console.log('Signature target prepared:', sigTarget);

    // Create WebAuthn assertion
    const webauthnResponse = await createWebAuthnAssertion(
      webauthnCredential.credentialId,
      sigTarget
    );

    console.log('WebAuthn assertion created:', webauthnResponse);

    // Compute JWK thumbprint for kid
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
  } catch (error) {
    console.error('WebAuthn signature creation error:', error);
    throw new Error(`WebAuthn signature failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

// WebAuthn-based signature implementation

async function attachToPdf(pdfBuffer: ArrayBuffer, proof: ProofData, signature: SignatureData, vkey: VKeyData): Promise<Blob> {
  try {
    // Use pdf-lib to attach files to PDF (Phase 0 simplified implementation)
    const { PDFDocument } = await import('pdf-lib');
    
    // Load the original PDF (should be clean/normalized)
    const pdfDoc = await PDFDocument.load(pdfBuffer);
    
    // Prepare attachment data
    const attachments = {
      'proof.json': JSON.stringify(proof, null, 2),
      'webauthn_sig.json': JSON.stringify(signature.webauthn, null, 2),
      'vkey.json': JSON.stringify(vkey, null, 2),
      'webauthn_pub.jwk.json': JSON.stringify(signature.webauthn_pub, null, 2),
      'sig_target.json': JSON.stringify(signature.sig_target, null, 2)
    };

    // Store attachment metadata in PDF Subject only for Phase 0
    // Keep other metadata fields empty to match the hash calculation
    const metadata = {
      attachments: Object.keys(attachments).map(filename => ({
        name: filename,
        size: attachments[filename as keyof typeof attachments].length,
        data: btoa(attachments[filename as keyof typeof attachments])
      }))
    };

    // Only set Subject for attachments - keep other metadata empty to preserve hash
    pdfDoc.setSubject(JSON.stringify(metadata));
    // Do NOT set title, creator, producer, dates to preserve original PDF hash

    // Save the PDF with metadata
    const pdfBytes = await pdfDoc.save();
    return new Blob([new Uint8Array(pdfBytes)], { type: 'application/pdf' });
  } catch (error) {
    console.error('PDF attachment error:', error);
    // Fallback to original PDF for development
    return new Blob([pdfBuffer], { type: 'application/pdf' });
  }
}
