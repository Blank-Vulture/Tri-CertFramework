'use client';

import { useState, useEffect } from 'react';
import {
  isWebAuthnSupported,
  isPlatformAuthenticatorAvailable,
  registerWebAuthnCredential,
  extractPublicKeyFromAttestation,
  arrayBufferToBase64url,
} from '../../utils/webauthn';
import type { WebAuthnCredential } from '../../types/webauthn';

interface WebAuthnCredentialInfo {
  credentialId: string;
  publicKey: {
    x: string;
    y: string;
  };
  createdAt: string;
}

interface WebAuthnSetupProps {
  onCredentialRegistered: (credential: WebAuthnCredentialInfo) => void;
  registeredCredential: WebAuthnCredentialInfo | null;
  isDisabled?: boolean;
}

export default function WebAuthnSetup({
  onCredentialRegistered,
  registeredCredential,
  isDisabled = false,
}: WebAuthnSetupProps) {
  const [isSupported, setIsSupported] = useState(false);
  const [isPlatformAvailable, setIsPlatformAvailable] = useState(false);
  const [isRegistering, setIsRegistering] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const checkSupport = async () => {
      setIsSupported(isWebAuthnSupported());
      setIsPlatformAvailable(await isPlatformAuthenticatorAvailable());
    };
    checkSupport();
  }, []);

  const handleRegister = async () => {
    setError(null);
    setIsRegistering(true);

    try {
      console.log('Starting WebAuthn credential registration...');
      
      // Verify WebAuthn support before proceeding
      if (!isWebAuthnSupported()) {
        throw new Error('WebAuthn is not supported in this browser');
      }

      const credential: WebAuthnCredential = await registerWebAuthnCredential();
      
      console.log('WebAuthn credential created successfully');
      console.log('Credential ID:', arrayBufferToBase64url(credential.rawId));
      console.log('Response type:', credential.response.constructor.name);
      
      // Verify response type
      if (!(credential.response instanceof AuthenticatorAttestationResponse)) {
        throw new Error('Invalid credential response type');
      }

      console.log('Attestation object size:', credential.response.attestationObject.byteLength);
      
      try {
        // Extract public key from attestation
        const { x, y } = await extractPublicKeyFromAttestation(credential.response);

        const credentialInfo: WebAuthnCredentialInfo = {
          credentialId: arrayBufferToBase64url(credential.rawId),
          publicKey: { x, y },
          createdAt: new Date().toISOString(),
        };

        console.log('Credential registration completed successfully');
        console.log('Public key extracted:', {
          x: x.substring(0, 16) + '...',
          y: y.substring(0, 16) + '...'
        });
        
        onCredentialRegistered(credentialInfo);
      } catch (keyExtractionError) {
        console.error('Public key extraction failed:', keyExtractionError);
        throw new Error(`Public key extraction failed: ${keyExtractionError instanceof Error ? keyExtractionError.message : 'Unknown error'}`);
      }
    } catch (err) {
      console.error('WebAuthn registration error:', err);
      console.error('Error details:', {
        name: err instanceof Error ? err.name : 'UnknownError',
        message: err instanceof Error ? err.message : 'Unknown error occurred',
        stack: err instanceof Error ? err.stack : undefined
      });
      
      // Provide user-friendly error messages
      let userMessage = 'Authentication setup failed';
      if (err instanceof Error) {
        if (err.name === 'NotSupportedError') {
          userMessage = 'Your device does not support biometric authentication';
        } else if (err.name === 'SecurityError') {
          userMessage = 'Security error: Please ensure you are using HTTPS';
        } else if (err.name === 'NotAllowedError') {
          userMessage = 'Authentication was cancelled or not permitted';
        } else if (err.name === 'InvalidStateError') {
          userMessage = 'An authenticator is already registered for this account';
        } else if (err.message.includes('CBOR')) {
          userMessage = 'Device compatibility issue: Try using a different authenticator';
        } else {
          userMessage = err.message;
        }
      }
      
      setError(userMessage);
    } finally {
      setIsRegistering(false);
    }
  };

  if (!isSupported) {
    return (
      <div className="rounded-2xl bg-red-50 border border-red-200 p-6">
        <div className="flex items-start space-x-4">
          <div className="flex-shrink-0">
            <svg className="h-6 w-6 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
          </div>
          <div>
            <h3 className="text-sm font-semibold text-red-800">WebAuthn Not Supported</h3>
            <p className="text-sm text-red-700 mt-1">
              Your browser doesn't support WebAuthn. Please use a modern browser like Chrome, Firefox, or Safari.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold text-gray-900 mb-4">
          <div className="flex items-center space-x-2">
            <div className="h-5 w-5 rounded bg-gradient-to-br from-green-500 to-emerald-600 p-1">
              <svg className="h-full w-full text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
              </svg>
            </div>
            <span>WebAuthn Digital Signature</span>
          </div>
        </h3>

        {/* Support Status */}
        <div className="mb-6 space-y-3">
          <div className="flex items-center space-x-3">
            <div className={`h-2 w-2 rounded-full ${isSupported ? 'bg-green-500' : 'bg-red-500'}`} />
            <span className="text-sm text-gray-600">
              WebAuthn API: {isSupported ? 'Supported' : 'Not Supported'}
            </span>
          </div>
          <div className="flex items-center space-x-3">
            <div className={`h-2 w-2 rounded-full ${isPlatformAvailable ? 'bg-green-500' : 'bg-orange-500'}`} />
            <span className="text-sm text-gray-600">
              Platform Authenticator: {isPlatformAvailable ? 'Available' : 'Not Available'}
            </span>
          </div>
        </div>

        {/* Registration Status */}
        {registeredCredential ? (
          <div className="rounded-2xl bg-green-50 border border-green-200 p-6">
            <div className="flex items-start space-x-4">
              <div className="flex-shrink-0">
                <svg className="h-6 w-6 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div className="min-w-0 flex-1">
                <h4 className="text-sm font-semibold text-green-800">Authenticator Registered</h4>
                <p className="text-sm text-green-700 mt-1">
                  Your biometric authenticator is ready for digital signatures.
                </p>
                <div className="mt-3 text-xs text-green-600 font-mono">
                  <div>Credential ID: {registeredCredential.credentialId.substring(0, 16)}...</div>
                  <div>Registered: {new Date(registeredCredential.createdAt).toLocaleString()}</div>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="rounded-2xl bg-blue-50 border border-blue-200 p-6">
              <div className="flex items-start space-x-4">
                <div className="flex-shrink-0">
                  <svg className="h-6 w-6 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <div>
                  <h4 className="text-sm font-semibold text-blue-800">Authenticator Setup Required</h4>
                  <p className="text-sm text-blue-700 mt-1">
                    Register your biometric authenticator (fingerprint, face, PIN) to create digital signatures.
                  </p>
                  <ul className="text-xs text-blue-600 mt-2 space-y-1">
                    <li>• Your biometric data never leaves your device</li>
                    <li>• Each signature is cryptographically unique</li>
                    <li>• No passwords or secrets to remember</li>
                    <li>• {isPlatformAvailable ? 'Touch ID/Face ID/Windows Hello ready' : 'External authenticator required'}</li>
                  </ul>
                  
                  {/* Browser Guide */}
                  <div className="mt-3 p-2 bg-blue-100 rounded-lg">
                    <p className="text-xs text-blue-800 font-medium">💡 Setup Guide:</p>
                    <p className="text-xs text-blue-700 mt-1">
                      Click "Setup Authenticator" → Follow browser prompts → Use {isPlatformAvailable ? 'biometric' : 'PIN/security key'}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <button
              onClick={handleRegister}
              disabled={isRegistering || isDisabled || !isSupported}
              className="group relative w-full flex items-center justify-center px-6 py-4 border border-transparent rounded-2xl text-base font-semibold text-white bg-gradient-to-r from-green-600 via-emerald-600 to-teal-600 hover:from-green-700 hover:via-emerald-700 hover:to-teal-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 disabled:from-gray-400 disabled:to-gray-500 disabled:cursor-not-allowed transition-all duration-300 shadow-lg hover:shadow-xl disabled:shadow-none"
            >
              <div className="relative flex items-center">
                {isRegistering ? (
                  <>
                    <div className="mr-3">
                      <div className="animate-spin h-5 w-5 border-2 border-white border-t-transparent rounded-full"></div>
                    </div>
                    <span>Setting up Authenticator...</span>
                  </>
                ) : (
                  <>
                    <svg className="w-5 h-5 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                    </svg>
                    <span>Setup Authenticator</span>
                  </>
                )}
              </div>
            </button>
          </div>
        )}

        {/* Error Display */}
        {error && (
          <div className="mt-4 rounded-2xl bg-red-50 border border-red-200 p-4">
            <div className="flex items-start space-x-3">
              <svg className="h-5 w-5 text-red-500 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
              </svg>
              <div>
                <h4 className="text-sm font-semibold text-red-800">Registration Failed</h4>
                <p className="text-sm text-red-700 mt-1">{error}</p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
