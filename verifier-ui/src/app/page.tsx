'use client';

import { useState } from 'react';
import { useI18n } from './components/LanguageProvider';
import PdfUpload from './components/PdfUpload';
import KeyUpload from './components/KeyUpload';
import VerificationResults from './components/VerificationResults';
import { verifyWebAuthnComplete } from '../utils/webauthn-verifier';
import type { SignatureVerificationContext } from '../types/webauthn';

// Type definitions
interface ProofData {
  schema: string;
  circuit_id: string;
  vkey_hash: string;
  public_signals: {
    pdf_sha3_512: string;
    graduation_year?: string;
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

interface VerificationResult {
  zkpValid: boolean;
  signatureValid: boolean;
  hashValid: boolean;
  vkeyHashValid: boolean;
  details: {
    zkp?: string;
    signature?: string;
    hash?: string;
    vkeyHash?: string;
  };
}

interface ExtractedData {
  proof?: ProofData;
  webauthnSignature?: {
    credentialId: string;
    authenticatorData: string;
    clientDataJSON: string;
    signature: string;
  };
  sigTarget?: {
    schema: string;
    circuit_id: string;
    vkey_hash: string;
    pdf_sha3_512: string;
    commit: string;
    issued_at: string;
  };
  vkey?: VKeyData;
  publicKey?: {
    kty: string;
    crv: string;
    x: string;
    y: string;
    alg: string;
    kid: string;
  };
}

export default function Home() {
  const { t } = useI18n();
  const [pdfFile, setPdfFile] = useState<File | null>(null);
  const [vkeyFile, setVkeyFile] = useState<File | null>(null);
  const [publicKeyFile, setPublicKeyFile] = useState<File | null>(null);
  const [verificationResult, setVerificationResult] = useState<VerificationResult | null>(null);
  const [isVerifying, setIsVerifying] = useState(false);

  // Function to load VK based on graduation year
  const loadVKByYear = async (year: number): Promise<any | null> => {
    try {
      // Try to fetch from public directory with year-specific filename
      const response = await fetch(`/vkey_${year}.json`);
      if (response.ok) {
        return await response.json();
      }
      
      // Fallback to default vkey.json
      const fallbackResponse = await fetch('/vkey.json');
      if (fallbackResponse.ok) {
        console.warn(`VK for year ${year} not found, using default vkey.json`);
        return await fallbackResponse.json();
      }
      console.warn(`No VK found for year ${year} and no fallback available`);
      return null;
    } catch (error) {
      console.error(`Failed to load VK for year ${year}:`, error);
      return null;
    }
  };

  // Function to auto-detect graduation year from proof
  const detectGraduationYear = (proof: ProofData): number | null => {
    try {
      if (proof.public_signals?.graduation_year) {
        const year = parseInt(proof.public_signals.graduation_year, 10);
        if (year >= 2000 && year <= 2050) {
          return year;
        }
      }
      
      // Try to extract from circuit_id (e.g., commitment_poseidon_2024_v1)
      const circuitIdMatch = proof.circuit_id?.match(/(\d{4})/);
      if (circuitIdMatch) {
        const year = parseInt(circuitIdMatch[1], 10);
        if (year >= 2000 && year <= 2050) {
          return year;
        }
      }
      
      return null;
    } catch (error) {
      console.warn('Failed to detect graduation year from proof:', error);
      return null;
    }
  };

  const handleVerify = async () => {
    if (!pdfFile) {
      alert('Please select a PDF file to verify');
      return;
    }

    setIsVerifying(true);
    
    try {
      // Extract data from PDF
      const pdfBuffer = await pdfFile.arrayBuffer();
      const extractedData = await extractPdfData(pdfBuffer);
      // Pre-calculate normalized PDF hash for ZKP public signal reconstruction
      const calculatedHash = await calculatePdfHash(pdfBuffer);
      
      // Verify ZKP
      let zkpValid = false;
      let zkpDetails = 'No proof found';
      let vkeyUsedForZkp: VKeyData | null = null;
      if (extractedData.proof) {
        let vkey = null;
        // Prefer user-selected local VK file
        if (vkeyFile) {
          const selected = JSON.parse(await vkeyFile.text());
          // If proof carries a vkey_hash, prefer a VK that matches it
          if (extractedData.proof?.vkey_hash) {
            const selectedHash = `sha3-256:${await calculateVKeyHash(selected as VKeyData)}`;
            if (selectedHash !== extractedData.proof.vkey_hash) {
              // Try embedded VK as fallback if it matches the hash
              if (extractedData.vkey) {
                const embeddedHash = `sha3-256:${await calculateVKeyHash(extractedData.vkey)}`;
                if (embeddedHash === extractedData.proof.vkey_hash) {
                  vkey = extractedData.vkey;
                  zkpDetails = 'Local VK hash mismatch. Using VK embedded in PDF.';
                } else {
                  // Proceed with selected VK but note mismatch
                  vkey = selected;
                  zkpDetails = 'Using locally selected VK file (hash mismatch with proof)';
                }
              } else {
                vkey = selected;
                zkpDetails = 'Using locally selected VK file (hash mismatch with proof)';
              }
            } else {
              vkey = selected;
              zkpDetails = 'Using locally selected VK file';
            }
          } else {
            vkey = selected;
            zkpDetails = 'Using locally selected VK file';
          }
        } else if (extractedData.vkey) {
          // Fallback to VK embedded in PDF if present
          vkey = extractedData.vkey;
          zkpDetails = 'Using VK embedded in PDF';
        } else {
          // Optional: attempt to auto-detect year and load from public if available
          const detectedYear = detectGraduationYear(extractedData.proof);
          if (detectedYear) {
            const autoVkey = await loadVKByYear(detectedYear);
            if (autoVkey) {
              vkey = autoVkey;
              zkpDetails = `Using VK found for year ${detectedYear}`;
            } else {
              zkpDetails = 'No VK available. Please select a local VK file.';
            }
          } else {
            zkpDetails = 'No VK available. Please select a local VK file.';
          }
        }
        
        // Perform ZKP verification
        if (vkey) {
          vkeyUsedForZkp = vkey as VKeyData;
          // Pass calculated PDF hash to help reconstruct field input for year-aware circuits
          const pdfHex = (extractedData.proof.public_signals.pdf_sha3_512 || '').replace('hex:', '');
          const calculatedPdfHash = calculatedHash; // computed later as hex string
          const preferHex = pdfHex && pdfHex.length > 0 ? pdfHex : calculatedPdfHash;
          zkpValid = await verifyZKP(extractedData.proof, vkey, { calculatedPdfHashHex: preferHex });
          zkpDetails = zkpValid ? `Valid proof (${zkpDetails})` : `Invalid proof (${zkpDetails})`;
        } else {
          zkpDetails = 'No VK available for verification';
        }
      }
      
      // Verify WebAuthn signature
      let signatureValid = false;
      let signatureDetails = 'No WebAuthn signature found';
      if (extractedData.webauthnSignature && extractedData.sigTarget && (publicKeyFile || extractedData.publicKey)) {
        const pubKey = publicKeyFile ? JSON.parse(await publicKeyFile.text()) : extractedData.publicKey;
        
        if (pubKey) {
          console.log('=== Starting WebAuthn Verification Process ===');
          console.log('Extracted WebAuthn data:', {
            hasSignature: !!extractedData.webauthnSignature,
            hasSigTarget: !!extractedData.sigTarget,
            hasPublicKey: !!pubKey,
            credentialId: extractedData.webauthnSignature.credentialId,
            sigTargetSchema: extractedData.sigTarget.schema
          });

          const verificationContext: SignatureVerificationContext = {
            webauthn: extractedData.webauthnSignature,
            sig_target: extractedData.sigTarget,
            webauthn_pub: pubKey,
          };

          console.log('WebAuthn verification context prepared');
          
          try {
            const result = await verifyWebAuthnComplete(verificationContext);
            signatureValid = result.isValid;
            signatureDetails = result.isValid 
              ? 'Valid WebAuthn signature - Biometric authentication verified' 
              : `Invalid WebAuthn signature: ${result.details.error || 'Cryptographic verification failed'}`;
              
            console.log('=== WebAuthn verification completed ===');
            console.log('Final result:', {
              isValid: result.isValid,
              signatureValid: result.details.signatureValid,
              credentialBindingValid: result.details.credentialBindingValid,
              error: result.details.error
            });
          } catch (verificationError) {
            console.error('WebAuthn verification threw an error:', verificationError);
            signatureValid = false;
            signatureDetails = `WebAuthn verification error: ${verificationError instanceof Error ? verificationError.message : 'Unknown error'}`;
          }
        } else {
          console.warn('No public key available for WebAuthn verification');
          signatureDetails = 'No public key found for WebAuthn verification';
        }
      } else {
        console.warn('Missing WebAuthn verification data:', {
          hasSignature: !!extractedData.webauthnSignature,
          hasSigTarget: !!extractedData.sigTarget,
          hasPublicKey: !!(publicKeyFile || extractedData.publicKey)
        });
      }
      
      // Verify PDF hash (re-use pre-calculated value)
      const expectedHash = extractedData.proof?.public_signals?.pdf_sha3_512;
      const hashValid = expectedHash === `hex:${calculatedHash}`;
      
      console.log('PDF Hash Verification:', {
        calculatedHash: calculatedHash.substring(0, 20) + '...',
        expectedHash: expectedHash,
        hashValid
      });
      
      // Verify VKey hash
      const vkeyForHash = vkeyUsedForZkp 
        || (vkeyFile ? JSON.parse(await vkeyFile.text()) : extractedData.vkey);
      const vkeyHashValid = vkeyForHash && extractedData.proof 
        ? await verifyVKeyHash(extractedData.proof, vkeyForHash) 
        : false;
      
      setVerificationResult({
        zkpValid,
        signatureValid,
        hashValid,
        vkeyHashValid,
        details: {
          zkp: zkpDetails,
          signature: signatureDetails,
          hash: hashValid ? 'PDF hash matches' : 'PDF hash mismatch',
          vkeyHash: vkeyHashValid ? 'VKey hash matches' : 'VKey hash mismatch'
        }
      });
    } catch (error) {
      console.error('Verification error:', error);
      setVerificationResult({
        zkpValid: false,
        signatureValid: false,
        hashValid: false,
        vkeyHashValid: false,
        details: {
          zkp: 'Error during verification',
          signature: 'Error during verification',
          hash: 'Error during verification',
          vkeyHash: 'Error during verification'
        }
      });
    } finally {
      setIsVerifying(false);
    }
  };

  return (
    <div className="min-h-full">
      {/* Hero */}
      <header className="relative">
        <div className="absolute inset-0 bg-gradient-to-r from-emerald-400/10 via-teal-400/10 to-green-400/10 blur-3xl" />
        <div className="relative px-6 pt-14 pb-12 sm:px-16 sm:pt-20 sm:pb-16">
          <div className="mx-auto max-w-2xl text-center">
            <div className="mx-auto mb-8 h-12 w-12 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-600 p-3 shadow-lg">
              <svg className="h-full w-full text-white" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
            </div>
            <h1 className="text-4xl font-bold tracking-tight text-gray-900 sm:text-6xl">
              TriCert <span className="gradient-text">Verifier</span>
            </h1>
            <p className="mt-6 text-lg leading-8 text-gray-600">
              {t('hero.subtitle.verifier')}
            </p>
          </div>
        </div>
      </header>

      {/* Main */}
      <main className="relative px-6 pb-16 sm:px-16 sm:pb-20">
        <div className="mx-auto max-w-4xl">
          <div className="space-y-10">
            <PdfUpload
              onFileSelect={setPdfFile}
              selectedFile={pdfFile}
            />

            {/* VK Selection */}
            <div className="relative overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-gray-200">
              <div className="p-6">
                <h3 className="text-lg font-medium text-gray-900 mb-4">検証鍵選択方法</h3>
                <div className="space-y-4">
                  <p className="text-sm text-gray-600">
                    ローカルのVKファイルを選択するか、PDFに埋め込まれたVKを使用します。
                  </p>
                  <div className="ml-1">
                    <KeyUpload
                      title="Verification Key (vkey.json)"
                      description="推奨: ローカルのVKファイルを選択。未選択の場合はPDF内のVKを使用します。"
                      onFileSelect={setVkeyFile}
                      selectedFile={vkeyFile}
                      accept=".json"
                    />
                  </div>
                </div>
              </div>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <KeyUpload
                title="Public Key (webauthn_pub.jwk.json)"
                description="Optional: If not provided, will use key from PDF"
                onFileSelect={setPublicKeyFile}
                selectedFile={publicKeyFile}
                accept=".json"
              />
            </div>
            
            <button
              onClick={handleVerify}
              disabled={!pdfFile || isVerifying}
              className="group relative w-full flex items-center justify-center px-8 py-4 border border-transparent rounded-2xl text-base font-semibold text-white bg-gradient-to-r from-emerald-600 via-teal-600 to-green-600 hover:from-emerald-700 hover:via-teal-700 hover:to-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-emerald-500 disabled:from-gray-400 disabled:to-gray-500 disabled:cursor-not-allowed transition-all duration-300 shadow-xl hover:shadow-2xl disabled:shadow-none"
            >
              {isVerifying ? t('action.verifying') : t('action.verify')}
            </button>
            
            {verificationResult && (
              <div className="relative overflow-hidden rounded-3xl bg-white shadow-xl shadow-gray-900/5 ring-1 ring-gray-900/5">
                <div className="p-8 sm:p-10">
                  <VerificationResults result={verificationResult} />
                </div>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}

// Helper functions
async function extractPdfData(pdfBuffer: ArrayBuffer): Promise<ExtractedData> {
  try {
    const { PDFDocument } = await import('pdf-lib');
    const pdfDoc = await PDFDocument.load(pdfBuffer);
    
    // Extract from PDF metadata (Phase 0 implementation)
    const subject = pdfDoc.getSubject();
    
    if (subject) {
      const metadata = JSON.parse(subject);
      const attachments = metadata.attachments || [];
      
      const result: ExtractedData = {};
      
      for (const attachment of attachments) {
        const data = atob(attachment.data);
        
        if (attachment.name === 'proof.json') {
          result.proof = JSON.parse(data);
        } else if (attachment.name === 'webauthn_sig.json') {
          result.webauthnSignature = JSON.parse(data);
        } else if (attachment.name === 'sig_target.json') {
          result.sigTarget = JSON.parse(data);
        } else if (attachment.name === 'vkey.json') {
          result.vkey = JSON.parse(data);
        } else if (attachment.name === 'webauthn_pub.jwk.json') {
          result.publicKey = JSON.parse(data);
        }
      }
      
      return result;
    }
    
    return {};
  } catch (error) {
    console.error('Error extracting PDF data:', error);
    return {};
  }
}

async function calculatePdfHash(pdfBuffer: ArrayBuffer): Promise<string> {
  // Remove attachments and calculate hash (Phase 0 spec compliant)
  try {
    const { PDFDocument } = await import('pdf-lib');
    const pdfDoc = await PDFDocument.load(pdfBuffer);
    
    console.log('Original PDF metadata before clearing:', {
      title: pdfDoc.getTitle(),
      subject: pdfDoc.getSubject()?.substring(0, 50) + '...',
      creator: pdfDoc.getCreator(),
      producer: pdfDoc.getProducer()
    });
    
    // Clear all metadata/attachments for consistent hashing (matches Prover exactly)
    pdfDoc.setSubject('');
    pdfDoc.setTitle('');
    pdfDoc.setCreator('');
    pdfDoc.setProducer('');
    
    // Also clear dates to match exactly with Prover's normalized state
    const now = new Date('1970-01-01T00:00:00Z'); // Reset to epoch for consistency
    pdfDoc.setCreationDate(now);
    pdfDoc.setModificationDate(now);
    
    const pdfBytes = await pdfDoc.save();
    
    console.log('Normalized PDF size for hashing:', pdfBytes.length);
    
    const crypto = await import('crypto-js');
    const wordArray = crypto.lib.WordArray.create(pdfBytes);
    const hash = crypto.SHA3(wordArray, { outputLength: 512 }).toString();
    
    console.log('Calculated hash:', hash.substring(0, 20) + '...');
    
    return hash;
  } catch (error) {
    console.error('PDF hash calculation error:', error);
    // Fallback to direct hash
    const crypto = await import('crypto-js');
    const wordArray = crypto.lib.WordArray.create(pdfBuffer);
    return crypto.SHA3(wordArray, { outputLength: 512 }).toString();
  }
}

async function verifyZKP(proof: ProofData, vkey: VKeyData, options?: { calculatedPdfHashHex?: string }): Promise<boolean> {
  try {
    console.log('Verifying ZKP with proof:', proof);
    console.log('Using vkey:', { ...vkey, IC: `IC length: ${vkey.IC?.length}` });

    // @ts-expect-error - snarkjs doesn't have proper TypeScript declarations
    const snarkjs = await import('snarkjs');

    const commitField = proof.public_signals.commit.replace('field:', '');

    // Convert hex SHA3-512 to field element the same way Prover does
    const toFieldFromPdfHash = (hexWithPrefix?: string, fallbackHex?: string): string | null => {
      try {
        const hex = (hexWithPrefix?.startsWith('hex:') ? hexWithPrefix.slice(4) : hexWithPrefix) || fallbackHex;
        if (!hex) return null;
        const modulus = BigInt('21888242871839275222246405745257275088548364400416034343698204186575808495617');
        const slice = '0x' + hex.slice(0, 60);
        const asField = (BigInt(slice) % modulus).toString();
        return asField;
      } catch (e) {
        console.warn('Failed to convert PDF hash to field element', e);
        return null;
      }
    };

    const pdfField = toFieldFromPdfHash(proof.public_signals.pdf_sha3_512, options?.calculatedPdfHashHex);
    const year = proof.public_signals.graduation_year ? parseInt(proof.public_signals.graduation_year, 10) : null;

    const candidates: string[][] = [];
    // Legacy: commit only
    if (vkey.nPublic === 1) {
      candidates.push([commitField]);
    }
    // Two-public-signals variants
    if (vkey.nPublic === 2 && pdfField) {
      // Common patterns: [commit, pdf] or [pdf, commit]
      candidates.push([commitField, pdfField]);
      candidates.push([pdfField, commitField]);
    }
    // Three-public-signals variants (year-aware circuit)
    if (vkey.nPublic === 3 && pdfField && year !== null) {
      // Most likely Circom order is outputs first: [commit, pdf, year]
      candidates.push([commitField, pdfField, String(year)]);
      // Alternative plausible orders
      candidates.push([pdfField, String(year), commitField]);
      candidates.push([commitField, String(year), pdfField]);
    }

    if (candidates.length === 0) {
      // Fallback to commit-only
      candidates.push([commitField]);
    }

    console.log('Candidate public signals for verification:', candidates);

    // Try candidates until one verifies
    for (const publicSignals of candidates) {
      try {
        const ok = await snarkjs.groth16.verify(
          vkey,
          publicSignals,
          {
            pi_a: proof.proof.pi_a,
            pi_b: proof.proof.pi_b,
            pi_c: proof.proof.pi_c
          }
        );
        console.log('Tried publicSignals:', publicSignals, '=>', ok);
        if (ok) return true;
      } catch (inner) {
        console.warn('Verification attempt errored for candidate publicSignals:', inner);
      }
    }

    return false;
  } catch (error) {
    console.error('ZKP verification error:', error);
    return false;
  }
}

// Removed old JWS signature verification - now using WebAuthn verification

async function verifyVKeyHash(proof: ProofData, vkey: VKeyData): Promise<boolean> {
  try {
    const crypto = await import('crypto-js');
    const canonicalJson = JSON.stringify(vkey, Object.keys(vkey).sort());
    const hash = crypto.SHA3(canonicalJson, { outputLength: 256 }).toString();
    return proof.vkey_hash === `sha3-256:${hash}`;
  } catch (error) {
    console.error('VKey hash verification error:', error);
    return false;
  }
}

async function calculateVKeyHash(vkey: VKeyData): Promise<string> {
  const crypto = await import('crypto-js');
  const canonicalJson = JSON.stringify(vkey, Object.keys(vkey).sort());
  return crypto.SHA3(canonicalJson, { outputLength: 256 }).toString();
}
