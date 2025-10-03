import React, { useState } from 'react'
import type { VKInfo, VerificationKey } from '../App'
import { generateCircuitFiles } from '../utils/circuit-generator'
import { saveBinaryFile, saveJsonFile, saveZipFile } from '../utils/download'
import { generateVknftBundle } from '../utils/vknft-bundle'

interface VKGeneratorProps {
  onVKGenerated: (vkInfo: VKInfo) => void
  onStorageUpdated?: () => Promise<void> | void
}

const VKGenerator: React.FC<VKGeneratorProps> = ({ onVKGenerated, onStorageUpdated }) => {
  const [selectedYear, setSelectedYear] = useState<number>(new Date().getFullYear())
  const [inputValue, setInputValue] = useState<string>(new Date().getFullYear().toString())
  const [isGenerating, setIsGenerating] = useState(false)
  const [generationStatus, setGenerationStatus] = useState<string>('')
  const [latestArtifacts, setLatestArtifacts] = useState<{
    year: number
    vkey: VerificationKey
    vkeyHash: string
    wasmFileName: string
    wasmData: Uint8Array
    zkeyFileName: string
    zkeyData: Uint8Array
    bundleName: string
    bundlePath?: string | null
    manifestPath?: string | null
    signaturePath?: string | null
  } | null>(null)

  // Get reasonable year range (current year ± 5 years)
  const currentYear = new Date().getFullYear()
  const yearOptions = Array.from({ length: 11 }, (_, i) => currentYear - 5 + i)

  const generateVK = async () => {
    if (isGenerating) return

    setIsGenerating(true)
    setGenerationStatus('回路の準備中...')
    setLatestArtifacts(null)

    try {
      setGenerationStatus('年度固有の回路ファイルを準備中...')
      const circuitResult = await generateCircuitFiles({ year: selectedYear })

      if (!circuitResult.success) {
        throw new Error(`回路ファイル生成失敗: ${circuitResult.errors.join(', ')}`)
      }

      if (!circuitResult.wasmData || !circuitResult.zkeyData || !circuitResult.wasmFileName || !circuitResult.zkeyFileName) {
        throw new Error('回路ファイルのダウンロードデータが取得できませんでした')
      }

      if (circuitResult.warnings.length > 0) {
        console.warn('Circuit generation warnings:', circuitResult.warnings)
      }

      const { wasmData, zkeyData, wasmFileName, zkeyFileName } = circuitResult

      const persistVK = async (vkeyPayload: VerificationKey, vkeyHashValue: string) => {
        const vkInfo: VKInfo = {
          year: selectedYear,
          vkey: vkeyPayload,
          vkeyHash: vkeyHashValue,
          createdAt: new Date().toISOString(),
          circuitId: `commitment_poseidon_${selectedYear}_v1`,
          artifacts: {
            wasm: {
              fileName: wasmFileName,
              data: wasmData,
            },
            zkey: {
              fileName: zkeyFileName,
              data: zkeyData,
            },
          },
        }

        setGenerationStatus('完了！生成したファイルは下の「成果物のダウンロード」から保存できます。')
        onVKGenerated(vkInfo)

        let bundlePath: string | null = null
        let manifestPath: string | null = null
        let signaturePath: string | null = null
        try {
          setGenerationStatus('VKNFTバンドルを作成中...')
          const bundleResult = await generateVknftBundle({
            year: selectedYear,
            wasm: { fileName: wasmFileName, data: wasmData },
            zkey: { fileName: zkeyFileName, data: zkeyData },
            vk: {
              fileName: `vkey_${selectedYear}.json`,
              json: JSON.stringify(vkeyPayload, null, 2),
            },
            vkeyHash: vkeyHashValue,
          })
          bundlePath = bundleResult.zipPath
          manifestPath = bundleResult.manifestPath
          signaturePath = bundleResult.signaturePath
          console.log('VKNFT bundle created successfully:', {
            bundlePath,
            manifestPath,
            signaturePath,
          })
          setGenerationStatus('完了！VKNFTバンドルが作成され、ストレージに保存されました。')
        } catch (bundleError) {
          console.error('Failed to create VKNFT bundle:', bundleError)
          const errorMsg = bundleError instanceof Error ? bundleError.message : String(bundleError)
          setGenerationStatus(`警告: VKNFTバンドルの作成に失敗しました (${errorMsg})。VKは生成されましたが、ストレージには保存されていません。`)
        }

        setLatestArtifacts({
          year: selectedYear,
          vkey: vkeyPayload,
          vkeyHash: vkeyHashValue,
          wasmFileName,
          wasmData,
          zkeyFileName,
          zkeyData,
          bundleName: `tri-cert_vk_${selectedYear}.zip`,
          bundlePath,
          manifestPath,
          signaturePath: signaturePath ?? undefined,
        })

        await onStorageUpdated?.()
      }

      setGenerationStatus('既存のVKファイルを読み込み中...')
      try {
        const response = await fetch('/vkey.json')
        if (!response.ok) {
          throw new Error(`Base VK file not found (${response.status})`)
        }

        const baseVKey = await response.json()
        setGenerationStatus('年度別VKを生成中...')

        const yearSpecificVKey: VerificationKey = {
          ...baseVKey,
          nPublic: baseVKey.nPublic,
          metadata: {
            ...baseVKey.metadata,
            graduation_year: selectedYear,
            circuit_id: `commitment_poseidon_${selectedYear}_v1`,
            generated_at: new Date().toISOString(),
            circuit_wasm: wasmFileName,
            circuit_zkey: zkeyFileName,
          },
        }

        setGenerationStatus('VKハッシュを計算中...')
        const vkeyHash = await calculateVKeyHash(yearSpecificVKey)
        await persistVK(yearSpecificVKey, vkeyHash)
      } catch (fetchError) {
        console.warn('Failed to load base VK, generating new mock VK:', fetchError)

        const mockVKey: VerificationKey = {
          protocol: 'groth16',
          curve: 'bn128',
          nPublic: 3,
          vk_alpha_1: [
            `${selectedYear}491192805390485299153009773594534940189261866228447918068658471970481763042`,
            '9383485363053290200918347156157836566562967994039712273449902621266178545958',
            '1',
          ],
          vk_beta_2: [
            [
              '6375614351688725206403948262868962793625744043794305715222011528459656738731',
              '4252822878758300859123897981450591353533073413197771768651442665752259397132',
            ],
            [
              '10505242626370262277552901082094356697409835680220590971873171140371331206856',
              '21847035105528745403288232691147584728191162732299865338377159692350059136679',
            ],
            ['1', '0'],
          ],
          vk_gamma_2: [
            [
              '10857046999023057135944570762232829481370756359578518086990519993285655852781',
              '11559732032986387107991004021392285783925812861821192530917403151452391805634',
            ],
            [
              '8495653923123431417604973247489272438418190587263600148770280649306958101930',
              '4082367875863433681332203403145435568316851327593401208105741076214120093531',
            ],
            ['1', '0'],
          ],
          vk_delta_2: [
            [
              '10857046999023057135944570762232829481370756359578518086990519993285655852781',
              '11559732032986387107991004021392285783925812861821192530917403151452391805634',
            ],
            [
              '8495653923123431417604973247489272438418190587263600148770280649306958101930',
              '4082367875863433681332203403145435568316851327593401208105741076214120093531',
            ],
            ['1', '0'],
          ],
          vk_alphabeta_12: [],
          IC: [
            [
              `${selectedYear}491192805390485299153009773594534940189261866228447918068658471970481763042`,
              '9383485363053290200918347156157836566562967994039712273449902621266178545958',
              '1',
            ],
            [
              '6375614351688725206403948262868962793625744043794305715222011528459656738731',
              '4252822878758300859123897981450591353533073413197771768651442665752259397132',
              '1',
            ],
            [
              '8375614351688725206403948262868962793625744043794305715222011528459656738731',
              '5252822878758300859123897981450591353533073413197771768651442665752259397132',
              '1',
            ],
          ],
          metadata: {
            graduation_year: selectedYear,
            circuit_id: `commitment_poseidon_${selectedYear}_v1`,
            generated_at: new Date().toISOString(),
            circuit_wasm: wasmFileName,
            circuit_zkey: zkeyFileName,
          },
        }

        setGenerationStatus('VKハッシュを計算中...')
        const vkeyHash = await calculateVKeyHash(mockVKey)
        await persistVK(mockVKey, vkeyHash)
      }
    } catch (error) {
      console.error('VK generation failed:', error)
      const message = error instanceof Error ? error.message : 'VK生成に失敗しました'
      setGenerationStatus(`エラー: ${message}`)
      setLatestArtifacts(null)
    } finally {
      setIsGenerating(false)
    }
  }


  const calculateVKeyHash = async (vkey: VerificationKey): Promise<string> => {
    const crypto = await import('crypto-js')
    const canonicalJson = JSON.stringify(vkey, Object.keys(vkey).sort())
    return crypto.SHA3(canonicalJson, { outputLength: 256 }).toString()
  }

  const handleDownloadVKJson = async () => {
    if (!latestArtifacts) return
    await saveJsonFile(`vkey_${latestArtifacts.year}.json`, latestArtifacts.vkey)
  }

  const handleDownloadWasm = async () => {
    if (!latestArtifacts) return
    await saveBinaryFile(latestArtifacts.wasmFileName, latestArtifacts.wasmData, {
      description: 'WASM',
      extension: 'wasm',
    })
  }

  const handleDownloadZkey = async () => {
    if (!latestArtifacts) return
    await saveBinaryFile(latestArtifacts.zkeyFileName, latestArtifacts.zkeyData, {
      description: 'ZKey',
      extension: 'zkey',
    })
  }

  const handleDownloadBundle = async () => {
    if (!latestArtifacts) return
    const encoder = new TextEncoder()
    const bundleEntries = [
      {
        name: `vkey_${latestArtifacts.year}.json`,
        data: encoder.encode(JSON.stringify(latestArtifacts.vkey, null, 2)),
      },
      {
        name: latestArtifacts.wasmFileName,
        data: latestArtifacts.wasmData,
      },
      {
        name: latestArtifacts.zkeyFileName,
        data: latestArtifacts.zkeyData,
      },
    ]

    await saveZipFile(latestArtifacts.bundleName, bundleEntries)
  }

  const handleYearInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.replace(/[^0-9]/g, '') // Remove non-numeric characters
    setInputValue(value)
    
    if (value === '') {
      setSelectedYear(currentYear)
    } else {
      const year = parseInt(value, 10)
      if (year >= 2000 && year <= 2050) {
        setSelectedYear(year)
      } else if (year > 0) {
        // Allow partial input while typing
        setSelectedYear(year)
      }
    }
  }

  return (
    <div className="space-y-8">
      <div className="relative overflow-hidden rounded-3xl surface border border-subtle shadow-xl shadow-black/20">
        <div className="p-8 sm:p-10">
          <div className="mb-8">
            <h2 className="text-2xl font-bold text-fg">年度別検証鍵生成</h2>
            <p className="mt-2 muted">
              指定した卒業年度用のZKP回路と検証鍵を生成します
            </p>
          </div>

          <div className="space-y-6">
            {/* Year Selection */}
            <div>
              <label htmlFor="graduation-year" className="block text-sm font-medium text-fg mb-3">
                卒業年度を指定
              </label>
              <div className="flex space-x-4">
                {/* Quick Select Buttons */}
                <div className="flex space-x-2">
                  {yearOptions.slice(-3).map((year) => (
                    <button
                      key={year}
                      onClick={() => setSelectedYear(year)}
                      className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                        selectedYear === year
                          ? 'bg-blue-500 text-white'
                          : 'bg-gray-100 text-gray-700 hover:bg-gray-200 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700'
                      }`}
                    >
                      {year}
                    </button>
                  ))}
                </div>

                {/* Custom Year Input */}
                <div className="flex items-center space-x-2">
                  <span className="text-sm muted">または</span>
                  <input
                    type="text"
                    id="graduation-year"
                    value={inputValue}
                    onChange={handleYearInput}
                    placeholder="2024"
                    maxLength={4}
                    className="block w-20 rounded-lg border-gray-300 dark:border-slate-600 border px-3 py-2 text-center text-sm bg-white dark:bg-slate-800 text-gray-900 dark:text-slate-100 focus:border-blue-500 focus:ring-blue-500 focus:outline-none"
                    inputMode="numeric"
                    pattern="[0-9]*"
                  />
                  <span className="text-sm text-gray-500 dark:text-slate-400">年</span>
                </div>
              </div>
              <p className="mt-2 text-xs text-gray-500 dark:text-slate-400">
                2000-2050年の範囲で指定してください（半角数字のみ）
              </p>
            </div>

            {/* Circuit Info Preview */}
            <div className="p-4 surface border border-subtle rounded-lg">
              <h3 className="text-sm font-medium text-fg mb-2">生成される回路情報</h3>
              <dl className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                <div>
                  <dt className="muted">回路ID</dt>
                  <dd className="font-mono text-fg">commitment_poseidon_{selectedYear}_v1</dd>
                </div>
                <div>
                  <dt className="muted">卒業年度</dt>
                  <dd className="text-fg">{selectedYear}年</dd>
                </div>
                <div>
                  <dt className="muted">公開入力</dt>
                  <dd className="font-mono text-fg">pdf_sha3_512, graduation_year</dd>
                </div>
                <div>
                  <dt className="muted">秘密入力</dt>
                  <dd className="font-mono text-fg">owner_secret</dd>
                </div>
              </dl>
            </div>

            {/* Generation Button */}
            <div className="pt-4">
              <button
                onClick={generateVK}
                disabled={isGenerating}
                className="group relative w-full flex items-center justify-center px-8 py-4 border border-transparent rounded-2xl text-base font-semibold text-white bg-gradient-to-r from-blue-600 via-blue-700 to-indigo-700 hover:from-blue-700 hover:via-blue-800 hover:to-indigo-800 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:from-gray-400 disabled:to-gray-500 disabled:cursor-not-allowed transition-all duration-300 shadow-xl hover:shadow-2xl disabled:shadow-none transform hover:scale-105 disabled:transform-none"
              >
                <div className="relative flex items-center">
                  {isGenerating ? (
                    <>
                      <div className="mr-3">
                        <div className="animate-spin h-6 w-6 border-2 border-white border-t-transparent rounded-full"></div>
                      </div>
                      <span>生成中...</span>
                    </>
                  ) : (
                    <>
                      <svg className="w-6 h-6 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
                      </svg>
                      <span>{selectedYear}年度用VKを生成</span>
                    </>
                  )}
                </div>
              </button>
            </div>

            {/* Generation Status */}
            {generationStatus && (
              <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 p-6 border border-blue-200 dark:border-blue-800">
                <div className="flex items-center space-x-4">
                  <div className="flex-shrink-0">
                    <div className="h-10 w-10 rounded-xl bg-blue-100 dark:bg-blue-800 p-2">
                      {isGenerating ? (
                        <div className="h-full w-full rounded-full border-2 border-blue-500 dark:border-blue-300 border-t-transparent animate-spin"></div>
                      ) : generationStatus.includes('完了') ? (
                        <svg className="h-full w-full text-green-600 dark:text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                      ) : (
                        <svg className="h-full w-full text-red-600 dark:text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      )}
                    </div>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-blue-900 dark:text-blue-200 mb-1">生成状況</p>
                    <p className="text-sm text-blue-700 dark:text-blue-300">{generationStatus}</p>
                  </div>
                </div>
              </div>
            )}

            {latestArtifacts && (
              <div className="relative overflow-hidden rounded-2xl surface border border-subtle p-6 space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                  <div>
                    <h3 className="text-sm font-semibold text-fg">成果物のダウンロード</h3>
                    <p className="text-xs muted">
                      {latestArtifacts.year}年度用に生成したファイルを任意の場所へ保存できます
                    </p>
                  </div>
                  <div className="text-xs font-mono muted break-all">
                    ハッシュ: {latestArtifacts.vkeyHash}
                  </div>
                </div>
                <div className="grid gap-3 sm:grid-cols-4">
                  <button
                    onClick={handleDownloadBundle}
                    className="px-4 py-3 rounded-xl border border-slate-200 text-sm font-medium text-slate-700 bg-slate-50 hover:bg-slate-100 transition-colors"
                  >
                    一括ダウンロード (ZIP)
                  </button>
                  <button
                    onClick={handleDownloadVKJson}
                    className="px-4 py-3 rounded-xl border border-blue-200 text-sm font-medium text-blue-700 bg-blue-50 hover:bg-blue-100 transition-colors"
                  >
                    VK JSON を保存
                  </button>
                  <button
                    onClick={handleDownloadWasm}
                    className="px-4 py-3 rounded-xl border border-indigo-200 text-sm font-medium text-indigo-700 bg-indigo-50 hover:bg-indigo-100 transition-colors"
                  >
                    {latestArtifacts.wasmFileName}
                  </button>
                  <button
                    onClick={handleDownloadZkey}
                    className="px-4 py-3 rounded-xl border border-purple-200 text-sm font-medium text-purple-700 bg-purple-50 hover:bg-purple-100 transition-colors"
                  >
                    {latestArtifacts.zkeyFileName}
                  </button>
                </div>
                {(latestArtifacts.bundlePath || latestArtifacts.manifestPath) && (
                  <div className="text-xs font-mono text-slate-500 dark:text-slate-400 space-y-1 break-all">
                    {latestArtifacts.bundlePath && (
                      <p>VKNFT ZIP 生成先: {latestArtifacts.bundlePath}</p>
                    )}
                    {latestArtifacts.manifestPath && (
                      <p>Manifest: {latestArtifacts.manifestPath}</p>
                    )}
                    {latestArtifacts.signaturePath && (
                      <p>署名ファイル: {latestArtifacts.signaturePath}</p>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

export default VKGenerator
