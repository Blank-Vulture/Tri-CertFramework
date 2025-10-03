import { exists, readFile, writeFile, copyFile } from '@tauri-apps/plugin-fs'
import { open } from '@tauri-apps/plugin-dialog'

export interface CircuitGenerationOptions {
  year: number
  projectRoot?: string | null
}

export interface CircuitGenerationResult {
  success: boolean
  wasmPath?: string
  zkeyPath?: string
  errors: string[]
  warnings: string[]
}

/**
 * Generate year-specific circuit files (wasm and zkey)
 * In Phase 0, this copies existing files with year-specific names
 */
export async function generateCircuitFiles(options: CircuitGenerationOptions): Promise<CircuitGenerationResult> {
  const { year } = options
  const errors: string[] = []
  const warnings: string[] = []
  let wasmPath: string | undefined = undefined
  let zkeyPath: string | undefined = undefined

  try {
    // Step 1: Find project root or ask user
    let projectRoot = options.projectRoot
    if (!projectRoot) {
      projectRoot = await findProjectRoot()
      if (!projectRoot) {
        return {
          success: false,
          errors: ['プロジェクトルートディレクトリを選択してください'],
          warnings
        }
      }
    }

    const circuitsPath = `${projectRoot}/circuits`
    const circuitsJsPath = `${circuitsPath}/commitment_js`

    // Step 2: Verify circuits directory structure
    const circuitsExists = await exists(circuitsPath)
    if (!circuitsExists) {
      errors.push(`Circuits directory not found: ${circuitsPath}`)
      return { success: false, errors, warnings }
    }

    // Step 3: Find base circuit files
    const baseWasmPath = `${circuitsJsPath}/commitment.wasm`
    const baseZkeyPath = `${circuitsPath}/commitment_final.zkey`

    const baseWasmExists = await exists(baseWasmPath)
    const baseZkeyExists = await exists(baseZkeyPath)

    if (!baseWasmExists || !baseZkeyExists) {
      // Try alternative locations
      const altWasmPath = `${circuitsPath}/build/commitment_js/commitment.wasm`
      const altZkeyPath = `${circuitsPath}/build/commitment_final.zkey`

      const altWasmExists = await exists(altWasmPath)
      const altZkeyExists = await exists(altZkeyPath)

      if (!altWasmExists && !altZkeyExists) {
        errors.push('Base circuit files not found. Please run circuit build first.')
        return { success: false, errors, warnings }
      }

      // Use alternative paths as base
      if (altWasmExists) {
        await copyFile(altWasmPath, baseWasmPath)
        warnings.push(`Copied wasm from build directory: ${altWasmPath}`)
      }
      if (altZkeyExists) {
        await copyFile(altZkeyPath, baseZkeyPath)
        warnings.push(`Copied zkey from build directory: ${altZkeyPath}`)
      }
    }

    // Step 4: Generate year-specific files
    try {
      // Create year-specific wasm file
      const yearWasmPath = `${circuitsJsPath}/commitment_${year}.wasm`
      const yearWasmExists = await exists(yearWasmPath)
      
      if (!yearWasmExists) {
        await copyFile(baseWasmPath, yearWasmPath)
        wasmPath = yearWasmPath
      } else {
        wasmPath = yearWasmPath
        warnings.push(`Year-specific wasm already exists: ${yearWasmPath}`)
      }

      // Create year-specific zkey file
      const yearZkeyPath = `${circuitsPath}/commitment_final_${year}.zkey`
      const yearZkeyExists = await exists(yearZkeyPath)
      
      if (!yearZkeyExists) {
        await copyFile(baseZkeyPath, yearZkeyPath)
        zkeyPath = yearZkeyPath
      } else {
        zkeyPath = yearZkeyPath
        warnings.push(`Year-specific zkey already exists: ${yearZkeyPath}`)
      }

      // Step 5: Update circuit manifest (for future use)
      const manifestPath = `${circuitsPath}/circuit_manifest.json`
      await updateCircuitManifest(manifestPath, year, wasmPath, zkeyPath)

    } catch (e) {
      errors.push(`Failed to generate year-specific circuit files: ${e}`)
    }

    return {
      success: errors.length === 0,
      wasmPath,
      zkeyPath,
      errors,
      warnings
    }

  } catch (e) {
    return {
      success: false,
      errors: [`Circuit generation failed: ${e}`],
      warnings
    }
  }
}

/**
 * Find project root directory
 */
async function findProjectRoot(): Promise<string | null> {
  try {
    const selected = await open({
      title: 'tri-CertFramework プロジェクトルートを選択してください',
      directory: true,
      multiple: false,
    })

    if (!selected || Array.isArray(selected)) {
      return null
    }

    // Verify it's a valid tri-CertFramework project
    const circuitsPath = `${selected}/circuits`
    const proverPath = `${selected}/prover`
    
    const isValidProject = await exists(circuitsPath) && await exists(proverPath)
    
    if (!isValidProject) {
      throw new Error('選択されたディレクトリは有効な tri-CertFramework プロジェクトではありません')
    }

    return selected
  } catch (e) {
    console.error('Failed to find project root:', e)
    return null
  }
}

/**
 * Update circuit manifest with year-specific entries
 */
async function updateCircuitManifest(manifestPath: string, year: number, wasmPath?: string, zkeyPath?: string): Promise<void> {
  try {
    let manifest: any = {}
    
    // Load existing manifest if it exists
    const manifestExists = await exists(manifestPath)
    if (manifestExists) {
      const manifestContent = await readFile(manifestPath)
      manifest = JSON.parse(new TextDecoder().decode(manifestContent))
    }

    // Initialize circuits array if it doesn't exist
    if (!manifest.circuits) {
      manifest.circuits = []
    }

    // Update or add year-specific entry
    const existingIndex = manifest.circuits.findIndex((c: any) => c.year === year)
    const circuitEntry = {
      year,
      circuit_id: `commitment_poseidon_${year}_v1`,
      wasm_path: wasmPath,
      zkey_path: zkeyPath,
      generated_at: new Date().toISOString(),
      status: 'generated'
    }

    if (existingIndex >= 0) {
      manifest.circuits[existingIndex] = circuitEntry
    } else {
      manifest.circuits.push(circuitEntry)
    }

    // Update manifest metadata
    manifest.schema = 'tri-cert/circuit-manifest@1'
    manifest.updated_at = new Date().toISOString()

    // Save manifest
    const manifestContent = JSON.stringify(manifest, null, 2)
    await writeFile(manifestPath, new TextEncoder().encode(manifestContent))

  } catch (e) {
    console.warn('Failed to update circuit manifest:', e)
    // Non-critical error, don't throw
  }
}

/**
 * Get circuit generation status for a year
 */
export async function getCircuitStatus(year: number, projectRoot: string): Promise<{
  wasmExists: boolean
  zkeyExists: boolean
  wasmPath?: string
  zkeyPath?: string
}> {
  try {
    const circuitsPath = `${projectRoot}/circuits`
    const circuitsJsPath = `${circuitsPath}/commitment_js`

    const wasmPath = `${circuitsJsPath}/commitment_${year}.wasm`
    const zkeyPath = `${circuitsPath}/commitment_final_${year}.zkey`

    const [wasmExists, zkeyExists] = await Promise.all([
      exists(wasmPath),
      exists(zkeyPath)
    ])

    return {
      wasmExists,
      zkeyExists,
      wasmPath: wasmExists ? wasmPath : undefined,
      zkeyPath: zkeyExists ? zkeyPath : undefined
    }
  } catch (e) {
    return { wasmExists: false, zkeyExists: false }
  }
}
