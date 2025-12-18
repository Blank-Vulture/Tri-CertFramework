import { useCallback, useEffect, useState } from "react";
import { Link, NavLink, Route, Routes, useLocation } from "react-router-dom";
import VKGenerator from "./components/VKGenerator";
import VKManager from "./components/VKManager";
import DashboardStats from "./components/DashboardStats";
import "./App.css";
import { loadVkInfosFromVknft, deleteVknftYear } from "./utils/vknft-storage";
import "./utils/tauri-diagnostics"; // Enable diagnostics globally

export interface VKInfo {
  year: number;
  vkey: VerificationKey;
  vkeyHash: string;
  createdAt: string;
  circuitId: string;
  artifacts?: {
    wasm: {
      fileName: string;
      data: Uint8Array;
    };
    zkey: {
      fileName: string;
      data: Uint8Array;
    };
  };
  bundlePath?: string;
  manifestPath?: string;
  signaturePath?: string;
}

export interface VerificationKey {
  protocol: string;
  curve: string;
  nPublic: number;
  vk_alpha_1: string[];
  vk_beta_2: string[][];
  vk_gamma_2: string[][];
  vk_delta_2: string[][];
  vk_alphabeta_12: string[];
  IC: string[][];
  circuit_id?: string;
  metadata?: {
    graduation_year?: number;
    circuit_id?: string;
    generated_at?: string;
    circuit_wasm?: string;
    circuit_zkey?: string;
  };
}

function AppShell({ children }: { children: React.ReactNode }) {
  const location = useLocation();

  return (
    <div className="app-shell app-theme min-h-screen transition-colors bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 dark:!bg-none flex">
      {/* Sidebar */}
      <aside className="w-64 hidden md:flex flex-col border-r border-subtle surface backdrop-blur-sm">
        <div className="px-6 py-6 border-b border-gray-200 dark:border-slate-800">
          <Link to="/" className="flex items-center gap-2">
            <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 p-2 shadow-lg" />
            <div>
              <div className="text-sm text-gray-500 dark:text-slate-300">
                Tri-CertFramework
              </div>
              <div className="text-lg font-semibold text-fg dark:!text-white">
                Executive Console
              </div>
            </div>
          </Link>
        </div>
        <nav className="flex-1 px-3 py-4 space-y-1">
          <NavItem
            to="/"
            label="Dashboard"
            active={location.pathname === "/"}
            icon={
              <svg
                className="w-5 h-5"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
              >
                <path
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0h6"
                />
              </svg>
            }
          />
          <NavItem
            to="/vk-generate"
            label="VK 生成"
            active={location.pathname === "/vk-generate"}
            icon={
              <svg
                className="w-5 h-5"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
              >
                <path
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M12 6v12m6-6H6"
                />
              </svg>
            }
          />
          <NavItem
            to="/vk-manage"
            label="VK 管理"
            active={location.pathname === "/vk-manage"}
            icon={
              <svg
                className="w-5 h-5"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
              >
                <path
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2"
                />
              </svg>
            }
          />
          <NavItem
            to="/settings"
            label="設定"
            active={location.pathname === "/settings"}
            icon={
              <svg
                className="w-5 h-5"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
              >
                <path
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M10.325 4.317l.224-.134a2 2 0 012.902.894l.108.216a2 2 0 001.516 1.083l.24.03a2 2 0 011.74 1.99v.268a2 2 0 001.045 1.748l.21.122a2 2 0 01.73 2.73l-.134.224a2 2 0 00.894 2.902l.216.108a2 2 0 011.083 1.516l.03.24a2 2 0 01-1.99 1.74h-.268a2 2 0 00-1.748 1.045l-.122.21a2 2 0 01-2.73.73l-.224-.134a2 2 0 00-2.902.894l-.108.216a2 2 0 01-1.516 1.083l-.24.03a2 2 0 01-1.74-1.99v-.268a2 2 0 00-1.045-1.748l-.21-.122a2 2 0 01-.73-2.73l.134-.224a2 2 0 00-.894-2.902l-.216-.108A2 2 0 014.01 9.83l-.03-.24a2 2 0 011.99-1.74h.268a2 2 0 001.748-1.045l.122-.21a2 2 0 012.73-.73z"
                />
              </svg>
            }
          />
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
  );
}

function NavItem({
  to,
  label,
  icon,
  active,
}: {
  to: string;
  label: string;
  icon?: React.ReactNode;
  active?: boolean;
}) {
  return (
    <NavLink
      to={to}
      className={`flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium ${
        active
          ? "bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-white"
          : "text-gray-700 hover:bg-gray-50 dark:text-white dark:hover:bg-slate-800"
      }`}
    >
      {icon}
      <span>{label}</span>
    </NavLink>
  );
}

interface DashboardProps {
  vkList: VKInfo[];
  vknftPath: string | null;
}

function Dashboard({ vkList, vknftPath }: DashboardProps) {
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold text-gray-900 dark:text-slate-100">
        ようこそ
      </h1>

      {/* VK統計・クイックアクション */}
      <DashboardStats vkList={vkList} vknftPath={vknftPath} />

      {/* アプリ情報 */}
      <div className="rounded-xl border border-subtle surface p-5 shadow-sm">
        <h3 className="font-semibold mb-3 text-fg">アプリ情報</h3>
        <ul className="list-disc ml-5 space-y-1.5 text-sm muted">
          <li>アプリ: Executive Console</li>
          <li>プラットフォーム: Tauri v2 + React 19 + Vite 7</li>
          <li>対象OS: macOS / Windows</li>
        </ul>
      </div>
    </div>
  );
}

interface LedgerDeviceInfo {
  product_string: string;
  manufacturer_string: string;
  serial_number: string | null;
  product_id: number;
}

interface LedgerPublicKey {
  public_key_hex: string;
  address: string;
  chain_code_hex: string;
}

interface LedgerSignature {
  r: string;
  s: string;
  v: number;
}

function LedgerDiagnostics() {
  const [devices, setDevices] = useState<LedgerDeviceInfo[]>([]);
  const [publicKey, setPublicKey] = useState<LedgerPublicKey | null>(null);
  const [signature, setSignature] = useState<LedgerSignature | null>(null);
  const [logs, setLogs] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [activeTest, setActiveTest] = useState<string | null>(null);

  const addLog = (
    message: string,
    type: "info" | "error" | "success" = "info",
  ) => {
    const timestamp = new Date().toLocaleTimeString();
    const prefix = type === "error" ? "❌" : type === "success" ? "✅" : "ℹ️";
    setLogs((prev) => [...prev, `${timestamp} ${prefix} ${message}`]);
  };

  const clearLogs = () => {
    setLogs([]);
    setDevices([]);
    setPublicKey(null);
    setSignature(null);
  };

  const testListDevices = async () => {
    setIsLoading(true);
    setActiveTest("list");
    addLog("Attempting to list Ledger devices...");

    try {
      const { invoke } = await import("@tauri-apps/api/core");
      const result = await invoke<LedgerDeviceInfo[]>("list_ledger_devices");
      setDevices(result);
      addLog(`Found ${result.length} Ledger device(s)`, "success");
      result.forEach((dev, i) => {
        addLog(
          `  Device ${i + 1}: ${dev.product_string} (${dev.manufacturer_string})`,
        );
        addLog(`  Product ID: 0x${dev.product_id.toString(16)}`);
        if (dev.serial_number) addLog(`  Serial: ${dev.serial_number}`);
      });
    } catch (error) {
      addLog(`Failed to list devices: ${error}`, "error");
    } finally {
      setIsLoading(false);
      setActiveTest(null);
    }
  };

  const testGetPublicKey = async () => {
    setIsLoading(true);
    setActiveTest("pubkey");
    addLog("Attempting to get public key from Ledger...");
    addLog("Please confirm on your Ledger device if prompted.");

    try {
      const { invoke } = await import("@tauri-apps/api/core");
      const result = await invoke<LedgerPublicKey>("get_ledger_public_key", {
        derivationPath: "44'/60'/0'/0/0",
      });
      setPublicKey(result);
      addLog("Public key retrieved successfully!", "success");
      addLog(`Address: ${result.address}`);
      addLog(`Public Key: ${result.public_key_hex.substring(0, 40)}...`);
      addLog(`Chain Code: ${result.chain_code_hex.substring(0, 20)}...`);
    } catch (error) {
      addLog(`Failed to get public key: ${error}`, "error");
      const errorStr = String(error);
      if (errorStr.includes("App not running") || errorStr.includes("6d02")) {
        addLog("❌ Ethereum app is NOT running on Ledger!", "error");
        addLog("解決手順:", "info");
        addLog("1. Ledgerデバイスのロックを解除してください", "info");
        addLog("2. Ledger上で「Ethereum」アプリを開いてください", "info");
        addLog(
          '3. 画面に "Application is ready" が表示されることを確認',
          "info",
        );
        addLog("4. 再度このテストを実行してください", "info");
      } else if (errorStr.includes("Device not found")) {
        addLog("Hint: Connect your Ledger and unlock it.", "info");
      }
    } finally {
      setIsLoading(false);
      setActiveTest(null);
    }
  };

  const testSignMessage = async () => {
    setIsLoading(true);
    setActiveTest("sign");
    addLog("Attempting to sign a test message with Ledger...");
    addLog("Please confirm the signature on your Ledger device.");

    // Generate a test hash (32 bytes)
    const testMessage = "Test signature for Ledger diagnostics";
    const crypto = await import("crypto-js");
    const hashHex = crypto.SHA256(testMessage).toString();
    addLog(`Test hash (SHA-256): ${hashHex.substring(0, 32)}...`);

    try {
      const { invoke } = await import("@tauri-apps/api/core");
      const result = await invoke<LedgerSignature>("sign_with_ledger", {
        hashHex,
        derivationPath: "44'/60'/0'/0/0",
      });
      setSignature(result);
      addLog("Signature obtained successfully!", "success");
      addLog(`R: ${result.r.substring(0, 32)}...`);
      addLog(`S: ${result.s.substring(0, 32)}...`);
      addLog(`V: ${result.v}`);
    } catch (error) {
      addLog(`Failed to sign: ${error}`, "error");
      const errorStr = String(error);
      if (errorStr.includes("User denied")) {
        addLog("You rejected the signature request on the Ledger.", "info");
      } else if (
        errorStr.includes("App not running") ||
        errorStr.includes("6d02")
      ) {
        addLog("❌ Ethereum app is NOT running on Ledger!", "error");
        addLog("解決手順:", "info");
        addLog("1. Ledgerデバイスのロックを解除してください", "info");
        addLog("2. Ledger上で「Ethereum」アプリを開いてください", "info");
        addLog(
          '3. 画面に "Application is ready" が表示されることを確認',
          "info",
        );
        addLog("4. 再度このテストを実行してください", "info");
      } else if (errorStr.includes("Device not found")) {
        addLog("Hint: Connect your Ledger and unlock it.", "info");
      }
    } finally {
      setIsLoading(false);
      setActiveTest(null);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold text-fg">Ledger 診断ツール</h3>
        <button
          onClick={clearLogs}
          className="px-3 py-1 text-xs text-gray-600 hover:text-gray-800 dark:text-slate-400 dark:hover:text-slate-200"
        >
          ログをクリア
        </button>
      </div>

      {/* Important Notice */}
      <div className="p-4 bg-amber-50 dark:bg-amber-900/20 rounded-lg border border-amber-200 dark:border-amber-800">
        <div className="flex items-start gap-3">
          <svg
            className="w-5 h-5 text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z"
            />
          </svg>
          <div className="flex-1">
            <h4 className="text-sm font-semibold text-amber-900 dark:text-amber-100 mb-2">
              ⚠️ テスト実行前に必ず確認してください
            </h4>
            <ol className="text-xs text-amber-800 dark:text-amber-200 space-y-1.5 list-decimal list-inside">
              <li>Ledger Nano デバイスをUSBで接続済み</li>
              <li>Ledgerデバイスのロックを解除済み（PINコード入力完了）</li>
              <li className="font-bold">
                Ledger上で「Ethereum」アプリを起動済み（重要！）
              </li>
              <li>Ledger画面に "Application is ready" と表示されている</li>
            </ol>
            <p className="mt-2 text-xs text-amber-700 dark:text-amber-300 font-medium">
              💡 エラー 6d02 が出る場合は、上記のステップ 3
              を再確認してください。
            </p>
          </div>
        </div>
      </div>

      <p className="text-sm muted">
        準備が整ったら、下のボタンで動作確認を行ってください。
      </p>

      <div className="flex flex-wrap gap-2">
        <button
          onClick={testListDevices}
          disabled={isLoading}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
            activeTest === "list"
              ? "bg-blue-600 text-white"
              : "bg-blue-100 text-blue-700 hover:bg-blue-200 dark:bg-blue-900/30 dark:text-blue-300 dark:hover:bg-blue-900/50"
          } disabled:opacity-50 disabled:cursor-not-allowed`}
        >
          {activeTest === "list" ? "検出中..." : "1. デバイス検出"}
        </button>
        <button
          onClick={testGetPublicKey}
          disabled={isLoading}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
            activeTest === "pubkey"
              ? "bg-purple-600 text-white"
              : "bg-purple-100 text-purple-700 hover:bg-purple-200 dark:bg-purple-900/30 dark:text-purple-300 dark:hover:bg-purple-900/50"
          } disabled:opacity-50 disabled:cursor-not-allowed`}
        >
          {activeTest === "pubkey" ? "取得中..." : "2. 公開鍵取得"}
        </button>
        <button
          onClick={testSignMessage}
          disabled={isLoading}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
            activeTest === "sign"
              ? "bg-amber-600 text-white"
              : "bg-amber-100 text-amber-700 hover:bg-amber-200 dark:bg-amber-900/30 dark:text-amber-300 dark:hover:bg-amber-900/50"
          } disabled:opacity-50 disabled:cursor-not-allowed`}
        >
          {activeTest === "sign" ? "署名中..." : "3. 署名テスト"}
        </button>
      </div>

      {/* Device List */}
      {devices.length > 0 && (
        <div className="p-3 bg-green-50 dark:bg-green-900/20 rounded-lg border border-green-200 dark:border-green-800">
          <h4 className="text-sm font-medium text-green-800 dark:text-green-200 mb-2">
            検出されたデバイス
          </h4>
          {devices.map((dev, i) => (
            <div
              key={i}
              className="text-xs text-green-700 dark:text-green-300 font-mono"
            >
              {dev.product_string} ({dev.manufacturer_string})
            </div>
          ))}
        </div>
      )}

      {/* Public Key */}
      {publicKey && (
        <div className="p-3 bg-purple-50 dark:bg-purple-900/20 rounded-lg border border-purple-200 dark:border-purple-800">
          <h4 className="text-sm font-medium text-purple-800 dark:text-purple-200 mb-2">
            公開鍵情報
          </h4>
          <div className="text-xs text-purple-700 dark:text-purple-300 font-mono space-y-1">
            <p>Address: {publicKey.address}</p>
            <p className="break-all">Public Key: {publicKey.public_key_hex}</p>
          </div>
        </div>
      )}

      {/* Signature */}
      {signature && (
        <div className="p-3 bg-amber-50 dark:bg-amber-900/20 rounded-lg border border-amber-200 dark:border-amber-800">
          <h4 className="text-sm font-medium text-amber-800 dark:text-amber-200 mb-2">
            署名結果
          </h4>
          <div className="text-xs text-amber-700 dark:text-amber-300 font-mono space-y-1">
            <p className="break-all">R: {signature.r}</p>
            <p className="break-all">S: {signature.s}</p>
            <p>V: {signature.v}</p>
          </div>
        </div>
      )}

      {/* Log Output */}
      {logs.length > 0 && (
        <div className="rounded-lg border border-gray-200 dark:border-slate-700 bg-gray-50 dark:bg-slate-800 p-3 max-h-64 overflow-auto">
          <div className="space-y-1">
            {logs.map((log, index) => (
              <div
                key={index}
                className="text-xs font-mono text-gray-700 dark:text-slate-300"
              >
                {log}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function Settings() {
  const [theme, setTheme] = useState<"light" | "dark">(() => {
    const saved = localStorage.getItem("theme") as "light" | "dark" | null;
    return saved ?? "light";
  });
  const [lang, setLang] = useState<"en" | "ja">(() => {
    const saved = localStorage.getItem("lang") as "en" | "ja" | null;
    return saved ?? "ja";
  });
  const [vknftPath, setVknftPath] = useState<string | null>(null);

  const applyTheme = useCallback((next: "light" | "dark") => {
    const htmlEl = document.documentElement;
    const bodyEl = document.body;
    const rootEl = document.getElementById("root");
    const enable = next === "dark";
    htmlEl.classList.toggle("dark", enable);
    bodyEl?.classList.toggle("dark", enable);
    rootEl?.classList.toggle("dark", enable);
  }, []);

  useEffect(() => {
    applyTheme(theme);
  }, [theme, applyTheme]);

  useEffect(() => {
    document.documentElement.lang = lang;
  }, [lang]);

  // Load VKNFT path
  useEffect(() => {
    (async () => {
      try {
        const { invoke } = await import("@tauri-apps/api/core");
        const path = await invoke<string>("get_vknft_base_path");
        setVknftPath(path);
      } catch (error) {
        console.warn("Failed to get VKNFT path:", error);
        setVknftPath(localStorage.getItem("tricert.vknft.baseDir"));
      }
    })();
  }, []);

  const handleChange = (next: "light" | "dark") => {
    setTheme(next);
    localStorage.setItem("theme", next);
    applyTheme(next);
  };

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold text-fg">設定</h1>

      {/* VKNFT Path Info */}
      <div className="rounded-lg border border-subtle surface p-4">
        <h2 className="font-semibold mb-4 text-fg">VKNFT 保存先</h2>
        <div className="flex items-center gap-2">
          <div className="flex-1 px-3 py-2 rounded-md bg-gray-100 dark:bg-slate-800 text-sm font-mono text-gray-700 dark:text-slate-300 truncate">
            {vknftPath || "未設定"}
          </div>
          <span className="px-2 py-1 text-xs bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300 rounded">
            自動検出
          </span>
        </div>
        <p className="mt-2 text-xs muted">
          VKNFTバンドルはこのディレクトリに自動保存されます
        </p>
      </div>

      <div className="rounded-lg border border-subtle surface p-4">
        <h2 className="font-semibold mb-4 text-fg">テーマ</h2>
        <div className="flex items-center gap-4">
          <button
            onClick={() => handleChange("light")}
            className={`px-4 py-2 rounded-md border text-sm ${theme === "light" ? "bg-blue-50 text-blue-700 border-blue-200" : "border-gray-300 dark:border-slate-700 text-gray-700 dark:text-slate-300 hover:bg-gray-50 dark:hover:bg-slate-800"}`}
            aria-pressed={theme === "light"}
          >
            ライト
          </button>
          <button
            onClick={() => handleChange("dark")}
            className={`px-4 py-2 rounded-md border text-sm ${theme === "dark" ? "bg-blue-50 text-blue-700 border-blue-200" : "border-gray-300 dark:border-slate-700 text-gray-700 dark:text-slate-300 hover:bg-gray-50 dark:hover:bg-slate-800"}`}
            aria-pressed={theme === "dark"}
          >
            ダーク
          </button>
        </div>
      </div>
      <div className="rounded-lg border border-subtle surface p-4">
        <h2 className="font-semibold mb-4 text-fg">言語設定</h2>
        <div className="flex items-center gap-3">
          <label htmlFor="lang-select" className="text-sm muted">
            表示言語
          </label>
          <select
            id="lang-select"
            className="px-3 py-2 rounded-md border text-sm border-gray-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-fg"
            value={lang}
            onChange={(e) => {
              const v = e.target.value as "en" | "ja";
              setLang(v);
              localStorage.setItem("lang", v);
            }}
          >
            <option value="ja">日本語</option>
            <option value="en">English</option>
          </select>
        </div>
      </div>

      {/* Ledger Diagnostics */}
      <div className="rounded-lg border border-subtle surface p-4">
        <LedgerDiagnostics />
      </div>
    </div>
  );
}

function App() {
  const [vkList, setVKList] = useState<VKInfo[]>([]);
  const [vknftPath, setVknftPath] = useState<string | null>(null);

  const refreshVkList = useCallback(async () => {
    try {
      const loaded = await loadVkInfosFromVknft();
      setVKList(loaded);
    } catch (error) {
      console.error("Failed to load VKNFT bundles", error);
    }
  }, []);

  useEffect(() => {
    refreshVkList();
  }, [refreshVkList]);

  // Load VKNFT path
  useEffect(() => {
    (async () => {
      try {
        const { invoke } = await import("@tauri-apps/api/core");
        const path = await invoke<string>("get_vknft_base_path");
        setVknftPath(path);
      } catch (error) {
        console.warn("Failed to get VKNFT path:", error);
        setVknftPath(localStorage.getItem("tricert.vknft.baseDir"));
      }
    })();
  }, []);

  const handleVKGenerated = (vkInfo: VKInfo) => {
    setVKList((prev) => {
      const withoutYear = prev.filter((v) => v.year !== vkInfo.year);
      return [...withoutYear, vkInfo];
    });
    refreshVkList();
  };

  const handleVKDelete = async (vk: VKInfo) => {
    try {
      await deleteVknftYear(vk.year);
    } catch (error) {
      console.error("Failed to delete VKNFT year directory", error);
    }
    refreshVkList();
  };

  const handleVKImported = (vkInfo: VKInfo) => {
    setVKList((prev) => [...prev, vkInfo]);
    refreshVkList();
  };

  return (
    <AppShell>
      <Routes>
        <Route
          path="/"
          element={<Dashboard vkList={vkList} vknftPath={vknftPath} />}
        />
        <Route
          path="/vk-generate"
          element={
            <VKGenerator
              onVKGenerated={handleVKGenerated}
              onStorageUpdated={refreshVkList}
            />
          }
        />
        <Route
          path="/vk-manage"
          element={
            <VKManager
              vkList={vkList}
              onVKDelete={handleVKDelete}
              onVKImport={handleVKImported}
              onRefresh={refreshVkList}
            />
          }
        />
        <Route path="/settings" element={<Settings />} />
      </Routes>
    </AppShell>
  );
}

export default App;
