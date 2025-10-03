/**
 * Signing Configuration for VKNFT Bundles
 * 
 * Production-only configuration using Ledger hardware wallet.
 * All signatures are performed on-device for maximum security.
 */

export interface LedgerHardwareSigningConfig {
  mode: 'ledger-hardware'
  label: string
  derivation_path: string
}

export type SigningConfig = LedgerHardwareSigningConfig

// ============================================================================
// PRODUCTION CONFIGURATION (Ledger hardware wallet only)
// ============================================================================

const LEDGER_CONFIG: LedgerHardwareSigningConfig = {
  mode: 'ledger-hardware',
  label: 'Ledger Hardware Wallet',
  derivation_path: "44'/60'/0'/0/0", // Ethereum default BIP44 path
}

/**
 * Get the current signing configuration
 * Always returns Ledger hardware wallet configuration
 */
export function getSigningConfig(): SigningConfig {
  console.log('[Signing] Using Ledger hardware wallet for all signatures')
  return LEDGER_CONFIG
}

export const SIGNING_CONFIG: SigningConfig = LEDGER_CONFIG
