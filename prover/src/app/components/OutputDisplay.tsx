'use client';

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
  jws: string;
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
  const downloadPdf = () => {
    const url = URL.createObjectURL(outputPdf);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'output.pdf';
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
    <div className="bg-gradient-to-r from-green-50 to-blue-50 rounded-xl p-6 space-y-6">
      <div className="text-center">
        <h3 className="text-xl font-bold text-gray-900 mb-2">🎉 Proof Generated Successfully!</h3>
        <p className="text-gray-600">Download your cryptographically secured files</p>
      </div>
      
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        <button
          onClick={downloadPdf}
          className="flex flex-col items-center p-4 border border-transparent text-sm font-medium rounded-lg shadow-md text-white bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 transition-all duration-200"
        >
          <svg className="h-6 w-6 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
          <span className="font-semibold">Secured PDF</span>
          <span className="text-xs opacity-90">with ZKP & Signature</span>
        </button>

        <button
          onClick={() => downloadJson(proofData, 'proof.json')}
          className="flex flex-col items-center p-4 border border-gray-200 shadow-sm text-sm font-medium rounded-lg text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-all duration-200"
        >
          <svg className="h-6 w-6 mb-2 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
          <span className="font-semibold">ZK Proof</span>
          <span className="text-xs text-gray-500">proof.json</span>
        </button>

        <button
          onClick={() => downloadJson(vkeyData, 'vkey.json')}
          className="flex flex-col items-center p-4 border border-gray-200 shadow-sm text-sm font-medium rounded-lg text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500 transition-all duration-200"
        >
          <svg className="h-6 w-6 mb-2 text-purple-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
          </svg>
          <span className="font-semibold">Verify Key</span>
          <span className="text-xs text-gray-500">vkey.json</span>
        </button>

        <button
          onClick={() => downloadJson(signatureData.webauthn_pub, 'webauthn_pub.jwk.json')}
          className="flex flex-col items-center p-4 border border-gray-200 shadow-sm text-sm font-medium rounded-lg text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-orange-500 transition-all duration-200"
        >
          <svg className="h-6 w-6 mb-2 text-orange-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
          </svg>
          <span className="font-semibold">Public Key</span>
          <span className="text-xs text-gray-500">webauthn_pub.jwk.json</span>
        </button>

        <button
          onClick={() => {
            const blob = new Blob([signatureData.jws], { type: 'text/plain' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = 'sig.jws';
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
          }}
          className="flex flex-col items-center p-3 border border-gray-200 shadow-sm text-xs font-medium rounded-lg text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-yellow-500 transition-all duration-200"
        >
          <svg className="h-5 w-5 mb-1 text-yellow-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16l2.879-2.879m0 0a3 3 0 104.243-4.242 3 3 0 00-4.243 4.242zM21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <span className="font-semibold">Signature</span>
          <span className="text-xs text-gray-500">sig.jws</span>
        </button>

        <button
          onClick={() => downloadJson(signatureData.sig_target, 'sig_target.json')}
          className="flex flex-col items-center p-3 border border-gray-200 shadow-sm text-xs font-medium rounded-lg text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition-all duration-200"
        >
          <svg className="h-5 w-5 mb-1 text-indigo-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
          </svg>
          <span className="font-semibold">Sig Target</span>
          <span className="text-xs text-gray-500">sig_target.json</span>
        </button>
      </div>

      <div className="bg-white rounded-lg p-4 border border-gray-200">
        <h4 className="text-sm font-semibold text-gray-800 mb-3 flex items-center">
          <svg className="w-4 h-4 mr-2 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
          </svg>
          Zero-Knowledge Proof Data Preview
        </h4>
        <div className="bg-gray-50 rounded-lg p-4 max-h-64 overflow-y-auto">
          <pre className="text-xs text-gray-700 font-mono leading-relaxed">
            {JSON.stringify(proofData, null, 2)}
          </pre>
        </div>
      </div>
    </div>
  );
}
