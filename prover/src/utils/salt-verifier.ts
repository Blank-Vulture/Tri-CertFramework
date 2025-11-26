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
 */
const ALLOWLIST_URL = 'https://raw.githubusercontent.com/Blank-Vulture/Tri-CertFramework/main/registrations/commit-allowlist.json';

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
    console.log('Calculated activation hash:', activationHash);

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
      console.log('Salt verified successfully:', {
        activationHash,
        studentIdHash: entry.student_id_hash,
      });
      
      return {
        isValid: true,
        activationHash,
        studentIdHash: entry.student_id_hash,
      };
    }

    console.log('Salt not found in allowlist');
    return {
      isValid: false,
      activationHash,
      error: 'This salt is not registered. Please contact your registrar.',
    };
  } catch (error) {
    console.error('Salt verification error:', error);
    return {
      isValid: false,
      error: error instanceof Error ? error.message : 'Unknown error during verification',
    };
  }
}

/**
 * Set the allowlist URL (for different deployments)
 */
export function setAllowlistURL(url: string): void {
  console.log('To change allowlist URL, update ALLOWLIST_URL in salt-verifier.ts');
  console.log('Requested URL:', url);
}

