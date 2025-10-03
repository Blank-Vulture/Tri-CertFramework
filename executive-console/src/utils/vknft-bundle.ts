import { exists, writeFile, mkdir, readFile } from '@tauri-apps/plugin-fs'
import { open } from '@tauri-apps/plugin-dialog'
import { join } from '@tauri-apps/api/path'

import { createZipArchive } from './zip'
import { signZipBundle } from './ledger-signer'

const STORAGE_KEY = 'tricert.vknft.baseDir'

interface FilePayload {
  fileName: string
  data: Uint8Array
}

function isTauriEnvironment(): boolean {
  // Check multiple indicators for Tauri environment
  if (typeof window === 'undefined') {
    return false
  }
  
  // Tauri v2 may not set window.__TAURI__ immediately
  // Instead, check if we can import Tauri modules
  try {
    // Check if Tauri context exists
    return '__TAURI_INTERNALS__' in window || '__TAURI__' in window || 
           navigator.userAgent.includes('Tauri')
  } catch {
    return false
  }
}

export interface VKNFTBundleOptions {
  year: number
  wasm: FilePayload
  zkey: FilePayload
  vk: {
    fileName: string
    json: string
  }
  vkeyHash: string
}

export interface VKNFTBundleResult {
  baseDir: string
  yearDir: string
  filesDir: string
  zipPath: string
  manifestPath: string
  logPath: string
  signaturePath: string | null
}

async function ensureBaseDir(): Promise<string> {
  const saved = localStorage.getItem(STORAGE_KEY)
  if (saved) {
    console.log('[VKNFT] Using saved base directory:', saved)
    // Verify the saved directory still exists
    try {
      const dirExists = await exists(saved)
      if (dirExists) {
        return saved
      } else {
        console.warn('[VKNFT] Saved directory no longer exists, prompting for new location')
        localStorage.removeItem(STORAGE_KEY)
      }
    } catch (error) {
      console.error('[VKNFT] Failed to check saved directory:', error)
      localStorage.removeItem(STORAGE_KEY)
    }
  }

  console.log('[VKNFT] Prompting user to select VKNFT directory...')
  let selected: string | string[] | null
  try {
    selected = await open({
      title: 'VKNFT の保存先ディレクトリを選択してください',
      directory: true,
      multiple: false,
    })
  } catch (error) {
    console.error('[VKNFT] Dialog open failed:', error)
    throw new Error(`Failed to open directory selection dialog: ${error instanceof Error ? error.message : String(error)}`)
  }

  if (!selected || Array.isArray(selected)) {
    throw new Error('VKNFTディレクトリが選択されませんでした')
  }

  console.log('[VKNFT] User selected directory:', selected)
  
  const baseDir = selected.endsWith('VKNFT')
    ? selected
    : await join(selected, 'VKNFT')
  
  console.log('[VKNFT] Base directory will be:', baseDir)

  try {
    const dirExists = await exists(baseDir)
    if (!dirExists) {
      console.log('[VKNFT] Creating base directory...')
      await mkdir(baseDir, { recursive: true })
      console.log('[VKNFT] Base directory created successfully')
    } else {
      console.log('[VKNFT] Base directory already exists')
    }
  } catch (error) {
    console.error('[VKNFT] Failed to create base directory:', error)
    throw new Error(`Failed to create VKNFT base directory: ${error instanceof Error ? error.message : String(error)}`)
  }

  localStorage.setItem(STORAGE_KEY, baseDir)
  console.log('[VKNFT] Base directory saved to localStorage')
  return baseDir
}

async function sha3(data: Uint8Array | string, outputLength: 256 | 512 = 256): Promise<string> {
  const crypto = await import('crypto-js')
  if (typeof data === 'string') {
    return crypto.SHA3(data, { outputLength }).toString()
  }
  const wordArray = crypto.lib.WordArray.create(Array.from(data))
  return crypto.SHA3(wordArray, { outputLength }).toString()
}

function toBytes(value: string): Uint8Array {
  return new TextEncoder().encode(value)
}

export async function generateVknftBundle(options: VKNFTBundleOptions): Promise<VKNFTBundleResult> {
  console.log('[VKNFT] Starting bundle generation for year:', options.year)
  console.log('[VKNFT] Environment check:', {
    isTauri: isTauriEnvironment(),
    hasTauriInternals: typeof window !== 'undefined' && '__TAURI_INTERNALS__' in window,
    hasTauri: typeof window !== 'undefined' && '__TAURI__' in window,
    userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : 'N/A'
  })
  
  // Try to use Tauri APIs - they will throw if not available
  let baseDir: string
  try {
    baseDir = await ensureBaseDir()
    console.log('[VKNFT] Base directory:', baseDir)
  } catch (error) {
    console.error('[VKNFT] Failed to get base directory:', error)
    throw new Error(`Failed to select or create VKNFT directory: ${error instanceof Error ? error.message : String(error)}`)
  }
  
  const yearDir = await join(baseDir, String(options.year))
  console.log('[VKNFT] Year directory:', yearDir)
  
  const filesDir = await join(yearDir, 'files')
  console.log('[VKNFT] Files directory:', filesDir)

  try {
    await mkdir(filesDir, { recursive: true })
    console.log('[VKNFT] Created directories successfully')
  } catch (error) {
    console.error('[VKNFT] Failed to create directories:', error)
    throw new Error(`Failed to create VKNFT directories: ${error instanceof Error ? error.message : String(error)}`)
  }

  const vkBytes = toBytes(options.vk.json)

  const wasmHash = await sha3(options.wasm.data)
  const zkeyHash = await sha3(options.zkey.data)
  const vkHash = await sha3(vkBytes)

  const zipEntries = [
    { name: options.wasm.fileName, data: options.wasm.data },
    { name: options.zkey.fileName, data: options.zkey.data },
    { name: options.vk.fileName, data: vkBytes },
  ]

  const zipData = createZipArchive(zipEntries)
  const zipHash = await sha3(zipData)

  const nowIso = new Date().toISOString()
  const manifest = {
    schema: 'tri-cert/vknft-bundle@1',
    version: 1,
    year: options.year,
    generatedAt: nowIso,
    files: {
      wasm: {
        fileName: options.wasm.fileName,
        sha3_256: wasmHash,
        size: options.wasm.data.byteLength,
        relativePath: `files/${options.wasm.fileName}`,
      },
      zkey: {
        fileName: options.zkey.fileName,
        sha3_256: zkeyHash,
        size: options.zkey.data.byteLength,
        relativePath: `files/${options.zkey.fileName}`,
      },
      vk: {
        fileName: options.vk.fileName,
        sha3_256: vkHash,
        size: vkBytes.byteLength,
        relativePath: `files/${options.vk.fileName}`,
        declaredHash: options.vkeyHash,
      },
      zip: {
        fileName: `vk_bundle_${options.year}.zip`,
        sha3_256: zipHash,
        size: zipData.byteLength,
        relativePath: `vk_bundle_${options.year}.zip`,
      },
    },
    ledgerSignature: null as
      | null
      | {
          scheme: 'ledger-hardware'
          fileName: string
          algorithm: string
          createdAt: string
          signerLabel: string
          signatureBase64: string
          sha3_256: string
          derivation_path: string
          publicKeyJwk: JsonWebKey
        },
    tools: {
      generator: 'Executive Console',
    },
    notes: [] as string[],
  }

  let signaturePath: string | null = null

  try {
    console.log('[VKNFT] Attempting to sign ZIP bundle with hash:', zipHash)
    const signature = await signZipBundle(zipHash)
    console.log('[VKNFT] Signature obtained:', signature.scheme, signature.algorithm)
    
    const signatureFileName = `vk_bundle_${options.year}.sig`
    const signaturePayload = {
      schema: 'tri-cert/signature@1',
      target: {
        path: `vk_bundle_${options.year}.zip`,
        sha3_256: zipHash,
      },
      signature,
    }

    manifest.ledgerSignature = {
      scheme: 'ledger-hardware',
      fileName: signatureFileName,
      algorithm: signature.algorithm,
      createdAt: signature.createdAt,
      signerLabel: signature.label,
      sha3_256: zipHash,
      signatureBase64: signature.signatureBase64,
      derivation_path: signature.derivation_path,
      publicKeyJwk: signature.publicKeyJwk,
    }

    signaturePath = await join(yearDir, signatureFileName)
    await writeFile(signaturePath, toBytes(JSON.stringify(signaturePayload, null, 2)))
    console.log('[VKNFT] Signature file written to:', signaturePath)
  } catch (error) {
    console.error('[VKNFT] Ledger signing failed. Bundle will be generated without signature.', error)
    manifest.notes.push(
      `Ledger signature unavailable: ${(error as Error).message ?? 'Unknown error'}`
    )
    manifest.ledgerSignature = null
    signaturePath = null
  }

  const manifestJson = JSON.stringify(manifest, null, 2)

  const wasmPath = await join(filesDir, options.wasm.fileName)
  const zkeyPath = await join(filesDir, options.zkey.fileName)
  const vkPath = await join(filesDir, options.vk.fileName)
  const manifestPath = await join(yearDir, 'manifest.json')
  const zipPath = await join(yearDir, `vk_bundle_${options.year}.zip`)
  const logPath = await join(yearDir, 'bundle.log')

  const logContent = [
    'Tri-CertFramework VKNFT Bundle',
    `Year: ${options.year}`,
    `Generated At: ${nowIso}`,
    '',
    'Hashes (SHA3-256):',
    `  wasm    : ${wasmHash}`,
    `  zkey    : ${zkeyHash}`,
    `  vk.json : ${vkHash}`,
    `  zip     : ${zipHash}`,
    '',
    manifest.ledgerSignature
      ? `Ledger signature: ${manifest.ledgerSignature.algorithm} by ${manifest.ledgerSignature.signerLabel} at ${manifest.ledgerSignature.createdAt}`
      : 'Ledger signature: unavailable',
  ].join('\n')

  console.log('[VKNFT] Writing files to disk...')
  
  try {
    await writeFile(wasmPath, options.wasm.data)
    console.log('[VKNFT] Written WASM:', wasmPath)
  } catch (error) {
    console.error('[VKNFT] Failed to write WASM file:', error)
    throw new Error(`Failed to write WASM file: ${error instanceof Error ? error.message : String(error)}`)
  }
  
  try {
    await writeFile(zkeyPath, options.zkey.data)
    console.log('[VKNFT] Written ZKey:', zkeyPath)
  } catch (error) {
    console.error('[VKNFT] Failed to write ZKey file:', error)
    throw new Error(`Failed to write ZKey file: ${error instanceof Error ? error.message : String(error)}`)
  }
  
  try {
    await writeFile(vkPath, vkBytes)
    console.log('[VKNFT] Written VK:', vkPath)
  } catch (error) {
    console.error('[VKNFT] Failed to write VK file:', error)
    throw new Error(`Failed to write VK file: ${error instanceof Error ? error.message : String(error)}`)
  }
  
  try {
    await writeFile(zipPath, zipData)
    console.log('[VKNFT] Written ZIP:', zipPath)
  } catch (error) {
    console.error('[VKNFT] Failed to write ZIP file:', error)
    throw new Error(`Failed to write ZIP file: ${error instanceof Error ? error.message : String(error)}`)
  }
  
  try {
    await writeFile(manifestPath, toBytes(manifestJson))
    console.log('[VKNFT] Written manifest:', manifestPath)
  } catch (error) {
    console.error('[VKNFT] Failed to write manifest file:', error)
    throw new Error(`Failed to write manifest file: ${error instanceof Error ? error.message : String(error)}`)
  }
  
  try {
    await writeFile(logPath, toBytes(logContent))
    console.log('[VKNFT] Written log:', logPath)
  } catch (error) {
    console.error('[VKNFT] Failed to write log file:', error)
    throw new Error(`Failed to write log file: ${error instanceof Error ? error.message : String(error)}`)
  }
  
  console.log('[VKNFT] Bundle generation completed successfully')
  console.log('[VKNFT] Summary:', {
    yearDir,
    filesCreated: ['wasm', 'zkey', 'vk.json', 'zip', 'manifest.json', 'log'],
    signatureCreated: signaturePath !== null
  })

  return {
    baseDir,
    yearDir,
    filesDir,
    zipPath,
    manifestPath,
    logPath,
    signaturePath,
  }
}

/**
 * Add or update signature for an existing VKNFT bundle
 */
export async function signExistingVknftBundle(year: number): Promise<{
  success: boolean
  signaturePath: string | null
  signatureScheme: 'ledger-hardware' | null
  error?: string
}> {
  console.log('[VKNFT] Signing existing bundle for year:', year)
  
  const baseDir = getSavedVknftBaseDir()
  if (!baseDir) {
    return {
      success: false,
      signaturePath: null,
      signatureScheme: null,
      error: 'VKNFT base directory not configured'
    }
  }
  
  const yearDir = await join(baseDir, String(year))
  const manifestPath = await join(yearDir, 'manifest.json')
  const zipPath = await join(yearDir, `vk_bundle_${year}.zip`)
  
  // Check if manifest and ZIP exist
  if (!(await exists(manifestPath)) || !(await exists(zipPath))) {
    return {
      success: false,
      signaturePath: null,
      signatureScheme: null,
      error: 'Manifest or ZIP file not found'
    }
  }
  
  try {
    // Read existing manifest
    const manifestBytes = await readFile(manifestPath)
    const manifestJson = new TextDecoder().decode(manifestBytes)
    const manifest = JSON.parse(manifestJson)
    
    // Read ZIP file and calculate hash
    const zipData = await readFile(zipPath)
    const zipHash = await sha3(zipData)
    
    console.log('[VKNFT] ZIP hash:', zipHash)
    
    // Sign the ZIP
    let signaturePath: string | null = null
    let signatureScheme: 'software' | 'ledger-hardware' | null = null
    
    try {
      const signature = await signZipBundle(zipHash)
      const signatureFileName = `vk_bundle_${year}.sig`
      const signaturePayload = {
        schema: 'tri-cert/signature@1',
        target: {
          path: `vk_bundle_${year}.zip`,
          sha3_256: zipHash,
        },
        signature,
      }
      
      signatureScheme = 'ledger-hardware'
      
      // Update manifest
      manifest.ledgerSignature = {
        scheme: 'ledger-hardware',
        fileName: signatureFileName,
        algorithm: signature.algorithm,
        createdAt: signature.createdAt,
        signerLabel: signature.label,
        sha3_256: zipHash,
        signatureBase64: signature.signatureBase64,
        derivation_path: signature.derivation_path,
        publicKeyJwk: signature.publicKeyJwk,
      }
      
      // Remove "signature unavailable" note if it exists
      if (manifest.notes) {
        manifest.notes = manifest.notes.filter((note: string) => 
          !note.includes('Ledger signature unavailable')
        )
      }
      
      // Write signature file
      signaturePath = await join(yearDir, signatureFileName)
      await writeFile(signaturePath, toBytes(JSON.stringify(signaturePayload, null, 2)))
      console.log('[VKNFT] Signature file written:', signaturePath)
      
      // Update manifest file
      await writeFile(manifestPath, toBytes(JSON.stringify(manifest, null, 2)))
      console.log('[VKNFT] Manifest updated with signature')
      
      return {
        success: true,
        signaturePath,
        signatureScheme,
      }
    } catch (signError) {
      console.error('[VKNFT] Failed to sign bundle:', signError)
      return {
        success: false,
        signaturePath: null,
        signatureScheme: null,
        error: signError instanceof Error ? signError.message : String(signError)
      }
    }
  } catch (error) {
    console.error('[VKNFT] Failed to read manifest or ZIP:', error)
    return {
      success: false,
      signaturePath: null,
      signatureScheme: null,
      error: error instanceof Error ? error.message : String(error)
    }
  }
}

function getSavedVknftBaseDir(): string | null {
  if (typeof localStorage === 'undefined') return null
  return localStorage.getItem(STORAGE_KEY)
}
