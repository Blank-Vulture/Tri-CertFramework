import { useCallback, useEffect, useState } from 'react'
import { Link, NavLink, Route, Routes, useLocation } from 'react-router-dom'
import VKGenerator from './components/VKGenerator'
import VKManager from './components/VKManager'
import './App.css'

export interface VKInfo {
  year: number;
  vkey: any;
  vkeyHash: string;
  createdAt: string;
  circuitId: string;
}

function AppShell({ children }: { children: React.ReactNode }) {
  const location = useLocation()
  return (
    <div className="app-shell app-theme min-h-screen transition-colors bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 dark:!bg-none flex">
      {/* Sidebar */}
      <aside className="w-64 hidden md:flex flex-col border-r border-subtle surface backdrop-blur-sm">
        <div className="px-6 py-6 border-b border-gray-200 dark:border-slate-800">
          <Link to="/" className="flex items-center gap-2">
            <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 p-2 shadow-lg" />
            <div>
              <div className="text-sm text-gray-500 dark:text-slate-300">Tri-CertFramework</div>
              <div className="text-lg font-semibold text-fg dark:!text-white">Executive Console</div>
            </div>
          </Link>
        </div>
        <nav className="flex-1 px-3 py-4 space-y-1">
          <NavItem to="/" label="Dashboard" active={location.pathname === '/'} icon={
            <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor"><path strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0h6"/></svg>
          } />
          <NavItem to="/vk-generate" label="VK 生成" active={location.pathname === '/vk-generate'} icon={
            <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor"><path strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" d="M12 6v12m6-6H6"/></svg>
          } />
          <NavItem to="/vk-manage" label="VK 管理" active={location.pathname === '/vk-manage'} icon={
            <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor"><path strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2"/></svg>
          } />
          <NavItem to="/settings" label="設定" active={location.pathname === '/settings'} icon={
            <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor"><path strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" d="M10.325 4.317l.224-.134a2 2 0 012.902.894l.108.216a2 2 0 001.516 1.083l.24.03a2 2 0 011.74 1.99v.268a2 2 0 001.045 1.748l.21.122a2 2 0 01.73 2.73l-.134.224a2 2 0 00.894 2.902l.216.108a2 2 0 011.083 1.516l.03.24a2 2 0 01-1.99 1.74h-.268a2 2 0 00-1.748 1.045l-.122.21a2 2 0 01-2.73.73l-.224-.134a2 2 0 00-2.902.894l-.108.216a2 2 0 01-1.516 1.083l-.24.03a2 2 0 01-1.74-1.99v-.268a2 2 0 00-1.045-1.748l-.21-.122a2 2 0 01-.73-2.73l.134-.224a2 2 0 00-.894-2.902l-.216-.108A2 2 0 014.01 9.83l-.03-.24a2 2 0 011.99-1.74h.268a2 2 0 001.748-1.045l.122-.21a2 2 0 012.73-.73z"/></svg>
          } />
        </nav>
      </aside>

      {/* Main column */}
      <div className="flex-1 flex flex-col">
        <header className="h-16 border-b border-subtle surface backdrop-blur-sm flex items-center px-4 md:px-6 justify-between">
          <div className="font-semibold text-fg">Executive Console</div>
          <div className="text-xs muted">Phase 0</div>
        </header>
        <main className="flex-1 p-4 md:p-8">{children}</main>
        <footer className="h-12 border-t border-subtle surface backdrop-blur-sm flex items-center px-4 text-xs muted">
          © {new Date().getFullYear()} Tri-CertFramework
        </footer>
      </div>
    </div>
  )
}

function NavItem({ to, label, icon, active }: { to: string; label: string; icon?: React.ReactNode; active?: boolean }) {
  return (
    <NavLink
      to={to}
      className={`flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium ${
        active
          ? 'bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-white'
          : 'text-gray-700 hover:bg-gray-50 dark:text-white dark:hover:bg-slate-800'
      }`}
    >
      {icon}
      <span>{label}</span>
    </NavLink>
  )
}

function Dashboard() {
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold text-gray-900 dark:text-slate-100">ようこそ</h1>
      <div className="rounded-lg border border-subtle surface p-4">
        <h2 className="font-semibold mb-2 text-fg">操作の流れ</h2>
        <ol className="list-decimal ml-5 space-y-1 muted">
          <li>左メニューの「VK 生成」で年度・回路を選び検証鍵を生成</li>
          <li>「VK 管理」で生成済みの鍵を確認・削除</li>
          <li>「設定」でテーマなど表示環境を調整</li>
        </ol>
      </div>
      <div className="rounded-lg border border-subtle surface p-4">
        <h2 className="font-semibold mb-2 text-fg">アプリ情報</h2>
        <ul className="list-disc ml-5 space-y-1 muted">
          <li>アプリ: Executive Console</li>
          <li>プラットフォーム: Tauri v2 + React 19 + Vite 7</li>
          <li>対象OS: macOS / Windows</li>
        </ul>
      </div>
    </div>
  )
}

function Settings() {
  const [theme, setTheme] = useState<'light' | 'dark'>(() => {
    const saved = localStorage.getItem('theme') as 'light' | 'dark' | null
    return saved ?? 'light'
  })
  const [lang, setLang] = useState<'en' | 'ja'>(() => {
    const saved = localStorage.getItem('lang') as 'en' | 'ja' | null
    return saved ?? 'ja'
  })

  const applyTheme = useCallback((next: 'light' | 'dark') => {
    const htmlEl = document.documentElement
    const bodyEl = document.body
    const rootEl = document.getElementById('root')
    const enable = next === 'dark'
    htmlEl.classList.toggle('dark', enable)
    bodyEl?.classList.toggle('dark', enable)
    rootEl?.classList.toggle('dark', enable)
  }, [])

  useEffect(() => {
    applyTheme(theme)
  }, [theme, applyTheme])

  useEffect(() => {
    document.documentElement.lang = lang
  }, [lang])

  const handleChange = (next: 'light' | 'dark') => {
    setTheme(next)
    localStorage.setItem('theme', next)
    applyTheme(next)
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold text-fg">設定</h1>
      <div className="rounded-lg border border-subtle surface p-4">
        <h2 className="font-semibold mb-4 text-fg">テーマ</h2>
        <div className="flex items-center gap-4">
          <button
            onClick={() => handleChange('light')}
            className={`px-4 py-2 rounded-md border text-sm ${theme === 'light' ? 'bg-blue-50 text-blue-700 border-blue-200' : 'border-gray-300 dark:border-slate-700 text-gray-700 dark:text-slate-300 hover:bg-gray-50 dark:hover:bg-slate-800'}`}
            aria-pressed={theme === 'light'}
          >
            ライト
          </button>
          <button
            onClick={() => handleChange('dark')}
            className={`px-4 py-2 rounded-md border text-sm ${theme === 'dark' ? 'bg-blue-50 text-blue-700 border-blue-200' : 'border-gray-300 dark:border-slate-700 text-gray-700 dark:text-slate-300 hover:bg-gray-50 dark:hover:bg-slate-800'}`}
            aria-pressed={theme === 'dark'}
          >
            ダーク
          </button>
        </div>
      </div>
      <div className="rounded-lg border border-subtle surface p-4">
        <h2 className="font-semibold mb-4 text-fg">言語設定</h2>
        <div className="flex items-center gap-3">
          <label htmlFor="lang-select" className="text-sm muted">表示言語</label>
          <select
            id="lang-select"
            className="px-3 py-2 rounded-md border text-sm border-gray-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-fg"
            value={lang}
            onChange={(e) => { const v = e.target.value as 'en'|'ja'; setLang(v); localStorage.setItem('lang', v); }}
          >
            <option value="ja">日本語</option>
            <option value="en">English</option>
          </select>
        </div>
      </div>
    </div>
  )
}

function App() {
  const [vkList, setVKList] = useState<VKInfo[]>([])

  const handleVKGenerated = (vkInfo: VKInfo) => {
    setVKList(prev => [...prev, vkInfo])
  }

  const handleVKDelete = (index: number) => {
    setVKList(prev => prev.filter((_, i) => i !== index))
  }

  const handleVKImported = (vkInfo: VKInfo) => {
    setVKList(prev => [...prev, vkInfo])
  }

  return (
    <AppShell>
      <Routes>
        <Route path="/" element={<Dashboard />} />
        <Route path="/vk-generate" element={<VKGenerator onVKGenerated={handleVKGenerated} />} />
        <Route path="/vk-manage" element={<VKManager vkList={vkList} onVKDelete={handleVKDelete} onVKImport={handleVKImported} />} />
        <Route path="/settings" element={<Settings />} />
      </Routes>
    </AppShell>
  )
}

export default App
