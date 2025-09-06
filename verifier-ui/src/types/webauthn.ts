// WebAuthn verification types for Verifier UI

export interface WebAuthnSignatureData {
  credentialId: string;
  authenticatorData: string; // base64url
  clientDataJSON: string; // base64url 
  signature: string; // base64url
}

export interface WebAuthnPublicKey {
  kty: string;
  crv: string;
  x: string;
  y: string;
  alg: string;
  kid: string;
}

export interface SignatureVerificationContext {
  sig_target: {
    schema: string;
    circuit_id: string;
    vkey_hash: string;
    pdf_sha3_512: string;
    commit: string;
    issued_at: string;
  };
  webauthn_pub: WebAuthnPublicKey;
  webauthn: WebAuthnSignatureData;
}

export interface ClientDataJSON {
  type: string;
  challenge: string;
  origin: string;
  crossOrigin?: boolean;
  tokenBinding?: {
    status: string;
    id?: string;
  };
}

export interface AuthenticatorData {
  rpIdHash: ArrayBuffer;
  flags: number;
  signCount: number;
  attestedCredentialData?: ArrayBuffer;
  extensions?: ArrayBuffer;
}
