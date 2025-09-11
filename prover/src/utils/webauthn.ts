import { decode as cborDecode } from 'cbor-x';
import type { WebAuthnSignatureData, CBORData } from '../types/webauthn';

/**
 * Base64URL encoding/decoding utilities
 */
export function arrayBufferToBase64url(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  const binaryString = Array.from(bytes, byte => String.fromCharCode(byte)).join('');
  return btoa(binaryString)
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=/g, '');
}

export function base64urlToArrayBuffer(base64url: string): ArrayBuffer {
  const base64 = base64url.replace(/-/g, '+').replace(/_/g, '/');
  const paddedBase64 = base64.padEnd(base64.length + (4 - base64.length % 4) % 4, '=');
  const binaryString = atob(paddedBase64);
  return new Uint8Array([...binaryString].map(char => char.charCodeAt(0))).buffer;
}

/**
 * Generate a random challenge for WebAuthn operations
 */
export function generateChallenge(): ArrayBuffer {
  return crypto.getRandomValues(new Uint8Array(32)).buffer;
}

/**
 * Register a new WebAuthn credential
 */
export async function registerWebAuthnCredential(): Promise<PublicKeyCredential> {
  if (!navigator.credentials || !window.PublicKeyCredential) {
    throw new Error('WebAuthn is not supported in this browser');
  }

  const challenge = generateChallenge();
  const userId = crypto.getRandomValues(new Uint8Array(16));

  const createOptions: PublicKeyCredentialCreationOptions = {
    challenge,
    rp: {
      name: 'Tri-CertFramework Scholar Prover',
      id: window.location.hostname === 'localhost' ? 'localhost' : window.location.hostname,
    },
    user: {
      id: userId,
      name: 'scholar@tri-cert.example',
      displayName: 'Scholar User',
    },
    pubKeyCredParams: [
      { type: 'public-key', alg: -7 }, // ES256 (ECDSA with P-256)
      { type: 'public-key', alg: -257 }, // RS256 as fallback
    ],
    authenticatorSelection: {
      authenticatorAttachment: 'platform', // Prefer built-in authenticators
      userVerification: 'preferred',
      requireResidentKey: false,
      residentKey: 'discouraged', // Explicit resident key setting
    },
    attestation: 'none', // Changed from 'direct' to 'none' for better compatibility
    timeout: 60000,
  };

  console.log('Creating WebAuthn credential with options:', createOptions);

  try {
    const credential = await navigator.credentials.create({
      publicKey: createOptions,
    }) as PublicKeyCredential;

    if (!credential) {
      throw new Error('Failed to create credential');
    }

    return credential as PublicKeyCredential;
  } catch (error) {
    console.error('WebAuthn registration failed:', error);
    if (error instanceof Error) {
      throw new Error(`WebAuthn registration failed: ${error.message}`);
    }
    throw new Error('WebAuthn registration failed with unknown error');
  }
}

/**
 * Create a WebAuthn assertion (signature) for the given data
 */
interface SignatureTarget {
  schema: string;
  circuit_id: string;
  vkey_hash: string;
  pdf_sha3_512: string;
  graduation_year: string;
  commit: string;
  issued_at: string;
}

export async function createWebAuthnAssertion(
  credentialId: string,
  dataToSign: SignatureTarget
): Promise<WebAuthnSignatureData> {
  if (!navigator.credentials || !window.PublicKeyCredential) {
    throw new Error('WebAuthn is not supported in this browser');
  }

  const challenge = new TextEncoder().encode(JSON.stringify(dataToSign));
  const credentialIdBuffer = base64urlToArrayBuffer(credentialId);

  const requestOptions: PublicKeyCredentialRequestOptions = {
    challenge,
    allowCredentials: [
      {
        type: 'public-key',
        id: credentialIdBuffer,
        transports: ['internal', 'hybrid'],
      },
    ],
    userVerification: 'preferred',
    timeout: 60000,
  };

  console.log('Creating WebAuthn assertion with options:', requestOptions);

  try {
    const assertion = await navigator.credentials.get({
      publicKey: requestOptions,
    }) as PublicKeyCredential;

    if (!assertion || !assertion.response) {
      throw new Error('Failed to create assertion');
    }

    const response = assertion.response as AuthenticatorAssertionResponse;

    return {
      credentialId: arrayBufferToBase64url(assertion.rawId),
      authenticatorData: arrayBufferToBase64url(response.authenticatorData),
      clientDataJSON: arrayBufferToBase64url(response.clientDataJSON),
      signature: arrayBufferToBase64url(response.signature),
      publicKey: {
        kty: 'EC',
        alg: 'ES256',
        crv: 'P-256',
        x: '', // Will be filled by caller with actual public key
        y: '', // Will be filled by caller with actual public key
        kid: arrayBufferToBase64url(assertion.rawId),
      },
      sig_target: dataToSign,
    };
  } catch (error) {
    console.error('WebAuthn assertion failed:', error);
    if (error instanceof Error) {
      throw new Error(`WebAuthn assertion failed: ${error.message}`);
    }
    throw new Error('WebAuthn assertion failed with unknown error');
  }
}

/**
 * Extract public key from WebAuthn attestation response
 */
export async function extractPublicKeyFromAttestation(
  attestationResponse: AuthenticatorAttestationResponse
): Promise<{ x: string; y: string }> {
  try {
    console.log('Starting public key extraction from attestation');
    
    // Decode CBOR attestation object
    const attestationObjectBytes = new Uint8Array(attestationResponse.attestationObject);
    console.log('Attestation object size:', attestationObjectBytes.length);
    
    const attestationObject = cborDecode(attestationObjectBytes);
    console.log('Decoded attestation object:', Object.keys(attestationObject));
    
    if (!attestationObject.authData) {
      throw new Error('No authData found in attestation object');
    }

    // Convert authData to Uint8Array if needed
    let authData: Uint8Array;
    if (attestationObject.authData instanceof Uint8Array) {
      authData = attestationObject.authData;
    } else if (attestationObject.authData instanceof ArrayBuffer) {
      authData = new Uint8Array(attestationObject.authData);
    } else {
      throw new Error('Invalid authData format');
    }
    
    console.log('AuthData length:', authData.length);
    
    if (authData.length < 37) {
      throw new Error(`Invalid authenticator data length: ${authData.length}, minimum 37 required`);
    }

    // Parse authenticator data structure
    const rpIdHash = authData.slice(0, 32);
    const flags = authData[32];
    const signCount = new DataView(authData.buffer.slice(authData.byteOffset + 33, authData.byteOffset + 37)).getUint32(0, false);
    
    console.log('AuthData parsed:', {
      rpIdHashLength: rpIdHash.length,
      flags: `0x${flags.toString(16)}`,
      signCount,
      hasAttestedCredData: !!(flags & 0x40),
      hasExtensions: !!(flags & 0x80)
    });
    
    // Check if attested credential data is present (AT flag)
    if (!(flags & 0x40)) {
      throw new Error('No attested credential data present (AT flag not set)');
    }

    // Skip to credential data (after fixed-length fields)
    let offset = 37;
    
    // Verify we have enough data for AAGUID
    if (authData.length < offset + 16) {
      throw new Error(`Insufficient data for AAGUID at offset ${offset}`);
    }
    
    // Skip AAGUID (16 bytes)
    const aaguid = authData.slice(offset, offset + 16);
    offset += 16;
    console.log('AAGUID:', Array.from(aaguid).map(b => b.toString(16).padStart(2, '0')).join(''));
    
    // Verify we have enough data for credential ID length
    if (authData.length < offset + 2) {
      throw new Error(`Insufficient data for credential ID length at offset ${offset}`);
    }
    
    // Get credential ID length (2 bytes, big-endian)
    const credIdLength = new DataView(authData.buffer.slice(authData.byteOffset + offset, authData.byteOffset + offset + 2)).getUint16(0, false);
    offset += 2;
    console.log('Credential ID length:', credIdLength);
    
    // Verify we have enough data for credential ID
    if (authData.length < offset + credIdLength) {
      throw new Error(`Insufficient data for credential ID at offset ${offset}, length ${credIdLength}`);
    }
    
    // Skip credential ID
    const credentialId = authData.slice(offset, offset + credIdLength);
    offset += credIdLength;
    console.log('Credential ID:', arrayBufferToBase64url(credentialId.buffer));
    
    // Verify we have data for public key
    if (authData.length <= offset) {
      throw new Error(`No public key data at offset ${offset}, authData length ${authData.length}`);
    }
    
    // Parse CBOR-encoded public key
    const publicKeyBytes = authData.slice(offset);
    console.log('Public key CBOR data size:', publicKeyBytes.length);
    console.log('Public key CBOR data (first 32 bytes):', Array.from(publicKeyBytes.slice(0, 32)).map(b => b.toString(16).padStart(2, '0')).join(' '));
    
    const publicKeyData = cborDecode(publicKeyBytes) as CBORData;
    console.log('Decoded public key data:', publicKeyData);
    
    // Extract coordinates for P-256 curve
    // COSE key parameters: kty=1(EC), alg=3(-7 for ES256), crv=-1(1 for P-256), x=-2, y=-3
    if (publicKeyData[1] !== 2) {
      throw new Error(`Unsupported key type: ${publicKeyData[1]}, expected 2 (EC)`);
    }
    if (publicKeyData[3] !== -7) {
      throw new Error(`Unsupported algorithm: ${publicKeyData[3]}, expected -7 (ES256)`);
    }
    if (publicKeyData[-1] !== 1) {
      throw new Error(`Unsupported curve: ${publicKeyData[-1]}, expected 1 (P-256)`);
    }
    
    if (!publicKeyData[-2] || !publicKeyData[-3]) {
      throw new Error('Missing x or y coordinates in public key');
    }
    
    const x = arrayBufferToBase64url(publicKeyData[-2]);
    const y = arrayBufferToBase64url(publicKeyData[-3]);
    
    console.log('Extracted public key coordinates:', { x: x.substring(0, 16) + '...', y: y.substring(0, 16) + '...' });
    
    return { x, y };
  } catch (error) {
    console.error('Failed to extract public key from attestation:', error);
    console.error('Error details:', {
      message: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined
    });
    throw new Error(`Failed to extract public key from attestation: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Verify WebAuthn is supported
 */
export function isWebAuthnSupported(): boolean {
  return !!(
    navigator.credentials &&
    window.PublicKeyCredential &&
    typeof window.PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable === 'function'
  );
}

/**
 * Check if platform authenticator is available
 */
export async function isPlatformAuthenticatorAvailable(): Promise<boolean> {
  if (!isWebAuthnSupported()) {
    return false;
  }
  
  try {
    return await window.PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable();
  } catch {
    return false;
  }
}
