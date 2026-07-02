use std::fs;
use std::path::PathBuf;

use serde::{Deserialize, Serialize};
use tauri::{AppHandle, Manager};

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum SaveMode {
    NextToOriginal,
    ChooseFolder,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Settings {
    pub save_mode: SaveMode,
    pub custom_output_dir: Option<PathBuf>,
    pub use_output_subfolder: bool,
    pub open_folder_when_done: bool,
    pub play_sound_when_done: bool,
    pub close_app_when_done: bool,
    /// `None` means "auto" - derived from the number of logical cores.
    pub thread_count: Option<usize>,
    /// Use the platform hardware H.264 encoder (VideoToolbox on macOS) instead
    /// of libx264. Much faster and frees the CPU so batches run in parallel.
    #[serde(default = "default_true")]
    pub hardware_accel: bool,
}

fn default_true() -> bool {
    true
}

impl Default for Settings {
    fn default() -> Self {
        Self {
            save_mode: SaveMode::NextToOriginal,
            custom_output_dir: None,
            use_output_subfolder: false,
            open_folder_when_done: true,
            play_sound_when_done: true,
            close_app_when_done: false,
            thread_count: None,
            hardware_accel: true,
        }
    }
}

impl Settings {
    pub fn effective_threads(&self) -> usize {
        self.thread_count.unwrap_or_else(|| num_cpus::get().max(1))
    }

    fn file_path(app: &AppHandle) -> anyhow::Result<PathBuf> {
        let dir = app.path().app_config_dir()?;
        fs::create_dir_all(&dir)?;
        Ok(dir.join("settings.json"))
    }

    pub fn load(app: &AppHandle) -> Self {
        Self::try_load(app).unwrap_or_default()
    }

    fn try_load(app: &AppHandle) -> anyhow::Result<Self> {
        let path = Self::file_path(app)?;
        let raw = fs::read_to_string(path)?;
        Ok(serde_json::from_str(&raw)?)
    }

    pub fn save(&self, app: &AppHandle) -> anyhow::Result<()> {
        let path = Self::file_path(app)?;
        let raw = serde_json::to_string_pretty(self)?;
        fs::write(path, raw)?;
        Ok(())
    }
}
