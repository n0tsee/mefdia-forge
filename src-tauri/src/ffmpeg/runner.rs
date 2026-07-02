use std::collections::{HashMap, HashSet};
use std::sync::{Arc, Mutex as StdMutex};

use anyhow::{bail, Context, Result};
use tauri::AppHandle;
use tauri_plugin_shell::process::{CommandChild, CommandEvent};
use tokio::sync::Mutex;
use uuid::Uuid;

use super::binary::ffmpeg_sidecar;
use super::progress::{percent, ProgressEvent, ProgressState};

/// Registry of currently-running ffmpeg child processes, keyed by task id,
/// so the queue can kill an individual task (or all of them) on demand.
pub type ChildRegistry = Arc<Mutex<HashMap<Uuid, CommandChild>>>;

/// Tasks that were intentionally killed via `cancel`, so the runner can tell
/// a user-requested cancellation apart from a genuine ffmpeg failure.
pub type CancelledSet = Arc<StdMutex<HashSet<Uuid>>>;

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum RunOutcome {
    Completed,
    Cancelled,
}

/// Marks a task as cancelled and kills its ffmpeg process if it is running.
pub async fn cancel(registry: &ChildRegistry, cancelled: &CancelledSet, task_id: Uuid) {
    cancelled.lock().unwrap().insert(task_id);
    if let Some(child) = registry.lock().await.remove(&task_id) {
        let _ = child.kill();
    }
}

/// Kills every currently running ffmpeg process and marks them all cancelled.
pub async fn cancel_all(registry: &ChildRegistry, cancelled: &CancelledSet) {
    let mut guard = registry.lock().await;
    let ids: Vec<Uuid> = guard.keys().copied().collect();
    cancelled.lock().unwrap().extend(ids);
    for (_, child) in guard.drain() {
        let _ = child.kill();
    }
}

/// Spawns ffmpeg with the given arguments, streams progress + log lines via
/// the provided callbacks, and resolves once the process exits.
///
/// `args` should NOT include the leading global flags (`-y`, `-progress`,
/// etc.) - those are added here so every task gets consistent, parseable
/// output.
pub async fn run_ffmpeg(
    app: &AppHandle,
    task_id: Uuid,
    args: Vec<String>,
    total_duration_secs: f64,
    registry: ChildRegistry,
    cancelled: CancelledSet,
    mut on_progress: impl FnMut(f32) + Send + 'static,
    mut on_log: impl FnMut(String) + Send + 'static,
) -> Result<RunOutcome> {
    let mut full_args: Vec<String> = vec![
        "-y".into(),
        "-hide_banner".into(),
        "-loglevel".into(),
        "error".into(),
        "-progress".into(),
        "pipe:1".into(),
        "-nostats".into(),
    ];
    full_args.extend(args);

    on_log(format!("ffmpeg {}", full_args.join(" ")));

    let command = ffmpeg_sidecar(app)?.args(full_args.iter().map(String::as_str));
    let (mut rx, child) = command.spawn().context("failed to spawn ffmpeg process")?;

    registry.lock().await.insert(task_id, child);

    let mut progress_state = ProgressState::default();
    let mut exit_ok = false;

    while let Some(event) = rx.recv().await {
        match event {
            CommandEvent::Stdout(bytes) => {
                let text = String::from_utf8_lossy(&bytes);
                for line in text.lines() {
                    if let Some(evt) = progress_state.feed_line(line) {
                        match evt {
                            ProgressEvent::Update { out_time_secs } => {
                                on_progress(percent(out_time_secs, total_duration_secs));
                            }
                            ProgressEvent::Ended => on_progress(100.0),
                        }
                    }
                }
            }
            CommandEvent::Stderr(bytes) => {
                let text = String::from_utf8_lossy(&bytes).trim().to_string();
                if !text.is_empty() {
                    on_log(text);
                }
            }
            CommandEvent::Error(err) => on_log(format!("ffmpeg error: {err}")),
            CommandEvent::Terminated(payload) => {
                exit_ok = payload.code == Some(0);
                break;
            }
            _ => {}
        }
    }

    registry.lock().await.remove(&task_id);
    let was_cancelled = cancelled.lock().unwrap().remove(&task_id);

    if was_cancelled {
        on_log("Задача отменена пользователем".into());
        return Ok(RunOutcome::Cancelled);
    }
    if !exit_ok {
        bail!("ffmpeg завершился с ошибкой (см. лог выше)");
    }
    Ok(RunOutcome::Completed)
}
