mod ledger;

use ledger::{LedgerDeviceInfo, LedgerPublicKey, LedgerSignature};

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
      list_ledger_devices,
      get_ledger_public_key,
      sign_with_ledger,
    ])
    .run(tauri::generate_context!())
    .expect("error while running tauri application");
}
