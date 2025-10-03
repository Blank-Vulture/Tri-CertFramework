/**
 * Tauri environment diagnostics utility
 * 
 * Use this to check if the app is running in a proper Tauri environment.
 * Call `diagnoseTauriEnvironment()` from the browser console to get detailed info.
 */

export interface TauriDiagnostics {
  isTauriEnvironment: boolean
  checks: {
    windowExists: boolean
    hasTauriInternals: boolean
    hasTauri: boolean
    userAgentIncludesTauri: boolean
    navigatorCredentialsExists: boolean
    isSecureContext: boolean
  }
  userAgent: string
  availableApis: {
    dialog: boolean
    fs: boolean
    path: boolean
  }
  localStorage: {
    vknftBaseDir: string | null
    ledgerCredential: string | null
  }
}

export async function diagnoseTauriEnvironment(): Promise<TauriDiagnostics> {
  const windowExists = typeof window !== 'undefined'
  const hasTauriInternals = windowExists && '__TAURI_INTERNALS__' in window
  const hasTauri = windowExists && '__TAURI__' in window
  const userAgentIncludesTauri = typeof navigator !== 'undefined' && navigator.userAgent.includes('Tauri')
  const navigatorCredentialsExists = typeof navigator !== 'undefined' && 'credentials' in navigator
  const isSecureContext = windowExists && window.isSecureContext

  const isTauriEnvironment = hasTauriInternals || hasTauri || userAgentIncludesTauri

  // Check Tauri API availability
  let dialogAvailable = false
  let fsAvailable = false
  let pathAvailable = false

  try {
    await import('@tauri-apps/plugin-dialog')
    dialogAvailable = true
  } catch {
    // Dialog plugin not available
  }

  try {
    await import('@tauri-apps/plugin-fs')
    fsAvailable = true
  } catch {
    // FS plugin not available
  }

  try {
    await import('@tauri-apps/api/path')
    pathAvailable = true
  } catch {
    // Path API not available
  }

  return {
    isTauriEnvironment,
    checks: {
      windowExists,
      hasTauriInternals,
      hasTauri,
      userAgentIncludesTauri,
      navigatorCredentialsExists,
      isSecureContext,
    },
    userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : 'N/A',
    availableApis: {
      dialog: dialogAvailable,
      fs: fsAvailable,
      path: pathAvailable,
    },
    localStorage: {
      vknftBaseDir: typeof localStorage !== 'undefined' ? localStorage.getItem('tricert.vknft.baseDir') : null,
      ledgerCredential: typeof localStorage !== 'undefined' ? localStorage.getItem('tricert.vknft.ledgerCredential') : null,
    },
  }
}

export function printDiagnostics(diagnostics: TauriDiagnostics): void {
  console.group('🔍 Tauri Environment Diagnostics')
  
  console.log('✓ Is Tauri Environment:', diagnostics.isTauriEnvironment ? '✅ YES' : '❌ NO')
  
  console.group('Environment Checks')
  Object.entries(diagnostics.checks).forEach(([key, value]) => {
    console.log(`  ${value ? '✅' : '❌'} ${key}:`, value)
  })
  console.groupEnd()
  
  console.log('User Agent:', diagnostics.userAgent)
  
  console.group('Available Tauri APIs')
  Object.entries(diagnostics.availableApis).forEach(([key, value]) => {
    console.log(`  ${value ? '✅' : '❌'} ${key}:`, value)
  })
  console.groupEnd()
  
  console.group('LocalStorage State')
  console.log('  VKNFT Base Dir:', diagnostics.localStorage.vknftBaseDir ?? '(not set)')
  console.log('  Ledger Credential:', diagnostics.localStorage.ledgerCredential ? '(configured)' : '(not set)')
  console.groupEnd()
  
  console.groupEnd()
}

// Make it available globally for debugging
if (typeof window !== 'undefined') {
  (window as any).diagnoseTauri = async () => {
    const diagnostics = await diagnoseTauriEnvironment()
    printDiagnostics(diagnostics)
    return diagnostics
  }
  console.log('💡 Tauri diagnostics available: Run diagnoseTauri() in the console')
}

