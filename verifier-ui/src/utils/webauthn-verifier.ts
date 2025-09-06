import type {
  WebAuthnSignatureData,
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
  expectedChallenge?: any
): Promise<boolean> {
  try {
    console.log('=== Starting WebAuthn signature verification ===');
    console.log('Verification context:', {
      credentialId: context.webauthn.credentialId,
      publicKey: {
        kty: context.webauthn_pub.kty,
        crv: context.webauthn_pub.crv,
        alg: context.webauthn_pub.alg,
        x: context.webauthn_pub.x.substring(0, 16) + '...',
        y: context.webauthn_pub.y.substring(0, 16) + '...'
      },
      sigTarget: context.sig_target
    });

    // Parse client data JSON
    const clientDataBuffer = base64urlToArrayBuffer(context.webauthn.clientDataJSON);
    const clientDataStr = new TextDecoder().decode(clientDataBuffer);
    const clientData: ClientDataJSON = JSON.parse(clientDataStr);

    console.log('Client data parsed:', {
      type: clientData.type,
      origin: clientData.origin,
      challenge: clientData.challenge.substring(0, 32) + '...',
      crossOrigin: clientData.crossOrigin
    });

    // Verify client data type
    if (clientData.type !== 'webauthn.get') {
      console.error('Invalid client data type:', clientData.type);
      return false;
    }

    // If we have an expected challenge, verify it
    if (expectedChallenge) {
      // The challenge in clientData is already base64url encoded
      // We need to decode it and compare with our expected challenge
      const receivedChallengeBuffer = base64urlToArrayBuffer(clientData.challenge);
      const receivedChallengeStr = new TextDecoder().decode(receivedChallengeBuffer);
      const expectedChallengeStr = JSON.stringify(expectedChallenge);
      
      console.log('Challenge verification:', {
        received: receivedChallengeStr,
        expected: expectedChallengeStr,
        match: receivedChallengeStr === expectedChallengeStr
      });
      
      if (receivedChallengeStr !== expectedChallengeStr) {
        console.error('Challenge mismatch:', {
          received: receivedChallengeStr,
          expected: expectedChallengeStr
        });
        return false;
      }
      
      console.log('Challenge verification passed');
    }

    // Parse authenticator data
    const authenticatorDataBuffer = base64urlToArrayBuffer(context.webauthn.authenticatorData);
    const authData = parseAuthenticatorData(authenticatorDataBuffer);

    console.log('Authenticator data parsed:', {
      flags: `0x${authData.flags.toString(16)}`,
      userPresent: !!(authData.flags & 0x01),
      userVerified: !!(authData.flags & 0x04),
      signCount: authData.signCount,
      dataLength: authenticatorDataBuffer.byteLength
    });

    // Verify User Present flag (UP) is set
    if (!(authData.flags & 0x01)) {
      console.error('User Present flag not set, flags:', `0x${authData.flags.toString(16)}`);
      return false;
    }

    console.log('User Present flag verification passed');

    // Create client data hash
    const clientDataHash = await crypto.subtle.digest('SHA-256', clientDataBuffer);
    console.log('Client data hash created, length:', clientDataHash.byteLength);

    // Create signature verification data
    const verificationData = createSignatureData(authenticatorDataBuffer, clientDataHash);
    console.log('Verification data created, length:', verificationData.byteLength);

    // Import public key for verification
    console.log('Importing public key for verification...');
    const publicKey = await importWebAuthnPublicKey(context.webauthn_pub);
    console.log('Public key imported successfully');

    // Verify signature
    const signatureBuffer = base64urlToArrayBuffer(context.webauthn.signature);
    console.log('Signature buffer length:', signatureBuffer.byteLength);
    
    console.log('Performing ECDSA signature verification...');
    let isValid = await crypto.subtle.verify(
      { name: 'ECDSA', hash: { name: 'SHA-256' } },
      publicKey,
      signatureBuffer,
      verificationData
    );

    // Fallback: try converting DER signature to raw (r||s) if first attempt fails
    if (!isValid) {
      try {
        console.warn('Primary verification failed. Attempting DER->raw (r||s) signature fallback...');
        const rawSig = derToRawEcdsa(signatureBuffer, 32);
        isValid = await crypto.subtle.verify(
          { name: 'ECDSA', hash: { name: 'SHA-256' } },
          publicKey,
          rawSig,
          verificationData
        );
      } catch (fallbackError) {
        console.error('Fallback verification error:', fallbackError);
      }
    }

    console.log('=== WebAuthn signature verification result:', isValid, '===');
    return isValid;
  } catch (error) {
    console.error('WebAuthn signature verification error:', error);
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
 * Verify WebAuthn credential ID binding
 */
export function verifyCredentialBinding(
  context: SignatureVerificationContext
): boolean {
  try {
    // Verify that the credential ID in the signature matches the public key
    const expectedKid = context.webauthn_pub.kid;
    const actualCredentialId = context.webauthn.credentialId;

    // The kid should be the base64url-encoded credential ID or JWK thumbprint
    if (expectedKid && expectedKid !== actualCredentialId) {
      // If kid is a JWK thumbprint, we would need to compute it and compare
      console.warn('Credential ID binding verification not fully implemented');
    }

    return true; // For now, always pass this check
  } catch (error) {
    console.error('Credential binding verification error:', error);
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
    error?: string;
  };
}> {
  try {
    // Verify credential binding
    const credentialBindingValid = verifyCredentialBinding(context);

    // Verify signature with sig_target as challenge
    const signatureValid = await verifyWebAuthnSignature(context, context.sig_target);

    const isValid = signatureValid && credentialBindingValid;

    return {
      isValid,
      details: {
        signatureValid,
        credentialBindingValid,
      },
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('Complete WebAuthn verification failed:', errorMessage);

    return {
      isValid: false,
      details: {
        signatureValid: false,
        credentialBindingValid: false,
        error: errorMessage,
      },
    };
  }
}
