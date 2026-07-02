use anyhow::{Context, Result};
use tauri::AppHandle;
use tauri_plugin_shell::{process::Command, ShellExt};

/// Resolves the bundled `ffmpeg` sidecar for the current platform.
/// The actual binary is picked by Tauri from `src-tauri/binaries/` based on
/// the `externalBin` entries declared in `tauri.conf.json`.
pub fn ffmpeg_sidecar(app: &AppHandle) -> Result<Command> {
    app.shell()
        .sidecar("ffmpeg")
        .context("ffmpeg sidecar binary not found - see src-tauri/binaries/README.md")
}

/// Resolves the bundled `ffprobe` sidecar for the current platform.
pub fn ffprobe_sidecar(app: &AppHandle) -> Result<Command> {
    app.shell()
        .sidecar("ffprobe")
        .context("ffprobe sidecar binary not found - see src-tauri/binaries/README.md")
}
