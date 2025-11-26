mod ledger;

use ledger::{LedgerDeviceInfo, LedgerPublicKey, LedgerSignature};
use std::path::PathBuf;

/// Get the VKNFT directory path relative to the workspace
/// In development, this resolves to ../VKNFT relative to the executive-console folder
/// In production, it resolves relative to the app bundle location
#[tauri::command]
fn get_vknft_base_path() -> Result<String, String> {
    // Try environment variable first (for development)
    if let Ok(workspace_path) = std::env::var("TRICERT_WORKSPACE") {
        let vknft_path = PathBuf::from(&workspace_path).join("VKNFT");
        return Ok(vknft_path.to_string_lossy().to_string());
    }
    
    // Try to find VKNFT directory relative to current executable
    if let Ok(exe_path) = std::env::current_exe() {
        // In macOS bundle: Contents/MacOS/executable -> go up to app parent
        // In Windows: next to executable
        // In development: try from CWD
        
        let mut search_paths = vec![];
        
        // Development: look in parent directories
        if let Some(exe_dir) = exe_path.parent() {
            // macOS bundle structure
            if exe_dir.ends_with("MacOS") {
                if let Some(contents) = exe_dir.parent() {
                    if let Some(app_bundle) = contents.parent() {
                        if let Some(app_parent) = app_bundle.parent() {
                            // Development: app is in target/debug or target/release
                            search_paths.push(app_parent.join("VKNFT"));
                            // Look up the tree for workspace root
                            let mut current = app_parent.to_path_buf();
                            for _ in 0..5 {
                                if current.join("VKNFT").exists() {
                                    search_paths.push(current.join("VKNFT"));
                                    break;
                                }
                                if let Some(p) = current.parent() {
                                    current = p.to_path_buf();
                                } else {
                                    break;
                                }
                            }
                        }
                    }
                }
            }
            
            // Windows/Linux: look in parent directories
            let mut current = exe_dir.to_path_buf();
            for _ in 0..6 {
                if current.join("VKNFT").exists() {
                    search_paths.push(current.join("VKNFT"));
                    break;
                }
                if let Some(p) = current.parent() {
                    current = p.to_path_buf();
                } else {
                    break;
                }
            }
        }
        
        // Return first existing path
        for path in &search_paths {
            if path.exists() {
                return Ok(path.to_string_lossy().to_string());
            }
        }
        
        // Return first search path (will be created if needed)
        if let Some(first) = search_paths.first() {
            return Ok(first.to_string_lossy().to_string());
        }
    }
    
    // Fallback: current directory
    let cwd = std::env::current_dir().map_err(|e| e.to_string())?;
    
    // Walk up to find VKNFT
    let mut current = cwd.clone();
    for _ in 0..6 {
        if current.join("VKNFT").exists() {
            return Ok(current.join("VKNFT").to_string_lossy().to_string());
        }
        if let Some(p) = current.parent() {
            current = p.to_path_buf();
        } else {
            break;
        }
    }
    
    // Default to current directory's VKNFT
    Ok(cwd.join("VKNFT").to_string_lossy().to_string())
}

/// List all connected Ledger devices
#[tauri::command]
fn list_ledger_devices() -> Result<Vec<LedgerDeviceInfo>, String> {
    ledger::list_ledger_devices().map_err(|e| e.to_string())
}

/// Get public key from Ledger
#[tauri::command]
fn get_ledger_public_key(derivation_path: Option<String>) -> Result<LedgerPublicKey, String> {
    ledger::get_public_key(derivation_path.as_deref()).map_err(|e| e.to_string())
}

/// Sign a 32-byte hash with Ledger
#[tauri::command]
fn sign_with_ledger(hash_hex: String, derivation_path: Option<String>) -> Result<LedgerSignature, String> {
    let hash = hex::decode(&hash_hex).map_err(|e| e.to_string())?;
    if hash.len() != 32 {
        return Err("Hash must be exactly 32 bytes".to_string());
    }
    ledger::sign_hash(&hash, derivation_path.as_deref()).map_err(|e| e.to_string())
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
  // macOS での IMK エラーを抑制
  #[cfg(target_os = "macos")]
  {
    std::env::set_var("OS_ACTIVITY_MODE", "disable");
  }

  tauri::Builder::default()
    .setup(|app: &mut tauri::App<tauri::Wry>| {
      if cfg!(debug_assertions) {
        app.handle().plugin(
          tauri_plugin_log::Builder::default()
            .level(log::LevelFilter::Info)
            .build(),
        )?;
      }
      Ok(())
    })
    .plugin(tauri_plugin_fs::init())
    .plugin(tauri_plugin_dialog::init())
    .invoke_handler(tauri::generate_handler![
      get_vknft_base_path,
      list_ledger_devices,
      get_ledger_public_key,
      sign_with_ledger,
    ])
    .run(tauri::generate_context!())
    .expect("error while running tauri application");
}
