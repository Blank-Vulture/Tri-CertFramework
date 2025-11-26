/**
 * Salt Verifier - Verifies student registration via salt and activation hash
 */

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

export interface SaltVerificationResult {
  isValid: boolean;
  activationHash?: string;
  studentIdHash?: string;
  error?: string;
}

/**
 * GitHub raw URL for the commit allowlist
 * This should point to the registrar's published allowlist
 * Can be overridden via NEXT_PUBLIC_ALLOWLIST_URL environment variable
 */
const DEFAULT_ALLOWLIST_URL = 'https://raw.githubusercontent.com/Blank-Vulture/Tri-CertFramework/main/registrations/commit-allowlist.json';
const ALLOWLIST_URL = process.env.NEXT_PUBLIC_ALLOWLIST_URL || DEFAULT_ALLOWLIST_URL;

// Expected schema prefix for integrity verification
const EXPECTED_SCHEMA_PREFIX = 'tri-cert/commit-allowlist@';

/**
 * Validate allowlist structure for integrity
 */
function validateAllowlistIntegrity(data: unknown): data is AllowlistFile {
  if (!data || typeof data !== 'object') return false;
  const obj = data as Record<string, unknown>;
  
  // Schema validation - must match expected prefix
  if (typeof obj.schema !== 'string' || !obj.schema.startsWith(EXPECTED_SCHEMA_PREFIX)) {
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
 * Calculate activation hash from salt, name, and birthdate
 * Must match the algorithm in registrar-console/internal/registrar/service.go
 */
export async function calculateActivationHash(
  salt: string,
  name: string,
  birthdate: string
): Promise<string> {
  // Normalize name: collapse whitespace, trim, uppercase
  const normalizedName = name.trim().replace(/\s+/g, ' ').toUpperCase();
  
  // Normalize birthdate: parse and format as YYYY-MM-DD
  const normalizedBirthdate = normalizeBirthdate(birthdate);
  
  // Hash: SHA-512 of "activation|{salt}|{name}|{birthdate}"
  const input = `activation|${salt}|${normalizedName}|${normalizedBirthdate}`;
  const encoder = new TextEncoder();
  const data = encoder.encode(input);
  const hashBuffer = await crypto.subtle.digest('SHA-512', data);
  const hashHex = arrayBufferToHex(hashBuffer);
  
  return `sha512:${hashHex}`;
}

/**
 * Normalize birthdate to YYYY-MM-DD format
 */
function normalizeBirthdate(value: string): string {
  const clean = value.trim().replace(/\s+/g, '');
  
  // Try various date formats
  const formats = [
    // ISO format
    /^(\d{4})-(\d{1,2})-(\d{1,2})$/,
    /^(\d{4})\/(\d{1,2})\/(\d{1,2})$/,
    /^(\d{4})\.(\d{1,2})\.(\d{1,2})$/,
    // Japanese format
    /^(\d{4})年(\d{1,2})月(\d{1,2})日$/,
  ];
  
  for (const format of formats) {
    const match = clean.match(format);
    if (match) {
      const year = match[1];
      const month = match[2].padStart(2, '0');
      const day = match[3].padStart(2, '0');
      return `${year}-${month}-${day}`;
    }
  }
  
  // Try DD-MM-YYYY or DD/MM/YYYY formats
  const dmyFormats = [
    /^(\d{1,2})-(\d{1,2})-(\d{4})$/,
    /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/,
    /^(\d{1,2})\.(\d{1,2})\.(\d{4})$/,
  ];
  
  for (const format of dmyFormats) {
    const match = clean.match(format);
    if (match) {
      const day = match[1].padStart(2, '0');
      const month = match[2].padStart(2, '0');
      const year = match[3];
      return `${year}-${month}-${day}`;
    }
  }
  
  // Return as-is if no format matches (will likely fail validation)
  return clean;
}

/**
 * Convert ArrayBuffer to hex string
 */
function arrayBufferToHex(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  return Array.from(bytes)
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
}

/**
 * Fetch the allowlist from the configured URL
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
 * Verify salt against the allowlist
 */
export async function verifySalt(
  salt: string,
  name: string,
  birthdate: string
): Promise<SaltVerificationResult> {
  try {
    // Calculate activation hash
    const activationHash = await calculateActivationHash(salt, name, birthdate);

    // Fetch allowlist
    const allowlist = await fetchAllowlist();
    
    if (!allowlist) {
      return {
        isValid: false,
        activationHash,
        error: 'Failed to fetch allowlist. Please check your network connection.',
      };
    }

    // Check if activation hash exists in allowlist
    const entry = allowlist.entries.find(e => e.activation_hash === activationHash);
    
    if (entry) {
      return {
        isValid: true,
        activationHash,
        studentIdHash: entry.student_id_hash,
      };
    }

    return {
      isValid: false,
      activationHash,
      error: 'This salt is not registered. Please contact your registrar.',
    };
  } catch {
    return {
      isValid: false,
      error: 'Verification failed. Please try again.',
    };
  }
}

/**
 * Set the allowlist URL (for different deployments)
 * Note: URL is configured via NEXT_PUBLIC_ALLOWLIST_URL environment variable
 * This function is kept for API compatibility but does not change runtime URL
 */
export function setAllowlistURL(_url: string): void {
  // URL configuration is done via environment variable NEXT_PUBLIC_ALLOWLIST_URL
  // This function is kept for API compatibility only
}

