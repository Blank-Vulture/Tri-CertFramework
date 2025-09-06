'use client';

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

interface VerificationResultsProps {
  result: VerificationResult;
}

export default function VerificationResults({ result }: VerificationResultsProps) {
  const overallValid = result.zkpValid && result.signatureValid && result.hashValid && result.vkeyHashValid;
  
  const ResultItem = ({ 
    label, 
    isValid, 
    details 
  }: { 
    label: string; 
    isValid: boolean; 
    details?: string; 
  }) => (
    <div className="flex items-center justify-between p-3 border-b border-gray-100 last:border-b-0">
      <div>
        <span className="font-medium text-gray-900">{label}</span>
        {details && (
          <p className="text-sm text-gray-600 mt-1">{details}</p>
        )}
      </div>
      <div className={`flex items-center px-3 py-1 rounded-full text-sm font-medium ${
        isValid 
          ? 'bg-green-100 text-green-800' 
          : 'bg-red-100 text-red-800'
      }`}>
        {isValid ? (
          <>
            <svg className="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
            </svg>
            Valid
          </>
        ) : (
          <>
            <svg className="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
            </svg>
            Invalid
          </>
        )}
      </div>
    </div>
  );

  return (
    <div className="mt-8">
      <div className={`rounded-lg border-2 ${
        overallValid 
          ? 'border-green-200 bg-green-50' 
          : 'border-red-200 bg-red-50'
      }`}>
        <div className="p-6">
          <div className="flex items-center mb-4">
            <div className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${
              overallValid ? 'bg-green-500' : 'bg-red-500'
            }`}>
              {overallValid ? (
                <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                </svg>
              ) : (
                <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                </svg>
              )}
            </div>
            <div className="ml-3">
              <h3 className={`text-lg font-medium ${
                overallValid ? 'text-green-800' : 'text-red-800'
              }`}>
                {overallValid ? 'Verification Successful' : 'Verification Failed'}
              </h3>
              <p className={`text-sm ${
                overallValid ? 'text-green-600' : 'text-red-600'
              }`}>
                {overallValid 
                  ? 'All verification checks passed'
                  : 'One or more verification checks failed'
                }
              </p>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow">
            <ResultItem 
              label="Zero-Knowledge Proof" 
              isValid={result.zkpValid}
              details={result.details.zkp}
            />
            <ResultItem 
              label="Digital Signature" 
              isValid={result.signatureValid}
              details={result.details.signature}
            />
            <ResultItem 
              label="PDF Hash Integrity" 
              isValid={result.hashValid}
              details={result.details.hash}
            />
            <ResultItem 
              label="Verification Key Hash" 
              isValid={result.vkeyHashValid}
              details={result.details.vkeyHash}
            />
          </div>

          {!overallValid && (
            <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-md">
              <div className="flex">
                <div className="flex-shrink-0">
                  <svg className="h-5 w-5 text-yellow-400" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                  </svg>
                </div>
                <div className="ml-3">
                  <h3 className="text-sm font-medium text-yellow-800">
                    Possible Issues
                  </h3>
                  <div className="mt-2 text-sm text-yellow-700">
                    <ul className="list-disc list-inside space-y-1">
                      {!result.zkpValid && <li>The zero-knowledge proof could not be verified</li>}
                      {!result.signatureValid && <li>The digital signature is invalid</li>}
                      {!result.hashValid && <li>The PDF content has been modified</li>}
                      {!result.vkeyHashValid && <li>The verification key does not match</li>}
                    </ul>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
