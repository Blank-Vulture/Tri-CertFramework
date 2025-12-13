/**
 * Registration Checker - Verifies if a public key belongs to a registered student
 * and verifies activation hash against the allowlist
 */

export interface StudentRegistry {
  schema: string;
  description: string;
  registry: Record<string, boolean>;
  last_updated: string;
  version: string;
}

export interface IssuerInfo {
  id: string;
  name: string;
}

export interface AllowlistEntry {
  activation_hash: string;
  student_id_hash: string;
  created_at: string;
  updated_at: string;
}

export interface AllowlistFile {
  schema: string;
  issuer?: IssuerInfo;
  updated_at: string;
  entries: AllowlistEntry[];
}

export interface RegistrationCheckResult {
  isRegistered: boolean;
  thumbprint: string;
  error?: string;
}

export interface ActivationHashCheckResult {
  isValid: boolean;
  activationHash?: string;
  studentIdHash?: string;
  issuerId?: string;
  issuerName?: string;
  allowlistUrl?: string;
  registeredAt?: string;
  error?: string;
}

/**
 * GitHub raw URL for the student registry index
 * Can be overridden via NEXT_PUBLIC_REGISTRY_INDEX_URL environment variable
 */
const DEFAULT_REGISTRY_INDEX_URL = 'https://raw.githubusercontent.com/Blank-Vulture/Tri-CertFramework/main/registrations/index.json';
const REGISTRY_INDEX_URL = process.env.NEXT_PUBLIC_REGISTRY_INDEX_URL || DEFAULT_REGISTRY_INDEX_URL;

/**
 * GitHub raw URL for the commit allowlist
 * Can be overridden via NEXT_PUBLIC_ALLOWLIST_URL environment variable
 */
const DEFAULT_ALLOWLIST_URL = 'https://raw.githubusercontent.com/Blank-Vulture/Tri-CertFramework/main/registrations/commit-allowlist.json';
const ALLOWLIST_URL = process.env.NEXT_PUBLIC_ALLOWLIST_URL || DEFAULT_ALLOWLIST_URL;

/**
 * Validate student registry structure for integrity
 */
function validateRegistryIntegrity(data: unknown): data is StudentRegistry {
  if (!data || typeof data !== 'object') return false;
  const obj = data as Record<string, unknown>;
  
  if (typeof obj.schema !== 'string') return false;
  if (typeof obj.registry !== 'object' || obj.registry === null) return false;
  
  return true;
}

/**
 * Validate allowlist structure for integrity
 */
function validateAllowlistIntegrity(data: unknown): data is AllowlistFile {
  if (!data || typeof data !== 'object') return false;
  const obj = data as Record<string, unknown>;
  
  // Schema validation
  if (typeof obj.schema !== 'string' || !obj.schema.startsWith('tri-cert/commit-allowlist@')) {
    return false;
  }
  
  // Structure validation
  if (!Array.isArray(obj.entries)) return false;
  
  // Entry validation
  for (const entry of obj.entries) {
    if (!entry || typeof entry !== 'object') return false;
    const e = entry as Record<string, unknown>;
    if (typeof e.activation_hash !== 'string' || !e.activation_hash.startsWith('sha512:')) return false;
    if (typeof e.student_id_hash !== 'string' || !e.student_id_hash.startsWith('sha512:')) return false;
  }
  
  return true;
}

/**
 * Calculate JWK Thumbprint (RFC 7638)
 */
export async function calculateJWKThumbprint(jwk: {
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
 * Convert ArrayBuffer to base64url string
 */
function arrayBufferToBase64url(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary)
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=/g, '');
}

/**
 * Fetch student registry index from GitHub
 */
export async function fetchStudentRegistry(): Promise<StudentRegistry | null> {
  try {
    const response = await fetch(REGISTRY_INDEX_URL, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
      },
      // Add cache busting to ensure fresh data
      cache: 'no-cache',
    });

    if (!response.ok) {
      return null;
    }

    const data: unknown = await response.json();
    
    // Integrity validation
    if (!validateRegistryIntegrity(data)) {
      return null;
    }
    
    return data;
  } catch {
    return null;
  }
}

/**
 * Check if a public key is registered
 */
export async function checkRegistration(publicKey: {
  kty: string;
  crv: string;
  x: string;
  y: string;
}): Promise<RegistrationCheckResult> {
  try {
    // Calculate JWK Thumbprint
    const thumbprint = await calculateJWKThumbprint(publicKey);

    // Fetch registry
    const registry = await fetchStudentRegistry();

    if (!registry) {
      return {
        isRegistered: false,
        thumbprint,
        error: 'Failed to fetch student registry',
      };
    }

    // Check if registry is empty (no students registered yet)
    const registrySize = Object.keys(registry.registry || {}).length;
    if (registrySize === 0) {
      return {
        isRegistered: false,
        thumbprint,
        error: 'Public key registry is empty (no students registered with public keys yet)',
      };
    }

    // Check if thumbprint exists in registry
    const isRegistered = registry.registry[thumbprint] === true;

    return {
      isRegistered,
      thumbprint,
    };
  } catch {
    return {
      isRegistered: false,
      thumbprint: '',
      error: 'Registration check failed',
    };
  }
}

/**
 * Set the registry URL (for testing or different deployments)
 */
export function setRegistryURL(url: string): void {
  // This would require making REGISTRY_INDEX_URL mutable
  // For now, users should update the constant directly
  console.log('To change registry URL, update REGISTRY_INDEX_URL in registration-checker.ts');
  console.log('Requested URL:', url);
}

/**
 * Fetch the commit allowlist from GitHub
 */
export async function fetchAllowlist(): Promise<AllowlistFile | null> {
  try {
    const response = await fetch(ALLOWLIST_URL, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
      },
      cache: 'no-cache',
    });

    if (!response.ok) {
      return null;
    }

    const data: unknown = await response.json();
    
    // Integrity validation
    if (!validateAllowlistIntegrity(data)) {
      return null;
    }
    
    return data;
  } catch {
    return null;
  }
}

/**
 * Check if an activation hash exists in the allowlist
 * This verifies that the proof was generated by a registered student
 */
export async function checkActivationHash(
  activationHash: string
): Promise<ActivationHashCheckResult> {
  try {
    // Fetch allowlist
    const allowlist = await fetchAllowlist();

    if (!allowlist) {
      return {
        isValid: false,
        activationHash,
        error: 'Failed to fetch allowlist',
      };
    }

    // Check if activation hash exists in allowlist
    const entry = allowlist.entries.find(e => e.activation_hash === activationHash);

    if (entry) {
      return {
        isValid: true,
        activationHash,
        studentIdHash: entry.student_id_hash,
        registeredAt: entry.created_at,
      };
    }

    return {
      isValid: false,
      activationHash,
      error: 'Activation hash not found in allowlist',
    };
  } catch {
    return {
      isValid: false,
      activationHash,
      error: 'Activation hash check failed',
    };
  }
}

/**
 * Fetch allowlist from a specific URL
 */
export async function fetchAllowlistFromUrl(url: string): Promise<AllowlistFile | null> {
  try {
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
      },
      cache: 'no-cache',
    });

    if (!response.ok) {
      return null;
    }

    const data: unknown = await response.json();
    
    // Integrity validation
    if (!validateAllowlistIntegrity(data)) {
      return null;
    }
    
    return data;
  } catch {
    return null;
  }
}

/**
 * Verify registration info from proof against allowlist
 * Supports both legacy (no issuer) and new (with issuer) formats
 */
export async function verifyProofRegistration(
  registration: {
    activation_hash: string;
    student_id_hash: string;
    issuer_id?: string;
    issuer_name?: string;
    allowlist_url?: string;
    verified_at: string;
  }
): Promise<ActivationHashCheckResult> {
  try {
    // Determine which allowlist to fetch
    const allowlistUrl = registration.allowlist_url || ALLOWLIST_URL;
    
    // Fetch allowlist (from proof's URL if provided, otherwise default)
    const allowlist = registration.allowlist_url 
      ? await fetchAllowlistFromUrl(registration.allowlist_url)
      : await fetchAllowlist();

    if (!allowlist) {
      return {
        isValid: false,
        activationHash: registration.activation_hash,
        error: 'Failed to fetch allowlist',
      };
    }

    // Check if activation hash exists in allowlist
    const entry = allowlist.entries.find(e => e.activation_hash === registration.activation_hash);

    if (!entry) {
      return {
        isValid: false,
        activationHash: registration.activation_hash,
        error: 'Activation hash not found in allowlist',
      };
    }

    // Verify that student_id_hash matches
    if (entry.student_id_hash !== registration.student_id_hash) {
      return {
        isValid: false,
        activationHash: registration.activation_hash,
        studentIdHash: registration.student_id_hash,
        error: 'Student ID hash mismatch',
      };
    }

    // If proof has issuer info, verify it matches the allowlist
    if (registration.issuer_id && allowlist.issuer) {
      if (registration.issuer_id !== allowlist.issuer.id) {
        return {
          isValid: false,
          activationHash: registration.activation_hash,
          studentIdHash: registration.student_id_hash,
          issuerId: registration.issuer_id,
          issuerName: registration.issuer_name,
          error: 'Issuer ID mismatch between proof and allowlist',
        };
      }
    }

    // Return success with issuer info
    return {
      isValid: true,
      activationHash: registration.activation_hash,
      studentIdHash: entry.student_id_hash,
      issuerId: allowlist.issuer?.id || registration.issuer_id,
      issuerName: allowlist.issuer?.name || registration.issuer_name,
      allowlistUrl,
      registeredAt: entry.created_at,
    };
  } catch {
    return {
      isValid: false,
      activationHash: registration.activation_hash,
      error: 'Registration verification failed',
    };
  }
}
