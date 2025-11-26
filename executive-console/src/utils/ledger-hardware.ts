/**
 * Ledger Hardware Wallet Integration (Tauri Native)
 * 
 * This module provides hardware signing using Ledger devices
 * via Tauri's native Rust backend.
 */

import { invoke } from '@tauri-apps/api/core'

export interface LedgerDeviceInfo {
  product_string: string
  manufacturer_string: string
  serial_number: string | null
  product_id: number
}

export interface LedgerPublicKey {
  public_key_hex: string
  address: string
  chain_code_hex: string
}

export interface LedgerSignature {
  r: string
  s: string
  v: number
}

export interface LedgerSigningConfig {
  mode: 'ledger-hardware'
  label: string
  derivation_path: string
  public_key?: LedgerPublicKey
}

/**
 * List all connected Ledger devices
 */
export async function listLedgerDevices(): Promise<LedgerDeviceInfo[]> {
  try {
    return await invoke<LedgerDeviceInfo[]>('list_ledger_devices')
  } catch (error) {
    console.error('[Ledger] Failed to list devices:', error)
    throw new Error(`Failed to detect Ledger devices: ${error}`)
  }
}

/**
 * Get public key from Ledger
 * 
 * @param derivationPath BIP44 path (default: m/44'/60'/0'/0/0)
 */
export async function getLedgerPublicKey(
  derivationPath: string = "44'/60'/0'/0/0"
): Promise<LedgerPublicKey> {
  console.log('[Ledger] Getting public key from Ledger...')
  console.log('[Ledger] Derivation path:', derivationPath)
  
  try {
    const result = await invoke<LedgerPublicKey>('get_ledger_public_key', {
      derivationPath,
    })
    
    console.log('[Ledger] Public key retrieved successfully')
    console.log('[Ledger] Address:', result.address)
    
    return result
  } catch (error) {
    console.error('[Ledger] Failed to get public key:', error)
    console.error('[Ledger] Error details:', JSON.stringify(error, null, 2))
    
    // Provide user-friendly error messages
    const errorStr = String(error)
    if (errorStr.includes('Device not found')) {
      throw new Error('Ledger device not connected. Please connect your Ledger and try again.')
    } else if (errorStr.includes('App not running') || errorStr.includes('6d02')) {
      throw new Error('Ethereum App is not running on Ledger. Please:\n1. Unlock your Ledger device\n2. Open the "Ethereum" app on your Ledger\n3. Ensure it shows "Application is ready"\n4. Try again')
    } else if (errorStr.includes('Invalid response')) {
      throw new Error('Ledger communication error. Please:\n1. Disconnect and reconnect your Ledger\n2. Make sure Ethereum app is open\n3. Try again\n\nIf the problem persists, check the console logs for details.')
    } else {
      throw new Error(`Failed to get public key from Ledger: ${error}`)
    }
  }
}

/**
 * Sign a 32-byte hash with Ledger
 * 
 * @param hashHex Hex-encoded hash (32 bytes)
 * @param derivationPath BIP44 path (default: m/44'/60'/0'/0/0)
 */
export async function signWithLedgerHardware(
  hashHex: string,
  derivationPath: string = "44'/60'/0'/0/0"
): Promise<LedgerSignature> {
  console.log('[Ledger] Signing with Ledger hardware...')
  console.log('[Ledger] Hash:', hashHex)
  console.log('[Ledger] Derivation path:', derivationPath)
  
  try {
    const signature = await invoke<LedgerSignature>('sign_with_ledger', {
      hashHex,
      derivationPath,
    })
    
    console.log('[Ledger] Signature obtained successfully')
    console.log('[Ledger] R:', signature.r)
    console.log('[Ledger] S:', signature.s)
    console.log('[Ledger] V:', signature.v)
    
    return signature
  } catch (error) {
    console.error('[Ledger] Signing failed:', error)
    
    // Provide user-friendly error messages
    const errorStr = String(error)
    if (errorStr.includes('Device not found')) {
      throw new Error('Ledger device not connected. Please connect your Ledger and try again.')
    } else if (errorStr.includes('App not running') || errorStr.includes('6d02')) {
      throw new Error('Ethereum App is not running on Ledger. Please:\n1. Unlock your Ledger device\n2. Open the "Ethereum" app on your Ledger\n3. Ensure it shows "Application is ready"\n4. Try again')
    } else if (errorStr.includes('User denied')) {
      throw new Error('Signature request was denied on the Ledger device.')
    } else {
      throw new Error(`Ledger signing failed: ${error}`)
    }
  }
}

/**
 * Convert Ledger signature to Base64 (for storage)
 */
export function ledgerSignatureToBase64(signature: LedgerSignature): string {
  // Concatenate r + s (64 bytes total)
  const r = hexToBytes(signature.r)
  const s = hexToBytes(signature.s)
  const combined = new Uint8Array(64)
  combined.set(r, 0)
  combined.set(s, 32)
  
  return bytesToBase64(combined)
}

/**
 * Convert Ledger public key to JWK format
 * Note: Ledger uses secp256k1 curve (Ethereum standard)
 */
export function ledgerPublicKeyToJwk(publicKey: LedgerPublicKey): JsonWebKey {
  // Public key is in uncompressed format: 0x04 + X (32 bytes) + Y (32 bytes)
  const pubKeyBytes = hexToBytes(publicKey.public_key_hex)
  
  if (pubKeyBytes[0] !== 0x04 || pubKeyBytes.length !== 65) {
    throw new Error('Invalid public key format')
  }
  
  const x = pubKeyBytes.slice(1, 33)
  const y = pubKeyBytes.slice(33, 65)
  
  // Note: secp256k1 is not a standard JWK curve, but we store it for reference
  // Verification should use Ethereum-specific libraries (e.g., ethers.js)
  return {
    kty: 'EC',
    crv: 'secp256k1', // Ethereum curve (non-standard JWK)
    x: bytesToBase64Url(x),
    y: bytesToBase64Url(y),
    key_ops: ['verify'],
    ext: true,
  }
}

// Helper functions

function hexToBytes(hex: string): Uint8Array {
  const normalized = hex.startsWith('0x') ? hex.slice(2) : hex
  const bytes = new Uint8Array(normalized.length / 2)
  for (let i = 0; i < normalized.length; i += 2) {
    bytes[i / 2] = parseInt(normalized.slice(i, i + 2), 16)
  }
  return bytes
}

function bytesToBase64(bytes: Uint8Array): string {
  let binary = ''
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i])
  }
  return btoa(binary)
}

function bytesToBase64Url(bytes: Uint8Array): string {
  return bytesToBase64(bytes)
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '')
}

