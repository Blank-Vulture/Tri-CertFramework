#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
  // macOS での IMK エラーを抑制
  #[cfg(target_os = "macos")]
  {
    std::env::set_var("OS_ACTIVITY_MODE", "disable");
  }

  tauri::Builder::default()
    .setup(|app| {
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
    .run(tauri::generate_context!())
    .expect("error while running tauri application");
}
