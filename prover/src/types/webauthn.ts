// WebAuthn API Types for TypeScript

export interface WebAuthnCredential {
  id: string;
  rawId: ArrayBuffer;
  response: AuthenticatorAttestationResponse | AuthenticatorAssertionResponse;
  type: 'public-key';
  clientExtensionResults: AuthenticationExtensionsClientOutputs;
}

export interface AuthenticatorAttestationResponse {
  clientDataJSON: ArrayBuffer;
  attestationObject: ArrayBuffer;
  getTransports?: () => AuthenticatorTransport[];
  getAuthenticatorData?: () => ArrayBuffer;
  getPublicKey?: () => ArrayBuffer;
  getPublicKeyAlgorithm?: () => COSEAlgorithmIdentifier;
}

export interface AuthenticatorAssertionResponse {
  clientDataJSON: ArrayBuffer;
  authenticatorData: ArrayBuffer;
  signature: ArrayBuffer;
  userHandle: ArrayBuffer | null;
}

export interface PublicKeyCredentialCreationOptions {
  rp: PublicKeyCredentialRpEntity;
  user: PublicKeyCredentialUserEntity;
  challenge: BufferSource;
  pubKeyCredParams: PublicKeyCredentialParameters[];
  timeout?: number;
  excludeCredentials?: PublicKeyCredentialDescriptor[];
  authenticatorSelection?: AuthenticatorSelectionCriteria;
  attestation?: AttestationConveyancePreference;
  extensions?: AuthenticationExtensionsClientInputs;
}

export interface PublicKeyCredentialRequestOptions {
  challenge: BufferSource;
  timeout?: number;
  rpId?: string;
  allowCredentials?: PublicKeyCredentialDescriptor[];
  userVerification?: UserVerificationRequirement;
  extensions?: AuthenticationExtensionsClientInputs;
}

export interface PublicKeyCredentialRpEntity {
  id?: string;
  name: string;
  icon?: string;
}

export interface PublicKeyCredentialUserEntity {
  id: BufferSource;
  name: string;
  displayName: string;
  icon?: string;
}

export interface PublicKeyCredentialParameters {
  type: 'public-key';
  alg: COSEAlgorithmIdentifier;
}

export interface PublicKeyCredentialDescriptor {
  type: 'public-key';
  id: BufferSource;
  transports?: AuthenticatorTransport[];
}

export interface AuthenticatorSelectionCriteria {
  authenticatorAttachment?: AuthenticatorAttachment;
  requireResidentKey?: boolean;
  residentKey?: ResidentKeyRequirement;
  userVerification?: UserVerificationRequirement;
}

export type AttestationConveyancePreference = 'none' | 'indirect' | 'direct' | 'enterprise';
export type AuthenticatorAttachment = 'platform' | 'cross-platform';
export type AuthenticatorTransport = 'usb' | 'nfc' | 'ble' | 'smart-card' | 'hybrid' | 'internal';
export type UserVerificationRequirement = 'required' | 'preferred' | 'discouraged';
export type ResidentKeyRequirement = 'discouraged' | 'preferred' | 'required';
export type COSEAlgorithmIdentifier = number;

export interface AuthenticationExtensionsClientInputs {
  [key: string]: unknown;
}

export interface AuthenticationExtensionsClientOutputs {
  [key: string]: unknown;
}

export interface WebAuthnSignatureData {
  credentialId: string;
  authenticatorData: string; // base64url
  clientDataJSON: string; // base64url
  signature: string; // base64url
  publicKey: {
    kty: string;
    alg: string;
    crv: string;
    x: string;
    y: string;
    kid: string;
  };
  sig_target: {
    schema: string;
    circuit_id: string;
    vkey_hash: string;
    pdf_sha3_512: string;
    commit: string;
    issued_at: string;
  };
}

// Helper for CBOR decoding
export interface CBORData {
  1: number; // kty (key type)
  3: number; // alg (algorithm)
  '-1': number; // crv (curve)
  '-2': ArrayBuffer; // x coordinate
  '-3': ArrayBuffer; // y coordinate
}
