"use client";

import { useState, useEffect, useCallback } from "react";
import { useI18n, HeaderLangSwitcher } from "./components/LanguageProvider";
import PdfUpload from "./components/PdfUpload";
import KeyUpload from "./components/KeyUpload";
import VerificationResults from "./components/VerificationResults";
import VerificationAnimation from "./components/VerificationAnimation";
import ExtractedDataPreview from "./components/ExtractedDataPreview";
import { verifyWebAuthnComplete } from "../utils/webauthn-verifier";
import type { SignatureVerificationContext } from "../types/webauthn";
import {
  checkRegistration,
  verifyProofRegistration,
} from "../utils/registration-checker";
import {
  extractProofFromTail,
  calculateRawPdfHash,
  isValidProofBundle,
  type ProofBundle,
} from "../utils/pdf-proof-utils";

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
  registration?: {
    activation_hash: string;
    student_id_hash: string;
    issuer_id?: string;
    issuer_name?: string;
    allowlist_url?: string;
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
  metadata?: {
    graduation_year?: number;
    circuit_id?: string;
    generated_at?: string;
    circuit_wasm?: string;
    circuit_zkey?: string;
  };
}

interface CertificateInfo {
  graduationYear: number | null;
  circuitId: string;
  vkeyHash: string;
  hashMethod: "raw" | "normalized";
}

interface VerificationResult {
  zkpValid: boolean;
  signatureValid: boolean;
  hashValid: boolean;
  vkeyHashValid: boolean;
  registrationValid?: boolean;
  saltRegistrationValid?: boolean;
  issuerName?: string;
  issuerId?: string;
  certificateInfo?: CertificateInfo;
  details: {
    zkp?: string;
    signature?: string;
    hash?: string;
    vkeyHash?: string;
    registration?: string;
    saltRegistration?: string;
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
    graduation_year?: string;
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
  // Added for tail-append method support
  hashMethod?: "raw" | "normalized";
  originalPdfBuffer?: ArrayBuffer;
}

// Verification step type
interface VerificationStep {
  id: string;
  name: string;
  description: string;
  status: "pending" | "running" | "success" | "error";
}

export default function Home() {
  const { t } = useI18n();
  const [pdfFile, setPdfFile] = useState<File | null>(null);
  const [vkeyFile, setVkeyFile] = useState<File | null>(null);
  const [publicKeyFile, setPublicKeyFile] = useState<File | null>(null);
  const [verificationResult, setVerificationResult] =
    useState<VerificationResult | null>(null);
  const [isVerifying, setIsVerifying] = useState(false);
  const [showAdvancedOptions, setShowAdvancedOptions] = useState(false);
  const [verificationSteps, setVerificationSteps] = useState<
    VerificationStep[]
  >([]);
  const [currentStepIndex, setCurrentStepIndex] = useState(-1);
  const [extractedDataInfo, setExtractedDataInfo] = useState<{
    hasProof: boolean;
    hasVkey: boolean;
    hasSignature: boolean;
    hasPublicKey: boolean;
    circuitId?: string;
    graduationYear?: number | null;
    hashMethod?: "raw" | "normalized";
    schema?: string;
  } | null>(null);

  // Initialize verification steps
  const initializeSteps = useCallback(() => {
    return [
      {
        id: "extract",
        name: t("verify.step.extract"),
        description: t("verify.step.extractDesc"),
        status: "pending" as const,
      },
      {
        id: "hash",
        name: t("verify.step.hash"),
        description: t("verify.step.hashDesc"),
        status: "pending" as const,
      },
      {
        id: "zkp",
        name: t("verify.step.zkp"),
        description: t("verify.step.zkpDesc"),
        status: "pending" as const,
      },
      {
        id: "signature",
        name: t("verify.step.signature"),
        description: t("verify.step.signatureDesc"),
        status: "pending" as const,
      },
      {
        id: "registration",
        name: t("verify.step.registration"),
        description: t("verify.step.registrationDesc"),
        status: "pending" as const,
      },
    ];
  }, [t]);

  // Update step status helper
  const updateStepStatus = (
    stepId: string,
    status: "running" | "success" | "error",
  ) => {
    setVerificationSteps((prev) =>
      prev.map((step) => (step.id === stepId ? { ...step, status } : step)),
    );
  };

  // Load VK by year
  const loadVKByYear = async (year: number): Promise<VKeyData | null> => {
    try {
      const response = await fetch(`/vkey_${year}.json`);
      if (response.ok) return await response.json();

      const fallbackResponse = await fetch("/vkey.json");
      if (fallbackResponse.ok) return await fallbackResponse.json();
      return null;
    } catch {
      return null;
    }
  };

  // Detect graduation year from proof, sig_target, and/or vkey metadata
  const detectGraduationYear = (
    proof: ProofData,
    vkey?: VKeyData | null,
    sigTarget?: ExtractedData["sigTarget"] | null
  ): number | null => {
    try {
      // Priority 1: Check proof.public_signals.graduation_year
      if (proof.public_signals?.graduation_year) {
        const year = parseInt(proof.public_signals.graduation_year, 10);
        if (year >= 2000 && year <= 2050) return year;
      }

      // Priority 2: Check sig_target.graduation_year (WebAuthn signed data)
      if (sigTarget?.graduation_year) {
        const year = parseInt(sigTarget.graduation_year, 10);
        if (year >= 2000 && year <= 2050) return year;
      }

      // Priority 3: Check circuit_id for year pattern
      const circuitIdMatch = proof.circuit_id?.match(/(\d{4})/);
      if (circuitIdMatch) {
        const year = parseInt(circuitIdMatch[1], 10);
        if (year >= 2000 && year <= 2050) return year;
      }

      // Priority 4: Check VKey metadata.graduation_year
      if (vkey?.metadata?.graduation_year) {
        const year = vkey.metadata.graduation_year;
        if (year >= 2000 && year <= 2050) return year;
      }

      return null;
    } catch {
      return null;
    }
  };

  async function readFileToArrayBuffer(file: File): Promise<ArrayBuffer> {
    try {
      return await file.arrayBuffer();
    } catch {
      const reader = new FileReader();
      return await new Promise<ArrayBuffer>((resolve, reject) => {
        reader.onerror = () =>
          reject(reader.error || new DOMException("File read failed"));
        reader.onload = () => {
          if (reader.result instanceof ArrayBuffer) {
            resolve(reader.result);
          } else {
            reject(new DOMException("Empty file read result"));
          }
        };
        reader.readAsArrayBuffer(file);
      });
    }
  }

  // Delay helper for animation
  const delay = (ms: number) =>
    new Promise((resolve) => setTimeout(resolve, ms));

  const handleVerify = async () => {
    if (!pdfFile) {
      alert(t("alerts.selectPdf"));
      return;
    }

    setIsVerifying(true);
    setVerificationResult(null);

    // Initialize steps
    const steps = initializeSteps();
    setVerificationSteps(steps);
    setCurrentStepIndex(0);

    try {
      // Step 1: Extract data from PDF
      updateStepStatus("extract", "running");
      await delay(500);

      let pdfBuffer: ArrayBuffer;
      try {
        pdfBuffer = await readFileToArrayBuffer(pdfFile);
      } catch {
        updateStepStatus("extract", "error");
        throw new Error("PDF読み込み失敗");
      }
      const extractedData = await extractPdfData(pdfBuffer);

      // Store extracted data info for preview
      const detectedYearForPreview = extractedData.proof
        ? detectGraduationYear(extractedData.proof, extractedData.vkey, extractedData.sigTarget)
        : null;
      setExtractedDataInfo({
        hasProof: !!extractedData.proof,
        hasVkey: !!extractedData.vkey,
        hasSignature: !!extractedData.webauthnSignature,
        hasPublicKey: !!extractedData.publicKey,
        circuitId: extractedData.proof?.circuit_id,
        graduationYear: detectedYearForPreview,
        hashMethod: extractedData.hashMethod,
        schema: extractedData.proof?.schema,
      });

      updateStepStatus("extract", "success");
      setCurrentStepIndex(1);

      // Step 2: Calculate hash
      // Use appropriate hash method based on how the proof was attached
      await delay(300);
      updateStepStatus("hash", "running");
      let calculatedHash: string;

      if (
        extractedData.hashMethod === "raw" &&
        extractedData.originalPdfBuffer
      ) {
        // Tail-append method: use raw hash of original PDF (without proof data)
        calculatedHash = await calculateRawPdfHash(
          extractedData.originalPdfBuffer,
        );
      } else {
        // Subject method: use normalized hash
        calculatedHash = await calculatePdfHash(pdfBuffer);
      }

      const expectedHash = extractedData.proof?.public_signals?.pdf_sha3_512;
      const hashValid = expectedHash === `hex:${calculatedHash}`;
      updateStepStatus("hash", hashValid ? "success" : "error");
      setCurrentStepIndex(2);

      // Step 3: Verify ZKP
      await delay(300);
      updateStepStatus("zkp", "running");
      let zkpValid = false;
      let zkpDetails = t("results.noProofFound");
      let vkeyUsedForZkp: VKeyData | null = null;

      if (extractedData.proof) {
        let vkey = null;

        if (vkeyFile) {
          vkey = JSON.parse(await vkeyFile.text());
          zkpDetails = t("results.usingLocalVK");
        } else if (extractedData.vkey) {
          vkey = extractedData.vkey;
          zkpDetails = t("results.usingEmbeddedVK");
        } else {
          const detectedYear = detectGraduationYear(extractedData.proof, null, extractedData.sigTarget);
          if (detectedYear) {
            const autoVkey = await loadVKByYear(detectedYear);
            if (autoVkey) {
              vkey = autoVkey;
              zkpDetails = t("results.usingAutoVK").replace(
                "{year}",
                detectedYear.toString(),
              );
            }
          }
        }

        if (vkey) {
          vkeyUsedForZkp = vkey as VKeyData;
          const pdfHex = (
            extractedData.proof.public_signals.pdf_sha3_512 || ""
          ).replace("hex:", "");
          const preferHex =
            pdfHex && pdfHex.length > 0 ? pdfHex : calculatedHash;
          zkpValid = await verifyZKP(extractedData.proof, vkey, {
            calculatedPdfHashHex: preferHex,
          });
          zkpDetails = zkpValid ? `✅ ${zkpDetails}` : `❌ ${zkpDetails}`;
        }
      }
      updateStepStatus("zkp", zkpValid ? "success" : "error");
      setCurrentStepIndex(3);

      // Step 4: Verify signature
      await delay(300);
      updateStepStatus("signature", "running");
      let signatureValid = false;
      let signatureDetails = t("results.noSignatureFound");

      if (
        extractedData.webauthnSignature &&
        extractedData.sigTarget &&
        (publicKeyFile || extractedData.publicKey)
      ) {
        const pubKey = publicKeyFile
          ? JSON.parse(await publicKeyFile.text())
          : extractedData.publicKey;

        if (pubKey) {
          const verificationContext: SignatureVerificationContext = {
            webauthn: extractedData.webauthnSignature,
            sig_target: extractedData.sigTarget,
            webauthn_pub: pubKey,
          };

          try {
            const result = await verifyWebAuthnComplete(verificationContext);
            signatureValid = result.isValid;

            if (result.isValid) {
              signatureDetails = `✅ ${t("results.signatureValid")}`;
            } else {
              signatureDetails = `❌ ${t("results.signatureFailed")}`;
            }
          } catch {
            signatureDetails = `❌ ${t("results.signatureError")}`;
          }
        }
      }
      updateStepStatus("signature", signatureValid ? "success" : "error");
      setCurrentStepIndex(4);

      // Step 5: Check registration
      await delay(300);
      updateStepStatus("registration", "running");

      let registrationValid: boolean | undefined = undefined;
      let registrationDetails = "";
      let saltRegistrationValid = false;
      let saltRegistrationDetails = t("results.saltRegistration.notFound");
      let issuerName: string | undefined;
      let issuerId: string | undefined;

      // Salt-based registration check
      // Detect graduation year for year matching (use vkeyUsedForZkp for metadata fallback)
      const proofGraduationYear = extractedData.proof
        ? detectGraduationYear(extractedData.proof, vkeyUsedForZkp, extractedData.sigTarget)
        : null;

      if (extractedData.proof?.registration) {
        try {
          const saltResult = await verifyProofRegistration(
            extractedData.proof.registration,
            proofGraduationYear ?? undefined, // Pass graduation year for matching
          );
          saltRegistrationValid = saltResult.isValid;

          if (saltResult.isValid) {
            // Check year matching result
            if (saltResult.yearMatchesProof === false) {
              // Year mismatch - warn but don't fail
              saltRegistrationDetails =
                t("results.saltRegistration.verified") +
                ` (${t("results.yearMismatch")}: ${t("results.registeredYear")} ${saltResult.graduationYear}, ${t("results.proofYear")} ${proofGraduationYear})`;
            } else if (saltResult.yearMatchesProof === true) {
              saltRegistrationDetails =
                t("results.saltRegistration.verified") +
                ` (${t("results.yearMatch")}: ${saltResult.graduationYear}${t("results.yearSuffix")})`;
            } else {
              saltRegistrationDetails = t("results.saltRegistration.verified");
            }
            // Capture issuer info from the verification result
            issuerName = saltResult.issuerName;
            issuerId = saltResult.issuerId;
          } else {
            saltRegistrationDetails = t("results.saltRegistration.invalid");
          }
        } catch {
          saltRegistrationDetails = t("results.saltRegistration.error");
        }
      } else {
        saltRegistrationDetails = t("results.saltRegistration.notIncluded");
      }

      // Public key registration check (optional)
      if (extractedData.publicKey || publicKeyFile) {
        const pubKey = publicKeyFile
          ? JSON.parse(await publicKeyFile.text())
          : extractedData.publicKey;
        if (pubKey) {
          try {
            const registrationResult = await checkRegistration(pubKey);
            const isRegistryEmpty = registrationResult.error?.includes("empty");
            const isRegistryUnavailable =
              registrationResult.error === "Failed to fetch student registry";

            if (
              !isRegistryUnavailable &&
              !isRegistryEmpty &&
              !registrationResult.error
            ) {
              registrationValid = registrationResult.isRegistered;
              registrationDetails = registrationValid
                ? t("results.registrationVerified")
                : t("results.registrationNotFound");
            }
          } catch {
            // Skip
          }
        }
      }

      updateStepStatus(
        "registration",
        saltRegistrationValid ? "success" : "error",
      );

      // VKey hash verification
      const vkeyForHash =
        vkeyUsedForZkp ||
        (vkeyFile ? JSON.parse(await vkeyFile.text()) : extractedData.vkey);
      const vkeyHashValid =
        vkeyForHash && extractedData.proof
          ? await verifyVKeyHash(extractedData.proof, vkeyForHash)
          : false;

      // Small delay before showing results
      await delay(500);

      // Build certificate info
      const detectedYear = extractedData.proof
        ? detectGraduationYear(extractedData.proof, vkeyUsedForZkp, extractedData.sigTarget)
        : null;
      const certificateInfo: CertificateInfo | undefined = extractedData.proof
        ? {
            graduationYear: detectedYear,
            circuitId: extractedData.proof.circuit_id || "",
            vkeyHash: extractedData.proof.vkey_hash || "",
            hashMethod: extractedData.hashMethod || "normalized",
          }
        : undefined;

      setVerificationResult({
        zkpValid,
        signatureValid,
        hashValid,
        vkeyHashValid,
        registrationValid,
        saltRegistrationValid,
        issuerName,
        issuerId,
        certificateInfo,
        details: {
          zkp: zkpDetails,
          signature: signatureDetails,
          hash: hashValid ? t("results.hashMatch") : t("results.hashMismatch"),
          vkeyHash: vkeyHashValid
            ? t("results.vkeyHashMatch")
            : t("results.vkeyHashMismatch"),
          registration: registrationDetails,
          saltRegistration: saltRegistrationDetails,
        },
      });
    } catch (error) {
      console.error("Verification error:", error);
      setVerificationResult({
        zkpValid: false,
        signatureValid: false,
        hashValid: false,
        vkeyHashValid: false,
        details: {
          zkp: t("results.verificationError"),
          signature: t("results.verificationError"),
          hash: t("results.verificationError"),
          vkeyHash: t("results.verificationError"),
        },
      });
    } finally {
      setIsVerifying(false);
    }
  };

  // Reset when file changes
  useEffect(() => {
    if (!pdfFile) {
      setVerificationResult(null);
      setVerificationSteps([]);
      setCurrentStepIndex(-1);
      setExtractedDataInfo(null);
    }
  }, [pdfFile]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-emerald-50 to-teal-50">
      {/* Language Switcher - Top Right */}
      <div className="fixed top-4 right-4 z-50">
        <div className="bg-white/80 backdrop-blur-sm rounded-xl px-4 py-2 shadow-lg border border-gray-200/50">
          <HeaderLangSwitcher />
        </div>
      </div>

      {/* Header - Simplified */}
      <header className="relative pt-12 pb-8 sm:pt-16 sm:pb-10">
        <div className="mx-auto max-w-xl text-center px-6">
          {/* Logo */}
          <div className="mx-auto mb-6 h-16 w-16 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-600 p-4 shadow-xl transform hover:scale-105 transition-transform">
            <svg
              className="h-full w-full text-white"
              fill="currentColor"
              viewBox="0 0 20 20"
            >
              <path
                fillRule="evenodd"
                d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                clipRule="evenodd"
              />
            </svg>
          </div>

          {/* Title - Large and Clear */}
          <h1 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-3">
            {t("page.title")}
          </h1>

          {/* Simple Subtitle */}
          <p className="text-lg text-gray-600 leading-relaxed">
            {t("hero.subtitle.verifier")}
          </p>
        </div>
      </header>

      {/* Main Content */}
      <main className="relative px-6 pb-16">
        <div className="mx-auto max-w-2xl space-y-6">
          {/* PDF Upload - Primary Action */}
          <div className="bg-white rounded-3xl shadow-xl border border-gray-200/50 overflow-hidden">
            <div className="p-6 sm:p-8">
              <PdfUpload onFileSelect={setPdfFile} selectedFile={pdfFile} />
            </div>
          </div>

          {/* Advanced Options - Collapsible */}
          <div className="bg-white rounded-2xl shadow-md border border-gray-200/50 overflow-hidden">
            <button
              type="button"
              onClick={() => setShowAdvancedOptions(!showAdvancedOptions)}
              className="w-full px-6 py-4 flex items-center justify-between text-gray-600 hover:bg-gray-50 transition-colors"
            >
              <span className="text-sm font-medium">{t("advanced.title")}</span>
              <div className="flex items-center gap-2">
                <span className="text-xs text-gray-400">
                  {t("advanced.optional")}
                </span>
                <svg
                  className={`w-5 h-5 transition-transform duration-200 ${showAdvancedOptions ? "rotate-180" : ""}`}
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M19 9l-7 7-7-7"
                  />
                </svg>
              </div>
            </button>

            {showAdvancedOptions && (
              <div className="px-6 pb-6 pt-2 border-t border-gray-100 bg-gray-50/50 space-y-4">
                <p className="text-xs text-gray-500 mb-4">
                  {t("advanced.desc")}
                </p>

                <KeyUpload
                  title={t("vkSection.key.title")}
                  description={t("vkSection.key.desc")}
                  onFileSelect={setVkeyFile}
                  selectedFile={vkeyFile}
                  accept=".json"
                  compact
                />

                <KeyUpload
                  title={t("keyUpload.publicKey.title")}
                  description={t("keyUpload.publicKey.desc")}
                  onFileSelect={setPublicKeyFile}
                  selectedFile={publicKeyFile}
                  accept=".json"
                  compact
                />
              </div>
            )}
          </div>

          {/* Verify Button */}
          <button
            onClick={handleVerify}
            disabled={!pdfFile || isVerifying}
            className="w-full py-5 px-6 rounded-2xl font-bold text-xl text-white bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 disabled:from-gray-400 disabled:to-gray-400 disabled:cursor-not-allowed transition-all transform hover:scale-[1.02] disabled:transform-none shadow-xl hover:shadow-2xl disabled:shadow-none"
          >
            {isVerifying ? (
              <span className="flex items-center justify-center gap-3">
                <svg
                  className="animate-spin h-6 w-6"
                  fill="none"
                  viewBox="0 0 24 24"
                >
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                  />
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                  />
                </svg>
                {t("action.verifying")}
              </span>
            ) : (
              <span className="flex items-center justify-center gap-2">
                🔍 {t("action.verify")}
              </span>
            )}
          </button>

          {/* Verification Animation */}
          {isVerifying && verificationSteps.length > 0 && (
            <div className="bg-white rounded-3xl shadow-xl border border-gray-200/50 overflow-hidden animate-fadeIn">
              <div className="p-6 sm:p-8">
                <VerificationAnimation
                  steps={verificationSteps}
                  currentStepIndex={currentStepIndex}
                />
              </div>
            </div>
          )}

          {/* Extracted Data Preview */}
          {extractedDataInfo && !isVerifying && (
            <div className="animate-fadeIn">
              <ExtractedDataPreview
                hasProof={extractedDataInfo.hasProof}
                hasVkey={extractedDataInfo.hasVkey}
                hasSignature={extractedDataInfo.hasSignature}
                hasPublicKey={extractedDataInfo.hasPublicKey}
                circuitId={extractedDataInfo.circuitId}
                graduationYear={extractedDataInfo.graduationYear}
                hashMethod={extractedDataInfo.hashMethod}
                schema={extractedDataInfo.schema}
              />
            </div>
          )}

          {/* Results */}
          {verificationResult && !isVerifying && (
            <div className="animate-fadeIn">
              <VerificationResults result={verificationResult} />
            </div>
          )}
        </div>
      </main>

      {/* Footer */}
      <footer className="py-8 text-center">
        <p className="text-xs text-gray-400">
          © {new Date().getFullYear()} Tri-CertFramework
        </p>
      </footer>

      {/* Animation Styles */}
      <style jsx>{`
        @keyframes fadeIn {
          from {
            opacity: 0;
            transform: translateY(20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        .animate-fadeIn {
          animation: fadeIn 0.5s ease-out;
        }
      `}</style>
    </div>
  );
}

/**
 * Safely parse JSON with error handling
 */
function safeJsonParse<T>(data: string): T | null {
  try {
    return JSON.parse(data) as T;
  } catch {
    return null;
  }
}

/**
 * Validate extracted proof data structure
 */
function isValidProofData(data: unknown): data is ProofData {
  if (!data || typeof data !== "object") return false;
  const obj = data as Record<string, unknown>;
  return (
    typeof obj.schema === "string" &&
    typeof obj.circuit_id === "string" &&
    typeof obj.vkey_hash === "string" &&
    obj.public_signals !== null &&
    typeof obj.public_signals === "object" &&
    obj.proof !== null &&
    typeof obj.proof === "object"
  );
}

// Helper functions
async function extractPdfData(pdfBuffer: ArrayBuffer): Promise<ExtractedData> {
  // First, try tail-append method (for encrypted/password-protected PDFs)
  const tailResult = extractProofFromTail(pdfBuffer);
  if (tailResult && isValidProofBundle(tailResult.proofBundle)) {
    const bundle = tailResult.proofBundle as ProofBundle;
    const result: ExtractedData = {
      hashMethod: bundle.hash_method,
      originalPdfBuffer: tailResult.originalPdf,
    };

    // Extract proof data
    if (bundle.proof && isValidProofData(bundle.proof)) {
      result.proof = bundle.proof as ProofData;
    }

    // Extract vkey
    if (bundle.vkey) {
      result.vkey = bundle.vkey as VKeyData;
    }

    // Extract WebAuthn signature
    if (bundle.webauthn_sig) {
      result.webauthnSignature =
        bundle.webauthn_sig as ExtractedData["webauthnSignature"];
    }

    // Extract sig_target
    if (bundle.sig_target) {
      result.sigTarget = bundle.sig_target as ExtractedData["sigTarget"];
    }

    // Extract public key
    if (bundle.webauthn_pub) {
      result.publicKey = bundle.webauthn_pub as ExtractedData["publicKey"];
    }

    return result;
  }

  // Fallback: try Subject metadata method (for regular PDFs)
  try {
    const { PDFDocument } = await import("pdf-lib");
    const pdfDoc = await PDFDocument.load(pdfBuffer);

    const subject = pdfDoc.getSubject();

    if (subject) {
      const metadata = safeJsonParse<{
        attachments?: Array<{ name: string; data: string }>;
      }>(subject);
      if (!metadata || !Array.isArray(metadata.attachments)) {
        return {};
      }

      const attachments = metadata.attachments;
      const result: ExtractedData = {
        hashMethod: "normalized", // Subject method always uses normalized hash
      };

      for (const attachment of attachments) {
        if (!attachment.name || !attachment.data) continue;

        let data: string;
        try {
          data = atob(attachment.data);
        } catch {
          continue; // Skip invalid base64
        }

        if (attachment.name === "proof.json") {
          const parsed = safeJsonParse<ProofData>(data);
          if (parsed && isValidProofData(parsed)) {
            result.proof = parsed;
          }
        } else if (attachment.name === "webauthn_sig.json") {
          const parsed =
            safeJsonParse<ExtractedData["webauthnSignature"]>(data);
          if (parsed) result.webauthnSignature = parsed;
        } else if (attachment.name === "sig_target.json") {
          const parsed = safeJsonParse<ExtractedData["sigTarget"]>(data);
          if (parsed) result.sigTarget = parsed;
        } else if (attachment.name === "vkey.json") {
          const parsed = safeJsonParse<VKeyData>(data);
          if (parsed) result.vkey = parsed;
        } else if (attachment.name === "webauthn_pub.jwk.json") {
          const parsed = safeJsonParse<ExtractedData["publicKey"]>(data);
          if (parsed) result.publicKey = parsed;
        }
      }

      return result;
    }

    return {};
  } catch {
    return {};
  }
}

async function calculatePdfHash(pdfBuffer: ArrayBuffer): Promise<string> {
  try {
    const { PDFDocument } = await import("pdf-lib");
    const pdfDoc = await PDFDocument.load(pdfBuffer);

    pdfDoc.setSubject("");
    pdfDoc.setTitle("");
    pdfDoc.setCreator("");
    pdfDoc.setProducer("");

    const now = new Date("1970-01-01T00:00:00Z");
    pdfDoc.setCreationDate(now);
    pdfDoc.setModificationDate(now);

    const pdfBytes = await pdfDoc.save();

    const crypto = await import("crypto-js");
    const wordArray = crypto.lib.WordArray.create(pdfBytes);
    return crypto.SHA3(wordArray, { outputLength: 512 }).toString();
  } catch {
    const crypto = await import("crypto-js");
    const wordArray = crypto.lib.WordArray.create(pdfBuffer);
    return crypto.SHA3(wordArray, { outputLength: 512 }).toString();
  }
}

async function verifyZKP(
  proof: ProofData,
  vkey: VKeyData,
  options?: { calculatedPdfHashHex?: string },
): Promise<boolean> {
  try {
    // @ts-expect-error - snarkjs doesn't have proper TypeScript declarations
    const snarkjs = await import("snarkjs");

    const commitField = proof.public_signals.commit.replace("field:", "");

    // BN128 scalar field modulus (approximately 254 bits)
    const FIELD_MODULUS = BigInt(
      "21888242871839275222246405745257275088548364400416034343698204186575808495617",
    );

    const toFieldFromPdfHash = (
      hexWithPrefix?: string,
      fallbackHex?: string,
    ): string | null => {
      try {
        const hex =
          (hexWithPrefix?.startsWith("hex:")
            ? hexWithPrefix.slice(4)
            : hexWithPrefix) || fallbackHex;
        if (!hex) return null;
        // Use full hash and reduce modulo field for maximum entropy preservation
        const fullHash = "0x" + hex;
        return (BigInt(fullHash) % FIELD_MODULUS).toString();
      } catch {
        return null;
      }
    };

    const pdfField = toFieldFromPdfHash(
      proof.public_signals.pdf_sha3_512,
      options?.calculatedPdfHashHex,
    );
    const year = proof.public_signals.graduation_year
      ? parseInt(proof.public_signals.graduation_year, 10)
      : null;

    const candidates: string[][] = [];
    if (vkey.nPublic === 1) {
      candidates.push([commitField]);
    }
    if (vkey.nPublic === 2 && pdfField) {
      candidates.push([commitField, pdfField]);
      candidates.push([pdfField, commitField]);
    }
    if (vkey.nPublic === 3 && pdfField && year !== null) {
      candidates.push([commitField, pdfField, String(year)]);
      candidates.push([pdfField, String(year), commitField]);
      candidates.push([commitField, String(year), pdfField]);
    }

    if (candidates.length === 0) {
      candidates.push([commitField]);
    }

    for (const publicSignals of candidates) {
      try {
        const ok = await snarkjs.groth16.verify(vkey, publicSignals, {
          pi_a: proof.proof.pi_a,
          pi_b: proof.proof.pi_b,
          pi_c: proof.proof.pi_c,
        });
        if (ok) return true;
      } catch {
        continue;
      }
    }

    return false;
  } catch {
    return false;
  }
}

async function verifyVKeyHash(
  proof: ProofData,
  vkey: VKeyData,
): Promise<boolean> {
  try {
    const crypto = await import("crypto-js");
    const canonicalJson = JSON.stringify(vkey, Object.keys(vkey).sort());
    const hash = crypto.SHA3(canonicalJson, { outputLength: 256 }).toString();
    return proof.vkey_hash === `sha3-256:${hash}`;
  } catch {
    return false;
  }
}
