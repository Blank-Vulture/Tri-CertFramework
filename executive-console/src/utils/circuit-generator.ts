const WASM_ASSET_PATH = '/assets/commitment_js/commitment.wasm'
const ZKEY_ASSET_PATH = '/assets/commitment_final.zkey'

export interface CircuitGenerationOptions {
  year: number
}

export interface CircuitGenerationResult {
  success: boolean
  wasmFileName?: string
  wasmData?: Uint8Array
  zkeyFileName?: string
  zkeyData?: Uint8Array
  errors: string[]
  warnings: string[]
}

async function fetchAsset(path: string): Promise<Uint8Array> {
  const response = await fetch(path)
  if (!response.ok) {
    throw new Error(`${path} の取得に失敗しました (${response.status})`)
  }
  const buffer = await response.arrayBuffer()
  return new Uint8Array(buffer)
}

/**
 * Phase 0: reuse bundled circuit artifacts and provide year-specific filenames.
 */
export async function generateCircuitFiles(options: CircuitGenerationOptions): Promise<CircuitGenerationResult> {
  const { year } = options
  const errors: string[] = []
  const warnings: string[] = []

  try {
    const [wasmData, zkeyData] = await Promise.all([
      fetchAsset(WASM_ASSET_PATH),
      fetchAsset(ZKEY_ASSET_PATH),
    ])

    return {
      success: true,
      wasmFileName: `commitment_${year}.wasm`,
      wasmData,
      zkeyFileName: `commitment_final_${year}.zkey`,
      zkeyData,
      errors,
      warnings,
    }
  } catch (e) {
    errors.push(`回路アーティファクトの取得に失敗しました: ${e}`)
    return {
      success: false,
      errors,
      warnings,
    }
  }
}

export const circuitAssets = {
  wasm: WASM_ASSET_PATH,
  zkey: ZKEY_ASSET_PATH,
}
