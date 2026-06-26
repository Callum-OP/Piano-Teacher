// Shared entry point for the Tauri app (desktop now, mobile-ready for later).
// The frontend is the existing static site in ../build — the only native glue is the
// one-time saved-music recovery from the old Electron build (see migrate.rs).
mod migrate;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .invoke_handler(tauri::generate_handler![migrate::legacy_custom_music])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
