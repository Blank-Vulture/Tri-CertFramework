import { exists, copyFile, writeFile } from '@tauri-apps/plugin-fs'
import { open } from '@tauri-apps/plugin-dialog'
import type { VKInfo } from '../App'

export interface ProverDeploymentOptions {
  vk: VKInfo
  projectRoot?: string | null
}

export interface ProverDeploymentResult {
  success: boolean
  deployedFiles: string[]
  errors: string[]
}

/**
 * Deploy VKey and related files to prover
 */
export async function deployToProver(options: ProverDeploymentOptions): Promise<ProverDeploymentResult> {
  const { vk } = options
  const deployedFiles: string[] = []
  const errors: string[] = []

  try {
    // Step 1: Find project root or ask user
    let projectRoot = options.projectRoot
    if (!projectRoot) {
      projectRoot = await findProjectRoot()
      if (!projectRoot) {
        return {
          success: false,
          deployedFiles: [],
          errors: ['プロジェクトルートディレクトリを選択してください']
        }
      }
    }

    console.log('Selected project root:', projectRoot)

    const proverPublicPath = `${projectRoot}/prover/public`
    const proverJsPath = `${proverPublicPath}/commitment_js`
    const circuitsPath = `${projectRoot}/circuits`

    console.log('Target paths:', { proverPublicPath, proverJsPath, circuitsPath })

    // Step 2: Verify prover directory structure
    try {
      const proverExists = await exists(proverPublicPath)
      if (!proverExists) {
        errors.push(`Prover public directory not found: ${proverPublicPath}`)
        return { success: false, deployedFiles, errors }
      }
      console.log('Prover public directory exists')
    } catch (e) {
      errors.push(`Failed to check prover directory: ${e}`)
      return { success: false, deployedFiles, errors }
    }

    try {
      const jsExists = await exists(proverJsPath)
      if (!jsExists) {
        errors.push(`Prover commitment_js directory not found: ${proverJsPath}`)
        return { success: false, deployedFiles, errors }
      }
      console.log('Prover commitment_js directory exists')
    } catch (e) {
      errors.push(`Failed to check commitment_js directory: ${e}`)
      return { success: false, deployedFiles, errors }
    }

    // Step 3: Deploy VKey file
    const vkeyPath = `${proverPublicPath}/vkey_${vk.year}.json`
    try {
      console.log('Attempting to write VKey to:', vkeyPath)
      const vkeyContent = JSON.stringify(vk.vkey, null, 2)
      await writeFile(vkeyPath, new TextEncoder().encode(vkeyContent))
      deployedFiles.push(vkeyPath)
      console.log('VKey file written successfully')
    } catch (e) {
      console.error('VKey write error details:', e)
      errors.push(`Failed to deploy VKey to ${vkeyPath}: ${e}`)
    }

    // Step 4: Deploy year-specific circuit files
    try {
      // Copy base files to year-specific names if they don't exist
      const baseWasmPath = `${proverJsPath}/commitment.wasm`
      const yearWasmPath = `${proverJsPath}/commitment_${vk.year}.wasm`
      
      const baseZkeyPath = `${proverPublicPath}/commitment_final.zkey`
      const yearZkeyPath = `${proverPublicPath}/commitment_final_${vk.year}.zkey`

      // Check if base files exist
      const baseWasmExists = await exists(baseWasmPath)
      const baseZkeyExists = await exists(baseZkeyPath)

      if (!baseWasmExists || !baseZkeyExists) {
        // Try to find files in circuits directory
        const circuitsWasmPath = `${circuitsPath}/commitment_js/commitment.wasm`
        const circuitsZkeyPath = `${circuitsPath}/commitment_final.zkey`

        if (await exists(circuitsWasmPath) && await exists(circuitsZkeyPath)) {
          // Copy from circuits to prover
          if (!baseWasmExists) {
            await copyFile(circuitsWasmPath, baseWasmPath)
            deployedFiles.push(baseWasmPath)
          }
          if (!baseZkeyExists) {
            await copyFile(circuitsZkeyPath, baseZkeyPath)
            deployedFiles.push(baseZkeyPath)
          }
        } else {
          errors.push('Base circuit files not found in circuits directory')
        }
      }

      // Copy to year-specific files
      const yearWasmExists = await exists(yearWasmPath)
      const yearZkeyExists = await exists(yearZkeyPath)

      if (!yearWasmExists && await exists(baseWasmPath)) {
        await copyFile(baseWasmPath, yearWasmPath)
        deployedFiles.push(yearWasmPath)
      }

      if (!yearZkeyExists && await exists(baseZkeyPath)) {
        await copyFile(baseZkeyPath, yearZkeyPath)
        deployedFiles.push(yearZkeyPath)
      }

    } catch (e) {
      errors.push(`Failed to deploy circuit files: ${e}`)
    }

    return {
      success: errors.length === 0,
      deployedFiles,
      errors
    }

  } catch (e) {
    return {
      success: false,
      deployedFiles,
      errors: [`Deployment failed: ${e}`]
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
    const proverPath = `${selected}/prover`
    const circuitsPath = `${selected}/circuits`
    
    const isValidProject = await exists(proverPath) && await exists(circuitsPath)
    
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
 * Get deployment status for a VKey
 */
export async function getDeploymentStatus(vk: VKInfo, projectRoot: string): Promise<{
  vkeyDeployed: boolean
  wasmDeployed: boolean
  zkeyDeployed: boolean
}> {
  try {
    const proverPublicPath = `${projectRoot}/prover/public`
    const proverJsPath = `${proverPublicPath}/commitment_js`

    const vkeyPath = `${proverPublicPath}/vkey_${vk.year}.json`
    const wasmPath = `${proverJsPath}/commitment_${vk.year}.wasm`
    const zkeyPath = `${proverPublicPath}/commitment_final_${vk.year}.zkey`

    const [vkeyDeployed, wasmDeployed, zkeyDeployed] = await Promise.all([
      exists(vkeyPath),
      exists(wasmPath),
      exists(zkeyPath)
    ])

    return { vkeyDeployed, wasmDeployed, zkeyDeployed }
  } catch {
    return { vkeyDeployed: false, wasmDeployed: false, zkeyDeployed: false }
  }
}
