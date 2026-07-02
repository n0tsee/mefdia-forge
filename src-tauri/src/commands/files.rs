use tauri::AppHandle;
use tauri_plugin_dialog::DialogExt;
use tauri_plugin_opener::OpenerExt;

use crate::ffmpeg::{self, MediaInfo};

/// Probes a single file (duration, dimensions) - used by the UI to bound the
/// trim slider and to show basic file info before queuing.
#[tauri::command]
pub async fn probe_file(app: AppHandle, path: String) -> Result<MediaInfo, String> {
    ffmpeg::probe(&app, &path).await.map_err(|e| e.to_string())
}

/// Opens the native folder picker for the "Выбрать папку" save-location setting.
#[tauri::command]
pub async fn pick_output_folder(app: AppHandle) -> Result<Option<String>, String> {
    let (tx, rx) = tokio::sync::oneshot::channel();
    app.dialog().file().pick_folder(move |folder| {
        let _ = tx.send(folder.map(|p| p.to_string()));
    });
    rx.await.map_err(|e| e.to_string())
}

/// Reveals a finished output file (or folder) in the OS file explorer -
/// used by the "Открыть папку" post-completion setting.
#[tauri::command]
pub async fn reveal_path(app: AppHandle, path: String) -> Result<(), String> {
    app.opener()
        .reveal_item_in_dir(&path)
        .map_err(|e| e.to_string())
}

/// Closes the app - used by the "Закрыть приложение" post-completion setting.
#[tauri::command]
pub fn quit_app(app: AppHandle) {
    app.exit(0);
}
