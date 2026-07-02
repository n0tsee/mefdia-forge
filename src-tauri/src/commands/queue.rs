use std::path::PathBuf;

use serde::Deserialize;
use tauri::State;
use uuid::Uuid;

use crate::queue::QueueItem;
use crate::state::AppState;
use crate::tasks::types::Operation;

#[derive(Debug, Deserialize)]
pub struct AddTaskGroup {
    pub inputs: Vec<String>,
    pub operation: Operation,
}

/// Queues one task per group (a group has >1 input only for `merge_videos`).
/// Tasks start in the `Queued` status; call `queue_start` to actually run them.
#[tauri::command]
pub async fn queue_add(
    state: State<'_, AppState>,
    groups: Vec<AddTaskGroup>,
) -> Result<Vec<QueueItem>, String> {
    let groups: Vec<(Vec<PathBuf>, Operation)> = groups
        .into_iter()
        .map(|g| {
            (
                g.inputs.into_iter().map(PathBuf::from).collect(),
                g.operation,
            )
        })
        .collect();
    Ok(state.queue.add_tasks(groups).await)
}

/// Kicks off processing of every queued task and returns immediately - the
/// UI observes progress via the `task-progress` / `task-status` / `queue-done`
/// events instead of waiting on this call.
#[tauri::command]
pub async fn queue_start(state: State<'_, AppState>) -> Result<(), String> {
    let settings = state.settings.lock().await.clone();
    let queue = state.queue.clone();
    tauri::async_runtime::spawn(async move {
        queue.start(settings).await;
    });
    Ok(())
}

#[tauri::command]
pub async fn queue_stop(state: State<'_, AppState>) -> Result<(), String> {
    state.queue.stop().await;
    Ok(())
}

#[tauri::command]
pub async fn queue_cancel_task(state: State<'_, AppState>, task_id: Uuid) -> Result<(), String> {
    state.queue.cancel_task(task_id).await;
    Ok(())
}

#[tauri::command]
pub async fn queue_snapshot(state: State<'_, AppState>) -> Result<Vec<QueueItem>, String> {
    Ok(state.queue.snapshot().await)
}

#[tauri::command]
pub async fn queue_clear_finished(state: State<'_, AppState>) -> Result<(), String> {
    state.queue.clear_finished().await;
    Ok(())
}

#[tauri::command]
pub fn queue_is_running(state: State<'_, AppState>) -> Result<bool, String> {
    Ok(state.queue.is_running())
}
