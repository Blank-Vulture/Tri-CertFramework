'use client';

import { useMemo, useState } from 'react';
import { useI18n } from './components/LanguageProvider';
import FileUpload from './components/FileUpload';
import ProofGenerator from './components/ProofGenerator';
import OutputDisplay from './components/OutputDisplay';

// Type definitions
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
    authenticatorData: string; // base64url
    clientDataJSON: string; // base64url
    signature: string; // base64url
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

export default function Home() {
  const { t } = useI18n();
  const [pdfFile, setPdfFile] = useState<File | null>(null);
  const [outputPdf, setOutputPdf] = useState<Blob | null>(null);
  const [proofData, setProofData] = useState<ProofData | null>(null);
  const [vkeyData, setVkeyData] = useState<VKeyData | null>(null);
  const [signatureData, setSignatureData] = useState<SignatureData | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [logs, setLogs] = useState<string[]>([]);
  const [step, setStep] = useState<number>(0);

  const steps = useMemo(() => [
    t('steps.upload'),
    t('steps.hash'),
    t('steps.proof'),
    t('steps.signature'),
    t('steps.export')
  ], [t]);

  const addLog = (message: string) => setLogs((prev) => [...prev, `${new Date().toLocaleTimeString()}  ${message}`]);

  return (
    <div className="min-h-full">
      {/* Header */}
      <header className="relative">
        <div className="absolute inset-0 bg-gradient-to-r from-blue-600/10 via-purple-600/10 to-indigo-600/10 blur-3xl" />
        <div className="relative px-6 pt-14 pb-16 sm:px-16 sm:pt-20 sm:pb-20">
          <div className="mx-auto max-w-2xl text-center">
            {/* Logo */}
            <div className="mx-auto mb-8 h-12 w-12 rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-600 p-3 shadow-lg">
              <svg className="h-full w-full text-white" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M3 4a1 1 0 011-1h12a1 1 0 011 1v2a1 1 0 01-1 1H4a1 1 0 01-1-1V4zm0 4a1 1 0 011-1h6a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1z" clipRule="evenodd" />
              </svg>
            </div>
            
            {/* Title */}
            <h1 className="text-4xl font-bold tracking-tight text-gray-900 sm:text-6xl">
              Scholar
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-indigo-600"> Prover</span>
            </h1>
            
            {/* Subtitle */}
            <p className="mt-6 text-lg leading-8 text-gray-600">
              {t('hero.subtitle.prover')}
              <br />
              <span className="text-sm text-gray-500 font-mono">Secure • Private • Verifiable</span>
            </p>

            {/* Status Badge */}
            <div className="mt-6 flex items-center justify-center gap-x-6">
              <span className="inline-flex items-center rounded-full bg-green-50 px-3 py-1 text-sm font-medium text-green-700 ring-1 ring-inset ring-green-600/20">
                <div className="flex h-1.5 w-1.5 items-center justify-center">
                  <div className="h-1.5 w-1.5 rounded-full bg-green-500 animate-pulse"></div>
                </div>
              <span className="ml-2">{t('hero.status.online')}</span>
              </span>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="relative px-6 pb-16 sm:px-16 sm:pb-20">
        <div className="mx-auto max-w-4xl">
          {/* Progress Steps */}
          <div className="mb-12">
            <div className="flex items-center justify-center">
              <nav aria-label="Progress" className="flex items-center">
                {steps.map((stepName, stepIndex) => (
                  <div key={stepName} className="flex items-center">
                    {stepIndex !== 0 && (
                      <div className={`h-0.5 w-16 ${stepIndex <= step ? 'bg-blue-600' : 'bg-gray-200'} transition-colors duration-300`} />
                    )}
                    <div className="flex flex-col items-center group">
                      <div className={`flex h-10 w-10 items-center justify-center rounded-full border-2 transition-all duration-300 ${
                        stepIndex <= step 
                          ? 'border-blue-600 bg-blue-600 text-white shadow-lg shadow-blue-500/25' 
                          : 'border-gray-300 bg-white text-gray-500'
                      }`}>
                        {stepIndex < step ? (
                          <svg className="h-6 w-6" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                          </svg>
                        ) : (
                          <span className="text-sm font-bold">{stepIndex + 1}</span>
                        )}
                      </div>
                      <div className="mt-2 text-xs font-medium text-gray-500 text-center max-w-20">
                        {stepName}
                      </div>
                    </div>
                  </div>
                ))}
              </nav>
            </div>
          </div>

          {/* Content Cards */}
          <div className="space-y-8">
            {/* File Upload Card */}
            <div className="relative overflow-hidden rounded-3xl bg-white shadow-xl shadow-gray-900/5 ring-1 ring-gray-900/5">
              <div className="p-8 sm:p-10">
                <FileUpload
                  onFileSelect={(file) => {
                    setPdfFile(file);
                    setStep(1);
                    addLog('📄 PDF document selected');
                  }}
                  selectedFile={pdfFile}
                />
              </div>
            </div>

            {/* Proof Generation Card */}
            {pdfFile && (
              <div className="relative overflow-hidden rounded-3xl bg-white shadow-xl shadow-gray-900/5 ring-1 ring-gray-900/5">
                <div className="p-8 sm:p-10">
                  <ProofGenerator
                    pdfFile={pdfFile}
                    onProofGenerated={(output: Blob, proof: ProofData, vkey: VKeyData, signature: SignatureData) => {
                      setOutputPdf(output);
                      setProofData(proof);
                      setVkeyData(vkey);
                      setSignatureData(signature);
                      setStep(5);
                      addLog('✅ All processes completed successfully');
                    }}
                    isProcessing={isProcessing}
                    setIsProcessing={setIsProcessing}
                    onProgress={(evt: { step: number; message: string }) => {
                      setStep(evt.step + 1);
                      addLog(evt.message);
                    }}
                  />
                </div>
              </div>
            )}

            {/* Output Display Card */}
            {outputPdf && proofData && vkeyData && signatureData && (
              <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-green-50 to-emerald-50 shadow-xl shadow-gray-900/5 ring-1 ring-green-200">
                <div className="p-8 sm:p-10">
                  <div className="mb-6 text-center">
                    <div className="mx-auto mb-4 h-12 w-12 rounded-full bg-green-100 p-3">
                      <svg className="h-full w-full text-green-600" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                      </svg>
                    </div>
                    <h3 className="text-lg font-semibold text-gray-900">{t('page.complete.title')}</h3>
                    <p className="text-sm text-gray-600">{t('page.complete.subtitle')}</p>
                  </div>
                  <OutputDisplay
                    outputPdf={outputPdf}
                    proofData={proofData}
                    vkeyData={vkeyData}
                    signatureData={signatureData}
                  />
                </div>
              </div>
            )}

            {/* Activity Log Card */}
            {logs.length > 0 && (
              <div className="relative overflow-hidden rounded-3xl bg-slate-50 shadow-xl shadow-gray-900/5 ring-1 ring-slate-200">
                <div className="p-8 sm:p-10">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                    <div className="mr-3 h-6 w-6 rounded bg-slate-200 p-1">
                      <svg className="h-full w-full text-slate-600" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M3 4a1 1 0 011-1h12a1 1 0 011 1v2a1 1 0 01-1 1H4a1 1 0 01-1-1V4zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1z" clipRule="evenodd" />
                      </svg>
                    </div>
                    {t('page.activityLog')}
                  </h3>
                  <div className="rounded-2xl bg-white border border-slate-200 p-4 max-h-64 overflow-auto">
                    <div className="space-y-2">
                      {logs.map((log, index) => (
                        <div key={index} className="flex items-start space-x-3 text-sm">
                          <div className="flex-shrink-0 w-2 h-2 bg-blue-500 rounded-full mt-2"></div>
                          <div className="font-mono text-slate-700">{log}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="relative mt-16 sm:mt-20">
        <div className="mx-auto max-w-7xl px-6 py-12 md:flex md:items-center md:justify-between lg:px-8">
          <div className="flex justify-center space-x-6 md:order-2">
            <a href="#" className="text-gray-400 hover:text-gray-500 transition-colors">
              <span className="sr-only">Documentation</span>
              <svg className="h-6 w-6" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4zm2 6a1 1 0 011-1h6a1 1 0 110 2H7a1 1 0 01-1-1zm1 3a1 1 0 100 2h6a1 1 0 100-2H7z" clipRule="evenodd" />
              </svg>
            </a>
            <a href="#" className="text-gray-400 hover:text-gray-500 transition-colors">
              <span className="sr-only">GitHub</span>
              <svg className="h-6 w-6" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 0C4.477 0 0 4.484 0 10.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0110 4.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.203 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.942.359.31.678.921.678 1.856 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0020 10.017C20 4.484 15.522 0 10 0z" clipRule="evenodd" />
              </svg>
            </a>
          </div>
          <div className="mt-8 md:order-1 md:mt-0">
            <div className="flex items-center justify-center md:justify-start">
              <p className="text-center text-xs leading-5 text-gray-500">
                © {new Date().getFullYear()} Tri-CertFramework. All rights reserved.
              </p>
              <div className="ml-4 h-4 w-px bg-gray-300"></div>
              <p className="ml-4 text-center text-xs leading-5 text-gray-400">
                Phase 0 Prototype
              </p>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
