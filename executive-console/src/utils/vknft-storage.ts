import { readDir, readFile, exists, remove, mkdir } from '@tauri-apps/plugin-fs'
import { invoke } from '@tauri-apps/api/core'
import { join } from '@tauri-apps/api/path'
import type { VKInfo, VerificationKey } from '../App'

const BASE_DIR_STORAGE_KEY = 'tricert.vknft.baseDir'
const decoder = new TextDecoder()

function isTauri(): boolean {
  if (typeof window === 'undefined') {
    return false
  }
  // Tauri v2 may use __TAURI_INTERNALS__ instead of __TAURI__
  return '__TAURI_INTERNALS__' in window || '__TAURI__' in window || 
         navigator.userAgent.includes('Tauri')
}

interface ManifestFileEntry {
  fileName: string
  sha3_256: string
  size: number
  relativePath: string
  declaredHash?: string
}

interface ManifestLedgerSignatureSoftware {
  scheme: 'software'
  fileName: string
  algorithm: string
  createdAt: string
  signerLabel: string
  signatureBase64: string
  sha3_256: string
  publicKeyJwk: JsonWebKey
}

interface ManifestLedgerSignatureHardware {
  scheme: 'webauthn'
  fileName: string
  algorithm: string
  createdAt: string
  signerLabel: string
  signatureBase64: string
  sha3_256: string
  credentialId: string
  authenticatorDataBase64: string
  clientDataJSONBase64: string
  publicKeyJwk: JsonWebKey
}

interface VknftManifest {
  schema: string
  version: number
  year: number
  generatedAt: string
  files: {
    wasm: ManifestFileEntry
    zkey: ManifestFileEntry
    vk: ManifestFileEntry & { declaredHash?: string }
    zip: ManifestFileEntry
  }
  ledgerSignature:
    | ManifestLedgerSignatureSoftware
    | ManifestLedgerSignatureHardware
    | null
}

function splitRelativePath(relativePath: string): string[] {
  return relativePath.split('/').filter(Boolean)
}

export function getSavedVknftBaseDir(): string | null {
  return localStorage.getItem(BASE_DIR_STORAGE_KEY)
}

/**
 * Get VKNFT base directory, trying automatic detection first
 */
export async function getVknftBaseDir(): Promise<string | null> {
  // Try automatic path from Tauri backend
  try {
    const autoPath = await invoke<string>('get_vknft_base_path')
    if (autoPath) {
      // Ensure directory exists
      const dirExists = await exists(autoPath)
      if (!dirExists) {
        await mkdir(autoPath, { recursive: true })
      }
      localStorage.setItem(BASE_DIR_STORAGE_KEY, autoPath)
      return autoPath
    }
  } catch (error) {
    console.warn('[VKNFT Storage] Failed to get automatic path:', error)
  }
  
  // Fallback to saved path
  return getSavedVknftBaseDir()
}

async function readJsonFile<T>(path: string): Promise<T> {
  const bytes = await readFile(path)
  return JSON.parse(decoder.decode(bytes)) as T
}

async function readBinaryFile(path: string): Promise<Uint8Array> {
  return readFile(path)
}

export async function loadVkInfosFromVknft(): Promise<VKInfo[]> {
  if (!isTauri()) {
    return []
  }
  
  const baseDir = await getVknftBaseDir()
  if (!baseDir || !(await exists(baseDir))) {
    return []
  }

  const entries = await readDir(baseDir)
  const result: VKInfo[] = []

  for (const entry of entries) {
    if (!entry.name) continue
    
    // Skip hidden files, system files, and non-directory entries
    if (
      entry.name.startsWith('.') ||          // Hidden files (.DS_Store, .gitkeep, etc.)
      entry.name === 'node_modules' ||       // npm directory
      entry.name === 'Thumbs.db' ||          // Windows thumbnail cache
      !entry.isDirectory                     // Skip files, only process directories
    ) {
      continue
    }
    
    // Skip non-numeric directory names (year directories should be numbers)
    const potentialYear = Number(entry.name)
    if (Number.isNaN(potentialYear) || potentialYear < 2000 || potentialYear > 2100) {
      continue
    }

    try {
      const yearDir = await join(baseDir, entry.name)
      const manifestPath = await join(yearDir, 'manifest.json')
      if (!(await exists(manifestPath))) {
        continue
      }

      const manifest = await readJsonFile<VknftManifest>(manifestPath)
      const year = typeof manifest.year === 'number' ? manifest.year : Number(entry.name)
      if (!year || Number.isNaN(year)) continue

      const wasmPath = await join(yearDir, ...splitRelativePath(manifest.files.wasm.relativePath))
      const zkeyPath = await join(yearDir, ...splitRelativePath(manifest.files.zkey.relativePath))
      const vkPath = await join(yearDir, ...splitRelativePath(manifest.files.vk.relativePath))
      const zipPath = await join(yearDir, ...splitRelativePath(manifest.files.zip.relativePath))
      let signaturePath: string | null = null
      if (manifest.ledgerSignature) {
        const candidate = await join(yearDir, manifest.ledgerSignature.fileName)
        signaturePath = (await exists(candidate)) ? candidate : null
      }

      if (!(await exists(wasmPath)) || !(await exists(zkeyPath)) || !(await exists(vkPath))) {
        console.warn('VKNFT bundle missing files', yearDir)
        continue
      }

      const wasmData = await readBinaryFile(wasmPath)
      const zkeyData = await readBinaryFile(zkeyPath)
      const vkContent = decoder.decode(await readBinaryFile(vkPath))
      const vkJson = JSON.parse(vkContent) as VerificationKey

      const vkeyHash = manifest.files.vk.declaredHash ?? `sha3-256:${manifest.files.vk.sha3_256}`
      const circuitId =
        vkJson.metadata?.circuit_id ?? `commitment_poseidon_${year}_v1`

      result.push({
        year,
        vkey: vkJson,
        vkeyHash,
        createdAt: manifest.generatedAt ?? new Date().toISOString(),
        circuitId,
        artifacts: {
          wasm: {
            fileName: manifest.files.wasm.fileName,
            data: wasmData,
          },
          zkey: {
            fileName: manifest.files.zkey.fileName,
            data: zkeyData,
          },
        },
        bundlePath: zipPath,
        manifestPath,
        signaturePath: signaturePath ?? undefined,
      })
    } catch (error) {
      console.error('Failed to load VKNFT manifest', entry.name, error)
      continue
    }
  }

  // sort by year ascending
  result.sort((a, b) => a.year - b.year)
  return result
}

export async function deleteVknftYear(year: number): Promise<void> {
  if (!isTauri()) return
  const baseDir = await getVknftBaseDir()
  if (!baseDir) return

  const yearDir = await join(baseDir, String(year))
  if (!(await exists(yearDir))) return

  await remove(yearDir, { recursive: true })
}

/**
 * Get list of available years from VKNFT directory
 */
export async function getAvailableYears(): Promise<number[]> {
  if (!isTauri()) return []
  
  const baseDir = await getVknftBaseDir()
  if (!baseDir || !(await exists(baseDir))) {
    return []
  }
  
  const entries = await readDir(baseDir)
  const years: number[] = []
  
  for (const entry of entries) {
    if (!entry.name || !entry.isDirectory) continue
    if (entry.name.startsWith('.')) continue
    
    const year = Number(entry.name)
    if (!Number.isNaN(year) && year >= 2000 && year <= 2100) {
      // Verify manifest exists
      const yearDir = await join(baseDir, entry.name)
      const manifestPath = await join(yearDir, 'manifest.json')
      if (await exists(manifestPath)) {
        years.push(year)
      }
    }
  }
  
  return years.sort((a, b) => a - b)
}
