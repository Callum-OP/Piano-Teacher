// Shared entry point for the Tauri app (desktop now, mobile-ready for later).
// The frontend is the existing static site in ../build — no extra native glue is
// needed (the web app uses no Electron/Capacitor APIs at runtime).
#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
