import { Link } from 'react-router-dom'
import type { VKInfo } from '../App'

interface DashboardStatsProps {
  vkList: VKInfo[]
  vknftPath: string | null
}

export default function DashboardStats({ vkList, vknftPath }: DashboardStatsProps) {
  // 統計情報の計算
  const years = vkList.map(v => v.year).sort((a, b) => a - b)
  const latestVk = vkList.length > 0
    ? vkList.reduce((a, b) => new Date(a.createdAt) > new Date(b.createdAt) ? a : b)
    : null

  const formatDate = (dateStr: string) => {
    try {
      const date = new Date(dateStr)
      return date.toLocaleString('ja-JP', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit'
      })
    } catch {
      return dateStr
    }
  }

  return (
    <div className="space-y-6">
      {/* 統計カード群 */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* 生成済みVK数 */}
        <div className="rounded-xl border border-subtle surface p-5 shadow-sm">
          <div className="flex items-center gap-3 mb-3">
            <div className="h-10 w-10 rounded-lg bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
              <svg className="w-5 h-5 text-blue-600 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
              </svg>
            </div>
            <div>
              <p className="text-xs muted">生成済みVK</p>
              <p className="text-2xl font-bold text-fg">{vkList.length}</p>
            </div>
          </div>
          {years.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {years.map(year => (
                <span
                  key={year}
                  className="px-2 py-0.5 text-xs font-medium bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300 rounded-full"
                >
                  {year}
                </span>
              ))}
            </div>
          )}
          {years.length === 0 && (
            <p className="text-xs muted">まだVKが生成されていません</p>
          )}
        </div>

        {/* 最新生成情報 */}
        <div className="rounded-xl border border-subtle surface p-5 shadow-sm">
          <div className="flex items-center gap-3 mb-3">
            <div className="h-10 w-10 rounded-lg bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
              <svg className="w-5 h-5 text-green-600 dark:text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div>
              <p className="text-xs muted">最新生成</p>
              {latestVk ? (
                <p className="text-lg font-bold text-fg">{latestVk.year}年度</p>
              ) : (
                <p className="text-lg font-bold text-fg">-</p>
              )}
            </div>
          </div>
          {latestVk ? (
            <p className="text-xs muted">{formatDate(latestVk.createdAt)}</p>
          ) : (
            <p className="text-xs muted">生成履歴なし</p>
          )}
        </div>

        {/* 保存先パス */}
        <div className="rounded-xl border border-subtle surface p-5 shadow-sm">
          <div className="flex items-center gap-3 mb-3">
            <div className="h-10 w-10 rounded-lg bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center">
              <svg className="w-5 h-5 text-purple-600 dark:text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
              </svg>
            </div>
            <div>
              <p className="text-xs muted">保存先</p>
              <p className="text-sm font-medium text-fg">VKNFT</p>
            </div>
          </div>
          <p className="text-xs muted truncate" title={vknftPath || '未設定'}>
            {vknftPath || '未設定'}
          </p>
        </div>
      </div>

      {/* クイックアクション */}
      <div className="rounded-xl border border-subtle surface p-5 shadow-sm">
        <h3 className="font-semibold mb-4 text-fg flex items-center gap-2">
          <svg className="w-5 h-5 text-amber-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
          </svg>
          クイックアクション
        </h3>
        <div className="flex flex-wrap gap-3">
          <Link
            to="/vk-generate"
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-gradient-to-r from-blue-500 to-indigo-600 text-white text-sm font-medium shadow-sm hover:from-blue-600 hover:to-indigo-700 transition-all"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" d="M12 6v12m6-6H6" />
            </svg>
            新しいVKを生成
          </Link>
          <Link
            to="/vk-manage"
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-gray-100 dark:bg-slate-800 text-gray-700 dark:text-slate-200 text-sm font-medium hover:bg-gray-200 dark:hover:bg-slate-700 transition-colors"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2" />
            </svg>
            VK管理を開く
          </Link>
        </div>
      </div>

      {/* 操作の流れ（既存の説明を維持） */}
      <div className="rounded-xl border border-subtle surface p-5 shadow-sm">
        <h3 className="font-semibold mb-3 text-fg">操作の流れ</h3>
        <ol className="list-decimal ml-5 space-y-1.5 text-sm muted">
          <li>左メニューの「VK 生成」で年度・回路を選び検証鍵を生成</li>
          <li>「VK 管理」で生成済みの鍵を確認・削除</li>
          <li>「設定」でテーマなど表示環境を調整</li>
        </ol>
      </div>
    </div>
  )
}
