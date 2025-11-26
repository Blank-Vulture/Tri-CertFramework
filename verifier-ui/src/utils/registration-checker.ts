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

export interface AllowlistEntry {
  activation_hash: string;
  student_id_hash: string;
  created_at: string;
  updated_at: string;
}

export interface AllowlistFile {
  schema: string;
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
  registeredAt?: string;
  error?: string;
}

/**
 * GitHub raw URL for the student registry index
 * Update this URL to match your repository
 */
const REGISTRY_INDEX_URL = 'https://raw.githubusercontent.com/Blank-Vulture/Tri-CertFramework/main/registrations/index.json';

/**
 * GitHub raw URL for the commit allowlist
 */
const ALLOWLIST_URL = 'https://raw.githubusercontent.com/Blank-Vulture/Tri-CertFramework/main/registrations/commit-allowlist.json';

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
    console.log('Fetching student registry from:', REGISTRY_INDEX_URL);
    
    const response = await fetch(REGISTRY_INDEX_URL, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
      },
      // Add cache busting to ensure fresh data
      cache: 'no-cache',
    });

    if (!response.ok) {
      console.error('Failed to fetch registry:', response.status, response.statusText);
      return null;
    }

    const registry: StudentRegistry = await response.json();
    console.log('Registry fetched successfully:', {
      schema: registry.schema,
      studentCount: Object.keys(registry.registry || {}).length,
      lastUpdated: registry.last_updated,
    });

    return registry;
  } catch (error) {
    console.error('Error fetching student registry:', error);
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
    console.log('Calculated JWK Thumbprint:', thumbprint);

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
      console.log('Registry is empty - no public keys registered yet');
      return {
        isRegistered: false,
        thumbprint,
        error: 'Public key registry is empty (no students registered with public keys yet)',
      };
    }

    // Check if thumbprint exists in registry
    const isRegistered = registry.registry[thumbprint] === true;

    console.log('Registration check result:', {
      thumbprint,
      isRegistered,
      registrySize,
    });

    return {
      isRegistered,
      thumbprint,
    };
  } catch (error) {
    console.error('Registration check error:', error);
    return {
      isRegistered: false,
      thumbprint: '',
      error: error instanceof Error ? error.message : 'Unknown error',
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
    console.log('Fetching allowlist from:', ALLOWLIST_URL);
    
    const response = await fetch(ALLOWLIST_URL, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
      },
      cache: 'no-cache',
    });

    if (!response.ok) {
      console.error('Failed to fetch allowlist:', response.status, response.statusText);
      return null;
    }

    const allowlist: AllowlistFile = await response.json();
    console.log('Allowlist fetched successfully:', {
      schema: allowlist.schema,
      entryCount: allowlist.entries?.length || 0,
      updatedAt: allowlist.updated_at,
    });

    return allowlist;
  } catch (error) {
    console.error('Error fetching allowlist:', error);
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
    console.log('Checking activation hash:', activationHash);

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
      console.log('Activation hash found in allowlist:', {
        activationHash,
        studentIdHash: entry.student_id_hash,
        createdAt: entry.created_at,
      });

      return {
        isValid: true,
        activationHash,
        studentIdHash: entry.student_id_hash,
        registeredAt: entry.created_at,
      };
    }

    console.log('Activation hash not found in allowlist');
    return {
      isValid: false,
      activationHash,
      error: 'Activation hash not found in allowlist',
    };
  } catch (error) {
    console.error('Activation hash check error:', error);
    return {
      isValid: false,
      activationHash,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Verify registration info from proof against allowlist
 */
export async function verifyProofRegistration(
  registration: {
    activation_hash: string;
    student_id_hash: string;
    verified_at: string;
  }
): Promise<ActivationHashCheckResult> {
  try {
    console.log('Verifying proof registration:', registration);

    // Check activation hash against allowlist
    const result = await checkActivationHash(registration.activation_hash);

    if (result.isValid && result.studentIdHash) {
      // Verify that student_id_hash matches
      if (result.studentIdHash !== registration.student_id_hash) {
        console.warn('Student ID hash mismatch:', {
          expected: result.studentIdHash,
          actual: registration.student_id_hash,
        });
        return {
          isValid: false,
          activationHash: registration.activation_hash,
          studentIdHash: registration.student_id_hash,
          error: 'Student ID hash mismatch',
        };
      }
    }

    return result;
  } catch (error) {
    console.error('Proof registration verification error:', error);
    return {
      isValid: false,
      activationHash: registration.activation_hash,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

