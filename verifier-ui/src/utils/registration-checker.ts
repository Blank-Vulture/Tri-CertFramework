/**
 * Registration Checker - Verifies if a public key belongs to a registered student
 */

export interface StudentRegistry {
  schema: string;
  description: string;
  registry: Record<string, boolean>;
  last_updated: string;
  version: string;
}

export interface RegistrationCheckResult {
  isRegistered: boolean;
  thumbprint: string;
  error?: string;
}

/**
 * GitHub raw URL for the student registry index
 * Update this URL to match your repository
 */
const REGISTRY_INDEX_URL = 'https://raw.githubusercontent.com/{user}/{repo}/main/registrations/index.json';

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

    // Check if thumbprint exists in registry
    const isRegistered = registry.registry[thumbprint] === true;

    console.log('Registration check result:', {
      thumbprint,
      isRegistered,
      registrySize: Object.keys(registry.registry).length,
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

