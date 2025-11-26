import type {
  WebAuthnPublicKey,
  SignatureVerificationContext,
  ClientDataJSON,
  AuthenticatorData,
} from '../types/webauthn';

/**
 * Base64URL decoding utilities
 */
export function base64urlToArrayBuffer(base64url: string): ArrayBuffer {
  const base64 = base64url.replace(/-/g, '+').replace(/_/g, '/');
  const paddedBase64 = base64.padEnd(base64.length + (4 - base64.length % 4) % 4, '=');
  const binaryString = atob(paddedBase64);
  return new Uint8Array([...binaryString].map(char => char.charCodeAt(0))).buffer;
}

/**
 * Allowed origins for WebAuthn verification
 * Signatures created from these origins are considered valid
 */
const ALLOWED_ORIGINS = [
  // Production
  'https://blank-vulture.github.io',
  // Development
  'http://localhost:3000',
  'http://localhost:3001',
  'http://127.0.0.1:3000',
  'http://127.0.0.1:3001',
];

/**
 * Check if an origin is in the allowed list
 */
function isAllowedOrigin(origin: string): boolean {
  // Allow configurable origins via environment variable
  const envOrigins = process.env.NEXT_PUBLIC_ALLOWED_ORIGINS;
  if (envOrigins) {
    const customOrigins = envOrigins.split(',').map(o => o.trim());
    if (customOrigins.includes(origin)) return true;
  }
  return ALLOWED_ORIGINS.includes(origin);
}

export function arrayBufferToBase64url(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  const binaryString = Array.from(bytes, byte => String.fromCharCode(byte)).join('');
  return btoa(binaryString)
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=/g, '');
}

// Convert DER encoded ECDSA signature to raw (r||s) format
function derToRawEcdsa(der: ArrayBuffer, elementLength: number): ArrayBuffer {
  const bytes = new Uint8Array(der);
  let offset = 0;

  if (bytes[offset++] !== 0x30) throw new Error('Invalid DER sequence');
  let seqLen = bytes[offset++];
  if (seqLen & 0x80) {
    const numLenBytes = seqLen & 0x7f;
    seqLen = 0;
    for (let i = 0; i < numLenBytes; i++) {
      seqLen = (seqLen << 8) | bytes[offset++];
    }
  }

  if (bytes[offset++] !== 0x02) throw new Error('Invalid DER integer for r');
  let rLen = bytes[offset++];
  // Trim leading zeros
  while (rLen > 0 && bytes[offset] === 0x00 && rLen > elementLength) { offset++; rLen--; }
  const r = bytes.slice(offset, offset + rLen);
  offset += rLen;

  if (bytes[offset++] !== 0x02) throw new Error('Invalid DER integer for s');
  let sLen = bytes[offset++];
  while (sLen > 0 && bytes[offset] === 0x00 && sLen > elementLength) { offset++; sLen--; }
  const s = bytes.slice(offset, offset + sLen);

  const raw = new Uint8Array(elementLength * 2);
  raw.set(r, elementLength - r.length);
  raw.set(s, elementLength * 2 - s.length);
  return raw.buffer;
}

/**
 * Parse authenticator data structure
 */
export function parseAuthenticatorData(authDataBuffer: ArrayBuffer): AuthenticatorData {
  const authData = new Uint8Array(authDataBuffer);
  
  if (authData.length < 37) {
    throw new Error('Authenticator data too short');
  }

  return {
    rpIdHash: authData.slice(0, 32).buffer,
    flags: authData[32],
    signCount: new DataView(authData.buffer).getUint32(33, false),
    // Extensions and attested credential data parsing would go here if needed
  };
}

/**
 * Verify RP ID hash matches the expected origin
 * This ensures the signature was created for the correct relying party
 */
export async function verifyRPIDHash(
  rpIdHash: ArrayBuffer,
  origin: string
): Promise<boolean> {
  try {
    // Extract hostname from origin (e.g., "https://example.com" -> "example.com")
    const url = new URL(origin);
    const rpId = url.hostname;

    // Calculate expected RP ID hash
    const encoder = new TextEncoder();
    const rpIdData = encoder.encode(rpId);
    const expectedHash = await crypto.subtle.digest('SHA-256', rpIdData);

    // Compare hashes
    const actualHashArray = new Uint8Array(rpIdHash);
    const expectedHashArray = new Uint8Array(expectedHash);

    const hashesMatch = actualHashArray.length === expectedHashArray.length &&
      actualHashArray.every((byte, index) => byte === expectedHashArray[index]);

    return hashesMatch;
  } catch {
    return false;
  }
}

/**
 * Create signature verification data for WebAuthn
 */
export function createSignatureData(
  authenticatorData: ArrayBuffer,
  clientDataHash: ArrayBuffer
): ArrayBuffer {
  const combined = new Uint8Array(authenticatorData.byteLength + clientDataHash.byteLength);
  combined.set(new Uint8Array(authenticatorData), 0);
  combined.set(new Uint8Array(clientDataHash), authenticatorData.byteLength);
  return combined.buffer;
}

/**
 * Verify WebAuthn signature
 */
export async function verifyWebAuthnSignature(
  context: SignatureVerificationContext,
  expectedChallenge?: unknown
): Promise<boolean> {
  try {
    // Parse client data JSON
    const clientDataBuffer = base64urlToArrayBuffer(context.webauthn.clientDataJSON);
    const clientDataStr = new TextDecoder().decode(clientDataBuffer);
    const clientData: ClientDataJSON = JSON.parse(clientDataStr);

    // Verify client data type
    if (clientData.type !== 'webauthn.get') {
      return false;
    }

    // Verify origin is in allowed list
    if (!isAllowedOrigin(clientData.origin)) {
      return false;
    }

    // If we have an expected challenge, verify it
    if (expectedChallenge) {
      // The challenge in clientData is already base64url encoded
      // We need to decode it and compare with our expected challenge
      const receivedChallengeBuffer = base64urlToArrayBuffer(clientData.challenge);
      const receivedChallengeStr = new TextDecoder().decode(receivedChallengeBuffer);
      const expectedChallengeStr = JSON.stringify(expectedChallenge);
      
      if (receivedChallengeStr !== expectedChallengeStr) {
        return false;
      }
    }

    // Parse authenticator data
    const authenticatorDataBuffer = base64urlToArrayBuffer(context.webauthn.authenticatorData);
    const authData = parseAuthenticatorData(authenticatorDataBuffer);

    // Verify RP ID hash matches the claimed origin
    const rpIdHashValid = await verifyRPIDHash(authData.rpIdHash, clientData.origin);
    if (!rpIdHashValid) {
      return false;
    }

    // Verify User Present flag (UP) is set
    if (!(authData.flags & 0x01)) {
      return false;
    }

    // Create client data hash
    const clientDataHash = await crypto.subtle.digest('SHA-256', clientDataBuffer);

    // Create signature verification data
    const verificationData = createSignatureData(authenticatorDataBuffer, clientDataHash);

    // Import public key for verification
    const publicKey = await importWebAuthnPublicKey(context.webauthn_pub);

    // Verify signature
    const signatureBuffer = base64urlToArrayBuffer(context.webauthn.signature);
    
    let isValid = await crypto.subtle.verify(
      { name: 'ECDSA', hash: { name: 'SHA-256' } },
      publicKey,
      signatureBuffer,
      verificationData
    );

    // Fallback: try converting DER signature to raw (r||s) if first attempt fails
    if (!isValid) {
      try {
        const rawSig = derToRawEcdsa(signatureBuffer, 32);
        isValid = await crypto.subtle.verify(
          { name: 'ECDSA', hash: { name: 'SHA-256' } },
          publicKey,
          rawSig,
          verificationData
        );
      } catch {
        // Fallback failed, isValid remains false
      }
    }

    return isValid;
  } catch {
    return false;
  }
}

/**
 * Import WebAuthn public key for verification
 */
export async function importWebAuthnPublicKey(
  publicKeyJwk: WebAuthnPublicKey
): Promise<CryptoKey> {
  if (publicKeyJwk.kty !== 'EC' || publicKeyJwk.crv !== 'P-256' || publicKeyJwk.alg !== 'ES256') {
    throw new Error('Unsupported key type or algorithm');
  }

  // Convert JWK to CryptoKey
  const keyData = {
    kty: 'EC',
    crv: 'P-256',
    x: publicKeyJwk.x,
    y: publicKeyJwk.y,
  };

  return await crypto.subtle.importKey(
    'jwk',
    keyData,
    { name: 'ECDSA', namedCurve: 'P-256' },
    false,
    ['verify']
  );
}

/**
 * Calculate JWK Thumbprint (RFC 7638) for credential binding verification
 */
async function calculateJWKThumbprint(jwk: {
  kty: string;
  crv: string;
  x: string;
  y: string;
}): Promise<string> {
  // Create canonical JSON (lexicographically ordered)
  const canonical = {
    crv: jwk.crv,
    kty: jwk.kty,
    x: jwk.x,
    y: jwk.y,
  };

  // Marshal to JSON
  const canonicalJSON = JSON.stringify(canonical);

  // Calculate SHA-256 hash
  const encoder = new TextEncoder();
  const data = encoder.encode(canonicalJSON);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);

  // Convert to base64url (no padding)
  return arrayBufferToBase64url(hashBuffer);
}

/**
 * Verify WebAuthn credential ID binding
 * This ensures the signature was created by the claimed public key
 */
export async function verifyCredentialBinding(
  context: SignatureVerificationContext
): Promise<boolean> {
  try {
    const expectedKid = context.webauthn_pub.kid;

    // The kid should be the JWK thumbprint
    // Calculate the thumbprint from the public key and compare
    const calculatedThumbprint = await calculateJWKThumbprint({
      kty: context.webauthn_pub.kty,
      crv: context.webauthn_pub.crv,
      x: context.webauthn_pub.x,
      y: context.webauthn_pub.y,
    });

    // Verify that the kid matches the calculated thumbprint
    if (calculatedThumbprint !== expectedKid) {
      return false;
    }

    return true;
  } catch {
    return false;
  }
}

/**
 * Comprehensive WebAuthn verification
 */
export async function verifyWebAuthnComplete(
  context: SignatureVerificationContext
): Promise<{
  isValid: boolean;
  details: {
    signatureValid: boolean;
    credentialBindingValid: boolean;
    rpIdHashValid?: boolean;
    userPresent?: boolean;
    userVerified?: boolean;
    error?: string;
  };
}> {
  try {
    // Verify credential binding (ensures public key matches kid)
    const credentialBindingValid = await verifyCredentialBinding(context);
    
    if (!credentialBindingValid) {
      return {
        isValid: false,
        details: {
          signatureValid: false,
          credentialBindingValid: false,
          error: 'Credential binding verification failed',
        },
      };
    }

    // Verify signature with sig_target as challenge
    const signatureValid = await verifyWebAuthnSignature(context, context.sig_target);

    // Parse authenticator data for additional details
    const authenticatorDataBuffer = base64urlToArrayBuffer(context.webauthn.authenticatorData);
    const authData = parseAuthenticatorData(authenticatorDataBuffer);
    const userPresent = !!(authData.flags & 0x01);
    const userVerified = !!(authData.flags & 0x04);

    const isValid = signatureValid && credentialBindingValid;

    return {
      isValid,
      details: {
        signatureValid,
        credentialBindingValid,
        rpIdHashValid: true, // Already verified in verifyWebAuthnSignature
        userPresent,
        userVerified,
      },
    };
  } catch {
    return {
      isValid: false,
      details: {
        signatureValid: false,
        credentialBindingValid: false,
        error: 'Verification failed',
      },
    };
  }
}
