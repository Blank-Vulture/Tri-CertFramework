import React, { useEffect, useState } from 'react'
import type { VKInfo, VerificationKey } from '../App'
import { saveBinaryFile, saveJsonFile, saveTextFile, saveZipFile } from '../utils/download'
import { deployToProver } from '../utils/prover-deployment'
import { signExistingVknftBundle } from '../utils/vknft-bundle'

interface VKManagerProps {
  vkList: VKInfo[]
  onVKDelete: (vk: VKInfo) => Promise<void> | void
  onVKImport: (vk: VKInfo) => void
  onRefresh?: () => Promise<void> | void
}

const VKManager: React.FC<VKManagerProps> = ({ vkList, onVKDelete, onVKImport, onRefresh }) => {
  const [selectedVK, setSelectedVK] = useState<VKInfo | null>(null)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<number | null>(null)
  const [isImporting, setIsImporting] = useState(false)
  const [deployingVK, setDeployingVK] = useState<number | null>(null)
  const [deploymentResult, setDeploymentResult] = useState<{
    success: boolean
    message: string
    files: string[]
  } | null>(null)
  const [signingVK, setSigningVK] = useState<number | null>(null)
  const [signatureResult, setSignatureResult] = useState<{
    success: boolean
    message: string
    scheme: 'ledger-hardware' | null
  } | null>(null)

  useEffect(() => {
    onRefresh?.()
  }, [onRefresh])

  const downloadVKFile = async (vk: VKInfo) => {
    try {
      await saveJsonFile(`vkey_${vk.year}.json`, vk.vkey)
    } catch (e) {
      console.error('Failed to save VK file', e)
    }
  }

  const downloadVKHash = async (vk: VKInfo) => {
    try {
      await saveTextFile(`vkey_hash_${vk.year}.txt`, vk.vkeyHash)
    } catch (e) {
      console.error('Failed to save VK hash', e)
    }
  }

  const downloadCircuitArtifact = async (vk: VKInfo, type: 'wasm' | 'zkey') => {
    const artifacts = vk.artifacts?.[type]
    if (!artifacts) {
      console.warn('No artifact data to download for', type, vk.year)
      return
    }

    const description = type === 'wasm' ? 'WASM' : 'ZKey'
    const extension = type
    await saveBinaryFile(artifacts.fileName, artifacts.data, { description, extension })
  }

  const downloadVkBundle = async (vk: VKInfo) => {
    const encoder = new TextEncoder()
    const entries = [
      {
        name: `vkey_${vk.year}.json`,
        data: encoder.encode(JSON.stringify(vk.vkey, null, 2)),
      }
    ]

    if (vk.artifacts?.wasm) {
      entries.push({ name: vk.artifacts.wasm.fileName, data: vk.artifacts.wasm.data })
    }
    if (vk.artifacts?.zkey) {
      entries.push({ name: vk.artifacts.zkey.fileName, data: vk.artifacts.zkey.data })
    }

    await saveZipFile(`vk_${vk.year}_bundle.zip`, entries)
  }

  const deployVKToProver = async (vk: VKInfo, index: number) => {
    try {
      setDeployingVK(index)
      setDeploymentResult(null)

      const result = await deployToProver({ vk })

      if (result.success) {
        setDeploymentResult({
          success: true,
          message: `${vk.year}年度のVKとファイルをProverに正常に配置しました！`,
          files: result.deployedFiles
        })
      } else {
        setDeploymentResult({
          success: false,
          message: 'Proverへの配置に失敗しました: ' + result.errors.join(', '),
          files: result.deployedFiles
        })
      }
    } catch (e) {
      console.error('Failed to deploy to prover', e)
      setDeploymentResult({
        success: false,
        message: 'Proverへの配置中にエラーが発生しました: ' + (e as Error).message,
        files: []
      })
    } finally {
      setDeployingVK(null)
      // Auto-hide result after 5 seconds
      setTimeout(() => setDeploymentResult(null), 5000)
    }
  }

  const signVKBundle = async (vk: VKInfo, index: number) => {
    try {
      setSigningVK(index)
      setSignatureResult(null)

      const result = await signExistingVknftBundle(vk.year)

      if (result.success) {
        setSignatureResult({
          success: true,
          message: `${vk.year}年度のVKバンドルにLedger署名を追加しました！`,
          scheme: result.signatureScheme
        })
        // Refresh VK list to reflect signature status
        await onRefresh?.()
      } else {
        setSignatureResult({
          success: false,
          message: '署名に失敗しました: ' + (result.error || '不明なエラー'),
          scheme: null
        })
      }
    } catch (e) {
      console.error('Failed to sign VK bundle', e)
      setSignatureResult({
        success: false,
        message: '署名中にエラーが発生しました: ' + (e as Error).message,
        scheme: null
      })
    } finally {
      setSigningVK(null)
      // Auto-hide result after 5 seconds
      setTimeout(() => setSignatureResult(null), 5000)
    }
  }

  const downloadAllVKs = async () => {
    const encoder = new TextEncoder()
    const manifest = {
      schema: 'tri-cert/vk-bundle@1',
      generatedAt: new Date().toISOString(),
      items: vkList.map(vk => ({
        year: vk.year,
        vkeyHash: vk.vkeyHash,
        circuitId: vk.circuitId,
        createdAt: vk.createdAt,
        hasArtifacts: Boolean(vk.artifacts),
        wasmFileName: vk.artifacts?.wasm.fileName ?? null,
        zkeyFileName: vk.artifacts?.zkey.fileName ?? null,
      })),
    }

    const entries = [
      {
        name: 'vk_bundle_manifest.json',
        data: encoder.encode(JSON.stringify(manifest, null, 2)),
      },
    ]

    vkList.forEach((vk) => {
      const basePath = `vk_${vk.year}`
      entries.push({
        name: `${basePath}/vkey_${vk.year}.json`,
        data: encoder.encode(JSON.stringify(vk.vkey, null, 2)),
      })

      if (vk.artifacts?.wasm) {
        entries.push({ name: `${basePath}/${vk.artifacts.wasm.fileName}`, data: vk.artifacts.wasm.data })
      }
      if (vk.artifacts?.zkey) {
        entries.push({ name: `${basePath}/${vk.artifacts.zkey.fileName}`, data: vk.artifacts.zkey.data })
      }
    })

    try {
      await saveZipFile('vk_bundle_verified.zip', entries)
    } catch (e) {
      console.error('Failed to save all VKs', e)
    }
  }

  const calculateVKeyHash = async (vkey: VerificationKey): Promise<string> => {
    const crypto = await import('crypto-js')
    const canonicalJson = JSON.stringify(vkey, Object.keys(vkey).sort())
    return crypto.SHA3(canonicalJson, { outputLength: 256 }).toString()
  }

  const inferYear = (vkey: VerificationKey, filename?: string): number | null => {
    // Try metadata.graduation_year
    if (typeof vkey?.metadata?.graduation_year === 'number') return vkey.metadata.graduation_year
    // Try circuit_id like commitment_poseidon_2025_v1
    const cid: string | undefined = vkey?.metadata?.circuit_id || vkey?.circuit_id
    const m = typeof cid === 'string' ? cid.match(/(\d{4})/) : null
    if (m) return parseInt(m[1], 10)
    // Try filename
    if (filename) {
      const fm = filename.match(/(\d{4})/)
      if (fm) return parseInt(fm[1], 10)
    }
    return null
  }

  const handleImportFile = async (file: File) => {
    try {
      setIsImporting(true)
      const json = JSON.parse(await file.text())
      const vkeyHash = await calculateVKeyHash(json)
      let year = inferYear(json, file.name)
      if (!year || year < 2000 || year > 2050) {
        const input = window.prompt('インポートするVKの年度を入力してください (2000-2050):')
        if (!input) {
          setIsImporting(false)
          return
        }
        const y = parseInt(input.replace(/[^0-9]/g, ''), 10)
        if (!y || y < 2000 || y > 2050) throw new Error('不正な年度です')
        year = y
      }

      const circuitId = json?.metadata?.circuit_id || `commitment_poseidon_${year}_v1`
      const vkInfo: VKInfo = {
        year,
        vkey: json,
        vkeyHash: `sha3-256:${vkeyHash}`,
        createdAt: new Date().toISOString(),
        circuitId,
      }
      onVKImport(vkInfo)
    } catch (e) {
      console.error('VK import failed', e)
      alert('VKのインポートに失敗しました: ' + (e as Error).message)
    } finally {
      setIsImporting(false)
    }
  }

  const confirmDelete = async (index: number) => {
    const target = vkList[index]
    if (!target) {
      setShowDeleteConfirm(null)
      return
    }
    try {
      await onVKDelete(target)
    } finally {
      setShowDeleteConfirm(null)
    }
  }

  const formatDate = (isoString: string) => {
    return new Date(isoString).toLocaleString('ja-JP', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  if (vkList.length === 0) {
    return (
      <div className="text-center py-12 text-slate-900 dark:!text-slate-100" data-empty-state>
        <div className="mx-auto h-24 w-24 rounded-full bg-gray-100 dark:bg-slate-800 p-6">
          <svg className="h-full w-full text-gray-400 dark:text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
          </svg>
        </div>
        <h3 className="mt-6 text-lg font-medium">生成されたVKがありません</h3>
        <p className="mt-2">「VK 生成」タブから年度別の検証鍵を作成してください。</p>
      </div>
    )
  }

  return (
    <div className="space-y-8">
      {/* Summary Card */}
      <div className="relative overflow-hidden rounded-3xl surface border border-subtle shadow-xl shadow-black/20">
        <div className="p-8 sm:p-10">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-2xl font-bold text-fg">検証鍵管理</h2>
              <p className="mt-2 muted">
                生成された年度別検証鍵の管理・エクスポート
              </p>
            </div>
            <div className="flex items-center gap-2">
              <label className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-lg shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 cursor-pointer">
                <input
                  type="file"
                  accept=".json,application/json"
                  className="sr-only"
                  onChange={(e) => e.target.files?.[0] && handleImportFile(e.target.files[0])}
                  disabled={isImporting}
                />
                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v16c0 1.1.9 2 2 2h12a2 2 0 002-2V8l-6-4H6a2 2 0 00-2 2z" />
                </svg>
                VKインポート
              </label>
              {vkList.length > 0 && (
                <button
                  onClick={downloadAllVKs}
                  className="inline-flex items-center px-4 py-2 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                >
                  <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  検証ずみバンドルをエクスポート
                </button>
              )}
            </div>
          </div>

          {/* Statistics */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <div className="h-8 w-8 rounded bg-blue-100 dark:bg-blue-800 p-2">
                    <svg className="h-full w-full text-blue-600 dark:text-blue-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
                    </svg>
                  </div>
                </div>
                <div className="ml-3">
                  <p className="text-sm font-medium text-blue-900 dark:text-blue-200">総VK数</p>
                  <p className="text-2xl font-bold text-blue-600 dark:text-blue-300">{vkList.length}</p>
                </div>
              </div>
            </div>

            <div className="bg-green-50 dark:bg-green-900/20 rounded-lg p-4">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <div className="h-8 w-8 rounded bg-green-100 dark:bg-green-800 p-2">
                    <svg className="h-full w-full text-green-600 dark:text-green-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3a2 2 0 012-2h4l2 2h4a2 2 0 012 2v1M8 7v8a2 2 0 002 2h8a2 2 0 002-2V9a2 2 0 00-2-2h-2M8 7H6a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2v-1" />
                    </svg>
                  </div>
                </div>
                <div className="ml-3">
                  <p className="text-sm font-medium text-green-900 dark:text-green-200">対象年度範囲</p>
                  <p className="text-2xl font-bold text-green-600 dark:text-green-300">
                    {Math.min(...vkList.map(vk => vk.year))}-{Math.max(...vkList.map(vk => vk.year))}
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-purple-50 dark:bg-purple-900/20 rounded-lg p-4">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <div className="h-8 w-8 rounded bg-purple-100 dark:bg-purple-800 p-2">
                    <svg className="h-full w-full text-purple-600 dark:text-purple-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                </div>
                <div className="ml-3">
                  <p className="text-sm font-medium text-purple-900 dark:text-purple-200">最新生成</p>
                  <p className="text-sm font-bold text-purple-600 dark:text-purple-300">
                    {formatDate(vkList[vkList.length - 1]?.createdAt)}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Deployment Result Notification */}
      {deploymentResult && (
        <div className={`relative overflow-hidden rounded-3xl border shadow-xl shadow-black/20 ${
          deploymentResult.success 
            ? 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800'
            : 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800'
        }`}>
          <div className="p-6">
            <div className="flex items-start">
              <div className="flex-shrink-0">
                {deploymentResult.success ? (
                  <svg className="h-6 w-6 text-green-600 dark:text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                ) : (
                  <svg className="h-6 w-6 text-red-600 dark:text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                  </svg>
                )}
              </div>
              <div className="ml-3 flex-1">
                <h3 className={`text-sm font-medium ${
                  deploymentResult.success 
                    ? 'text-green-900 dark:text-green-100'
                    : 'text-red-900 dark:text-red-100'
                }`}>
                  {deploymentResult.success ? 'Prover配置完了' : 'Prover配置失敗'}
                </h3>
                <p className={`mt-1 text-sm ${
                  deploymentResult.success 
                    ? 'text-green-700 dark:text-green-200'
                    : 'text-red-700 dark:text-red-200'
                }`}>
                  {deploymentResult.message}
                </p>
                {deploymentResult.files.length > 0 && (
                  <div className="mt-2">
                    <p className={`text-xs font-medium ${
                      deploymentResult.success 
                        ? 'text-green-800 dark:text-green-100'
                        : 'text-red-800 dark:text-red-100'
                    }`}>
                      配置されたファイル:
                    </p>
                    <ul className={`mt-1 text-xs ${
                      deploymentResult.success 
                        ? 'text-green-600 dark:text-green-300'
                        : 'text-red-600 dark:text-red-300'
                    } font-mono`}>
                      {deploymentResult.files.map((file, i) => (
                        <li key={i}>• {file}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
              <button
                onClick={() => setDeploymentResult(null)}
                className={`ml-3 ${
                  deploymentResult.success 
                    ? 'text-green-400 hover:text-green-500 dark:text-green-300 dark:hover:text-green-200'
                    : 'text-red-400 hover:text-red-500 dark:text-red-300 dark:hover:text-red-200'
                }`}
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Signature Result Notification */}
      {signatureResult && (
        <div className={`relative overflow-hidden rounded-3xl border shadow-xl shadow-black/20 ${
          signatureResult.success 
            ? 'bg-purple-50 dark:bg-purple-900/20 border-purple-200 dark:border-purple-800'
            : 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800'
        }`}>
          <div className="p-6">
            <div className="flex items-start">
              <div className="flex-shrink-0">
                {signatureResult.success ? (
                  <svg className="h-6 w-6 text-purple-600 dark:text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                  </svg>
                ) : (
                  <svg className="h-6 w-6 text-red-600 dark:text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                  </svg>
                )}
              </div>
              <div className="ml-3 flex-1">
                <h3 className={`text-sm font-medium ${
                  signatureResult.success 
                    ? 'text-purple-900 dark:text-purple-100'
                    : 'text-red-900 dark:text-red-100'
                }`}>
                  {signatureResult.success ? '署名完了' : '署名失敗'}
                </h3>
                <p className={`mt-1 text-sm ${
                  signatureResult.success 
                    ? 'text-purple-700 dark:text-purple-200'
                    : 'text-red-700 dark:text-red-200'
                }`}>
                  {signatureResult.message}
                </p>
                {signatureResult.success && signatureResult.scheme && (
                  <div className="mt-2">
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-800 dark:bg-purple-800 dark:text-purple-100">
                      🔐 Ledger Hardware
                    </span>
                  </div>
                )}
              </div>
              <button
                onClick={() => setSignatureResult(null)}
                className={`ml-3 ${
                  signatureResult.success 
                    ? 'text-purple-400 hover:text-purple-500 dark:text-purple-300 dark:hover:text-purple-200'
                    : 'text-red-400 hover:text-red-500 dark:text-red-300 dark:hover:text-red-200'
                }`}
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* VK List */}
      <div className="relative overflow-hidden rounded-3xl surface border border-subtle shadow-xl shadow-black/20">
        <div className="p-8 sm:p-10">
          <h3 className="text-lg font-medium text-fg mb-6">年度別検証鍵一覧</h3>
          
          <div className="grid gap-4">
            {vkList.map((vk, index) => {
              const hasArtifacts = Boolean(vk.artifacts)
              return (
                <div key={index} className="border border-gray-200 dark:border-slate-700 rounded-lg p-4 hover:bg-gray-50 dark:hover:bg-slate-800 transition-colors">
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="flex items-center space-x-4">
                        <div className="flex-shrink-0">
                          <div className="h-10 w-10 rounded-lg bg-blue-100 dark:bg-blue-800 flex items-center justify-center">
                          <span className="text-sm font-bold text-blue-600 dark:text-blue-300">{vk.year}</span>
                        </div>
                      </div>
                      <div className="flex-1 min-w-0">
                        <h4 className="text-sm font-medium text-fg">
                          {vk.year}年度用検証鍵
                        </h4>
                        <p className="text-sm muted font-mono truncate">
                          {vk.circuitId}
                        </p>
                        <p className="text-xs muted mt-1">
                          作成: {formatDate(vk.createdAt)}
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center space-x-2">
                    <button onClick={() => setSelectedVK(vk)} className="inline-flex items-center px-3 py-1.5 border border-gray-300 dark:border-slate-700 shadow-sm text-xs font-medium rounded text-gray-700 dark:text-slate-300 bg-white dark:bg-slate-800 hover:bg-gray-50 dark:hover:bg-slate-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500">
                      詳細
                    </button>
                    <button
                      onClick={() => downloadVKFile(vk)}
                      className="inline-flex items-center px-3 py-1.5 border border-transparent text-xs font-medium rounded text-blue-700 bg-blue-100 hover:bg-blue-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                    >
                      VK DL
                    </button>
                    <button
                      onClick={() => downloadCircuitArtifact(vk, 'wasm')}
                      disabled={!hasArtifacts}
                      className={`inline-flex items-center px-3 py-1.5 border border-transparent text-xs font-medium rounded ${
                        hasArtifacts
                          ? 'text-indigo-700 bg-indigo-100 hover:bg-indigo-200'
                          : 'text-indigo-300 bg-indigo-50 cursor-not-allowed'
                      } focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:focus:ring-0`}
                    >
                      WASM
                    </button>
                    <button
                      onClick={() => downloadCircuitArtifact(vk, 'zkey')}
                      disabled={!hasArtifacts}
                      className={`inline-flex items-center px-3 py-1.5 border border-transparent text-xs font-medium rounded ${
                        hasArtifacts
                          ? 'text-purple-700 bg-purple-100 hover:bg-purple-200'
                          : 'text-purple-300 bg-purple-50 cursor-not-allowed'
                      } focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500 disabled:focus:ring-0`}
                    >
                      ZKey
                    </button>
                    <button
                      onClick={() => downloadVkBundle(vk)}
                      className="inline-flex items-center px-3 py-1.5 border border-transparent text-xs font-medium rounded text-slate-700 bg-slate-100 hover:bg-slate-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-slate-500"
                    >
                      ZIP
                    </button>
                    <button
                      onClick={() => deployVKToProver(vk, index)}
                      disabled={deployingVK === index}
                      className="inline-flex items-center px-3 py-1.5 border border-transparent text-xs font-medium rounded text-purple-700 bg-purple-100 hover:bg-purple-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {deployingVK === index ? (
                        <>
                          <svg className="animate-spin -ml-1 mr-1 h-3 w-3 text-purple-700" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                          </svg>
                          配置中
                        </>
                      ) : (
                        'Proverに配置'
                      )}
                    </button>
                    <button
                      onClick={() => signVKBundle(vk, index)}
                      disabled={signingVK === index}
                      className="inline-flex items-center px-3 py-1.5 border border-transparent text-xs font-medium rounded text-amber-700 bg-amber-100 hover:bg-amber-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-amber-500 disabled:opacity-50 disabled:cursor-not-allowed"
                      title={vk.signaturePath ? '署名を更新' : '署名を追加'}
                    >
                      {signingVK === index ? (
                        <>
                          <svg className="animate-spin -ml-1 mr-1 h-3 w-3 text-amber-700" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                          </svg>
                          署名中
                        </>
                      ) : (
                        <>
                          <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                          </svg>
                          {vk.signaturePath ? '再署名' : '署名'}
                        </>
                      )}
                    </button>
                    <button
                      onClick={() => downloadVKHash(vk)}
                      className="inline-flex items-center px-3 py-1.5 border border-transparent text-xs font-medium rounded text-green-700 bg-green-100 hover:bg-green-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
                    >
                      Hash DL
                    </button>
                    <button
                      onClick={() => setShowDeleteConfirm(index)}
                      className="inline-flex items-center px-3 py-1.5 border border-transparent text-xs font-medium rounded text-red-700 bg-red-100 hover:bg-red-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
                    >
                      削除
                    </button>
                  </div>
                </div>

                {/* VK Hash Preview */}
                  <div className="mt-3 pl-14">
                    <div className="text-xs text-gray-500 dark:text-slate-400">
                      <span className="font-medium">VK Hash:</span>
                      <span className="ml-2 font-mono break-all">
                        {vk.vkeyHash.substring(0, 32)}...
                    </span>
                  </div>
                </div>
              </div>
              )
            })}
          </div>
        </div>
      </div>

      {/* VK Detail Modal */}
      {selectedVK && (
        <div className="fixed inset-0 bg-gray-500/60 dark:bg-black/60 flex items-center justify-center p-4 z-50">
          <div className="bg-white dark:bg-slate-900 rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-200 dark:border-slate-800">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-medium text-gray-900 dark:text-slate-100">
                  {selectedVK.year}年度検証鍵詳細
                </h3>
                <button onClick={() => setSelectedVK(null)} className="text-gray-400 hover:text-gray-500 dark:text-slate-400 dark:hover:text-slate-300">
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>
            <div className="p-6 overflow-y-auto max-h-[calc(90vh-8rem)]">
              <dl className="grid grid-cols-1 gap-4 text-sm">
                <div>
                  <dt className="font-medium text-gray-900 dark:text-slate-100">年度</dt>
                  <dd className="text-gray-700 dark:text-slate-300">{selectedVK.year}</dd>
                </div>
                <div>
                  <dt className="font-medium text-gray-900 dark:text-slate-100">回路ID</dt>
                  <dd className="font-mono text-gray-700 dark:text-slate-300">{selectedVK.circuitId}</dd>
                </div>
                <div>
                  <dt className="font-medium text-gray-900 dark:text-slate-100">VKハッシュ</dt>
                  <dd className="font-mono text-gray-700 dark:text-slate-300 break-all">{selectedVK.vkeyHash}</dd>
                </div>
                <div>
                  <dt className="font-medium text-gray-900 dark:text-slate-100">作成日時</dt>
                  <dd className="text-gray-700 dark:text-slate-300">{formatDate(selectedVK.createdAt)}</dd>
                </div>
                <div>
                  <dt className="font-medium text-gray-900 dark:text-slate-100">成果物</dt>
                  <dd className="text-gray-700 dark:text-slate-300">
                    {selectedVK.artifacts ? (
                      <ul className="text-xs space-y-1 mt-1">
                        <li className="font-mono">{selectedVK.artifacts.wasm.fileName}</li>
                        <li className="font-mono">{selectedVK.artifacts.zkey.fileName}</li>
                      </ul>
                    ) : (
                      <span className="text-xs muted">回路ファイルは含まれていません</span>
                    )}
                  </dd>
                </div>
                <div>
                  <dt className="font-medium text-gray-900 dark:text-slate-100">検証鍵JSON</dt>
                  <dd className="mt-1">
                    <pre className="text-xs bg-gray-100 dark:bg-slate-800 dark:text-slate-200 p-3 rounded overflow-x-auto">
                      {JSON.stringify(selectedVK.vkey, null, 2)}
                    </pre>
                  </dd>
                </div>
              </dl>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm !== null && (
        <div className="fixed inset-0 bg-gray-500/60 dark:bg-black/60 flex items-center justify-center p-4 z-50">
          <div className="bg-white dark:bg-slate-900 rounded-lg shadow-xl max-w-md w-full">
            <div className="px-6 py-4">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <svg className="h-6 w-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                  </svg>
                </div>
                <div className="ml-3">
                  <h3 className="text-lg font-medium text-gray-900 dark:text-slate-100">検証鍵の削除</h3>
                  <p className="mt-2 text-sm text-gray-500 dark:text-slate-400">
                    {vkList[showDeleteConfirm]?.year}年度用の検証鍵を削除しますか？
                    この操作は取り消せません。
                  </p>
                </div>
              </div>
            </div>
            <div className="px-6 py-3 bg-gray-50 dark:bg-slate-800 flex space-x-3 justify-end">
              <button onClick={() => setShowDeleteConfirm(null)} className="px-4 py-2 border border-gray-300 dark:border-slate-700 rounded-md text-sm font-medium text-gray-700 dark:text-slate-300 hover:bg-gray-50 dark:hover:bg-slate-700">
                キャンセル
              </button>
              <button
                onClick={() => confirmDelete(showDeleteConfirm)}
                className="px-4 py-2 border border-transparent rounded-md text-sm font-medium text-white bg-red-600 hover:bg-red-700"
              >
                削除する
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default VKManager
