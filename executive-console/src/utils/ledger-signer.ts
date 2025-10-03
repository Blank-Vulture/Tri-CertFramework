import { getSigningConfig } from '../config/signing'
import type { LedgerHardwareSigningConfig } from '../config/signing'
import {
  signWithLedgerHardware,
  ledgerSignatureToBase64,
  getLedgerPublicKey,
  ledgerPublicKeyToJwk,
} from './ledger-hardware'

export type LedgerSignature = {
  scheme: 'ledger-hardware'
  algorithm: string
  signatureBase64: string
  createdAt: string
  label: string
  derivation_path: string
  publicKeyJwk: JsonWebKey
}

async function signWithLedgerHardwareWallet(
  zipHashHex: string,
  config: LedgerHardwareSigningConfig
): Promise<LedgerSignature> {
  console.log('[Ledger] Hardware wallet signing started')
  console.log('[Ledger] Derivation path:', config.derivation_path)
  
  try {
    // Get public key (for verification)
    const publicKey = await getLedgerPublicKey(config.derivation_path)
    const publicKeyJwk = ledgerPublicKeyToJwk(publicKey)
    
    // Sign the hash
    const signature = await signWithLedgerHardware(zipHashHex, config.derivation_path)
    const signatureBase64 = ledgerSignatureToBase64(signature)
    
    return {
      scheme: 'ledger-hardware',
      algorithm: 'ECDSA_secp256k1_SHA256',
      signatureBase64,
      createdAt: new Date().toISOString(),
      label: config.label,
      derivation_path: config.derivation_path,
      publicKeyJwk,
    }
  } catch (error) {
    console.error('[Ledger] Hardware wallet signing failed:', error)
    throw error
  }
}

export async function signZipBundle(zipHashHex: string): Promise<LedgerSignature> {
  const config = getSigningConfig()
  console.log('[Ledger] Signing with Ledger hardware wallet:', config.label)
  
  try {
    const result = await signWithLedgerHardwareWallet(zipHashHex, config)
    console.log('[Ledger] Hardware wallet signing successful')
    return result
  } catch (error) {
    console.error('[Ledger] Hardware wallet signing failed:', error)
    throw error
  }
}
