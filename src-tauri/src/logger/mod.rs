use std::fs::{self, OpenOptions};
use std::io::Write;
use std::path::PathBuf;
use std::sync::{Arc, Mutex};

use chrono::Local;
use tauri::{AppHandle, Manager};

/// Appends timestamped lines to a per-day log file under the app's log
/// directory, in addition to whatever the caller does with the line (e.g.
/// emitting it to the UI). Cheap `Clone` - safe to hand out to every task.
#[derive(Clone)]
pub struct Logger {
    file_path: Arc<PathBuf>,
    write_lock: Arc<Mutex<()>>,
}

impl Logger {
    pub fn new(app: &AppHandle) -> Self {
        let dir = app
            .path()
            .app_log_dir()
            .unwrap_or_else(|_| PathBuf::from("."));
        let _ = fs::create_dir_all(&dir);
        let file_path = dir.join(format!(
            "mediaforge-{}.log",
            Local::now().format("%Y-%m-%d")
        ));
        Self {
            file_path: Arc::new(file_path),
            write_lock: Arc::new(Mutex::new(())),
        }
    }

    pub fn append(&self, message: &str) {
        let _guard = self.write_lock.lock().unwrap();
        let line = format!("[{}] {}\n", Local::now().format("%H:%M:%S"), message);
        if let Ok(mut file) = OpenOptions::new()
            .create(true)
            .append(true)
            .open(self.file_path.as_ref())
        {
            let _ = file.write_all(line.as_bytes());
        }
    }

    #[allow(dead_code)]
    pub fn log_file_path(&self) -> PathBuf {
        self.file_path.as_ref().clone()
    }
}
