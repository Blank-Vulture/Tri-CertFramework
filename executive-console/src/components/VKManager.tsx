import React, { useState } from 'react'
import type { VKInfo, VerificationKey } from '../App'
import { saveJsonFile, saveTextFile } from '../utils/download'

interface VKManagerProps {
  vkList: VKInfo[]
  onVKDelete: (index: number) => void
  onVKImport: (vk: VKInfo) => void
}

const VKManager: React.FC<VKManagerProps> = ({ vkList, onVKDelete, onVKImport }) => {
  const [selectedVK, setSelectedVK] = useState<VKInfo | null>(null)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<number | null>(null)
  const [isImporting, setIsImporting] = useState(false)

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

  const downloadAllVKs = async () => {
    // Export verified bundle manifest (distribution-ready)
    const bundle = {
      schema: 'tri-cert/vk-bundle@1',
      generatedAt: new Date().toISOString(),
      items: vkList.map(vk => ({
        year: vk.year,
        vkey: vk.vkey,
        vkeyHash: vk.vkeyHash,
        circuitId: vk.circuitId,
        createdAt: vk.createdAt,
      }))
    }

    try {
      await saveJsonFile('vk_bundle_verified.json', bundle)
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

  const confirmDelete = (index: number) => {
    onVKDelete(index)
    setShowDeleteConfirm(null)
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

      {/* VK List */}
      <div className="relative overflow-hidden rounded-3xl surface border border-subtle shadow-xl shadow-black/20">
        <div className="p-8 sm:p-10">
          <h3 className="text-lg font-medium text-fg mb-6">年度別検証鍵一覧</h3>
          
          <div className="grid gap-4">
            {vkList.map((vk, index) => (
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
            ))}
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
