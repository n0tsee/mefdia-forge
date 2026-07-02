use tokio::sync::Mutex;

use crate::logger::Logger;
use crate::queue::TaskQueue;
use crate::settings::Settings;

/// Shared app state, registered once via `app.manage(...)` and accessed from
/// every command through `tauri::State<'_, AppState>`.
pub struct AppState {
    pub queue: TaskQueue,
    pub settings: Mutex<Settings>,
    /// Kept alive here so future commands (e.g. "открыть файл лога") can reach
    /// it; the queue already holds its own clone for per-task logging.
    #[allow(dead_code)]
    pub logger: Logger,
}
