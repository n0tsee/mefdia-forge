use std::path::{Path, PathBuf};
use std::sync::atomic::{AtomicBool, Ordering};
use std::sync::Arc;

use serde::Serialize;
use tauri::{AppHandle, Emitter};
use tokio::sync::{Mutex, Semaphore};
use uuid::Uuid;

use crate::ffmpeg::{self, runner::CancelledSet, ChildRegistry, RunOutcome};
use crate::logger::Logger;
use crate::settings::{SaveMode, Settings};
use crate::tasks::ops::encode::{EncodeCtx, H264Encoder};
use crate::tasks::types::Operation;
use crate::utils;

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize)]
#[serde(rename_all = "snake_case")]
pub enum TaskStatus {
    Queued,
    Probing,
    Running,
    Completed,
    Failed,
    Cancelled,
}

#[derive(Debug, Clone, Serialize)]
pub struct QueueItem {
    pub id: Uuid,
    pub source_name: String,
    pub inputs: Vec<PathBuf>,
    pub operation: Operation,
    pub status: TaskStatus,
    pub progress: f32,
    pub output_path: Option<PathBuf>,
    pub error: Option<String>,
}

#[derive(Clone, Serialize)]
struct TaskProgressPayload {
    task_id: Uuid,
    percent: f32,
}

#[derive(Clone, Serialize)]
struct TaskStatusPayload {
    task_id: Uuid,
    status: TaskStatus,
    output_path: Option<PathBuf>,
    error: Option<String>,
}

#[derive(Clone, Serialize)]
struct TaskLogPayload {
    task_id: Option<Uuid>,
    message: String,
}

/// Owns the ordered list of batch tasks and drives their execution with a
/// bounded amount of parallelism. All mutation happens behind a single
/// `tokio::sync::Mutex` so the UI's snapshot view is always consistent.
#[derive(Clone)]
pub struct TaskQueue {
    app: AppHandle,
    items: Arc<Mutex<Vec<QueueItem>>>,
    registry: ChildRegistry,
    cancelled: CancelledSet,
    running: Arc<AtomicBool>,
    stop_requested: Arc<AtomicBool>,
    logger: Logger,
    /// Detected hardware H.264 encoder, probed once on first run and reused.
    hw_encoder: Arc<Mutex<Option<H264Encoder>>>,
}

impl TaskQueue {
    pub fn new(app: AppHandle, logger: Logger) -> Self {
        Self {
            app,
            items: Arc::new(Mutex::new(Vec::new())),
            registry: Arc::new(Mutex::new(std::collections::HashMap::new())),
            cancelled: Arc::new(std::sync::Mutex::new(std::collections::HashSet::new())),
            running: Arc::new(AtomicBool::new(false)),
            stop_requested: Arc::new(AtomicBool::new(false)),
            logger,
            hw_encoder: Arc::new(Mutex::new(None)),
        }
    }

    /// Returns the hardware encoder for this machine, detecting it once and
    /// caching the result for subsequent runs.
    async fn hardware_encoder(&self) -> H264Encoder {
        let mut cached = self.hw_encoder.lock().await;
        if let Some(enc) = *cached {
            return enc;
        }
        let detected = H264Encoder::detect(&self.app).await;
        *cached = Some(detected);
        detected
    }

    pub fn is_running(&self) -> bool {
        self.running.load(Ordering::SeqCst)
    }

    /// Adds one queued item per `(inputs, operation)` group and returns their ids.
    /// A "group" is normally a single input file, except for `MergeVideos`
    /// where every selected file is one group with multiple inputs.
    pub async fn add_tasks(&self, groups: Vec<(Vec<PathBuf>, Operation)>) -> Vec<QueueItem> {
        let mut items = self.items.lock().await;
        let mut added = Vec::with_capacity(groups.len());

        for (inputs, operation) in groups {
            let source_name = inputs
                .first()
                .and_then(|p| p.file_name())
                .map(|n| n.to_string_lossy().to_string())
                .unwrap_or_else(|| "?".to_string());

            let item = QueueItem {
                id: Uuid::new_v4(),
                source_name,
                inputs,
                operation,
                status: TaskStatus::Queued,
                progress: 0.0,
                output_path: None,
                error: None,
            };
            items.push(item.clone());
            added.push(item);
        }

        drop(items);
        for item in &added {
            let _ = self.app.emit("task-added", item.clone());
        }
        added
    }

    pub async fn snapshot(&self) -> Vec<QueueItem> {
        self.items.lock().await.clone()
    }

    /// Removes every task that isn't currently running (queued/completed/failed/cancelled).
    pub async fn clear_finished(&self) {
        let mut items = self.items.lock().await;
        items.retain(|i| i.status == TaskStatus::Running || i.status == TaskStatus::Probing);
    }

    /// Runs every currently-queued task with up to `settings.effective_threads()`
    /// running concurrently. Resolves once the whole batch has settled
    /// (completed, failed, or cancelled).
    pub async fn start(&self, settings: Settings) {
        if self.running.swap(true, Ordering::SeqCst) {
            return;
        }
        self.stop_requested.store(false, Ordering::SeqCst);

        let queued_ids: Vec<Uuid> = {
            let items = self.items.lock().await;
            items
                .iter()
                .filter(|i| i.status == TaskStatus::Queued)
                .map(|i| i.id)
                .collect()
        };

        self.log(None, format!("Начало обработки: {} задач(и)", queued_ids.len()))
            .await;

        if settings.hardware_accel {
            let enc = self.hardware_encoder().await;
            self.log(None, format!("Кодировщик видео: {}", enc.label())).await;
        } else {
            self.log(None, "Кодировщик видео: libx264 (CPU) — ускорение выключено".into())
                .await;
        }

        let concurrency = settings.effective_threads().max(1);
        let semaphore = Arc::new(Semaphore::new(concurrency));
        let mut handles = Vec::with_capacity(queued_ids.len());

        for id in queued_ids {
            let permit_sem = semaphore.clone();
            let this = self.clone();
            let settings = settings.clone();
            handles.push(tauri::async_runtime::spawn(async move {
                let _permit = permit_sem.acquire_owned().await.expect("semaphore closed");
                this.run_one(id, &settings).await;
            }));
        }

        for h in handles {
            let _ = h.await;
        }

        self.running.store(false, Ordering::SeqCst);
        self.log(None, "Очередь обработана".to_string()).await;
        let _ = self.app.emit("queue-done", ());
    }

    /// Stops the whole batch: kills every running ffmpeg process and marks
    /// every not-yet-started task as cancelled.
    pub async fn stop(&self) {
        self.stop_requested.store(true, Ordering::SeqCst);
        ffmpeg::runner::cancel_all(&self.registry, &self.cancelled).await;
        self.log(None, "Остановка очереди...".to_string()).await;
    }

    /// Cancels a single task (queued or running).
    pub async fn cancel_task(&self, id: Uuid) {
        {
            let items = self.items.lock().await;
            if let Some(item) = items.iter().find(|i| i.id == id) {
                if item.status == TaskStatus::Queued {
                    drop(items);
                    self.set_status(id, TaskStatus::Cancelled, None, None).await;
                    return;
                }
            }
        }
        ffmpeg::runner::cancel(&self.registry, &self.cancelled, id).await;
    }

    async fn run_one(&self, id: Uuid, settings: &Settings) {
        if self.stop_requested.load(Ordering::SeqCst) {
            self.set_status(id, TaskStatus::Cancelled, None, None).await;
            return;
        }

        let (inputs, operation) = {
            let items = self.items.lock().await;
            match items.iter().find(|i| i.id == id) {
                Some(item) => {
                    if item.status == TaskStatus::Cancelled {
                        return;
                    }
                    (item.inputs.clone(), item.operation.clone())
                }
                None => return,
            }
        };

        self.set_status(id, TaskStatus::Probing, None, None).await;

        let probe_target = utils::path_str(&inputs[0]);
        let media_info = match ffmpeg::probe(&self.app, &probe_target).await {
            Ok(info) => info,
            Err(e) => {
                self.fail(id, format!("Не удалось прочитать файл: {e}")).await;
                return;
            }
        };

        let output = compute_output_path(&inputs[0], &operation, settings);
        if let Err(e) = prepare_output_location(&output, &operation) {
            self.fail(id, format!("Не удалось подготовить папку вывода: {e}"))
                .await;
            return;
        }

        let encoder = if settings.hardware_accel {
            self.hardware_encoder().await
        } else {
            H264Encoder::Software
        };
        let encode_ctx = EncodeCtx {
            encoder,
            width: media_info.width,
            height: media_info.height,
        };
        let args = crate::tasks::build_args(&operation, &inputs, &output, &encode_ctx);
        self.set_status(id, TaskStatus::Running, None, None).await;

        let progress_queue = self.clone();
        let on_progress = move |percent: f32| {
            let q = progress_queue.clone();
            tauri::async_runtime::spawn(async move {
                q.set_progress(id, percent).await;
            });
        };

        let log_queue = self.clone();
        let on_log = move |line: String| {
            let q = log_queue.clone();
            tauri::async_runtime::spawn(async move {
                q.log(Some(id), line).await;
            });
        };

        let result = ffmpeg::run_ffmpeg(
            &self.app,
            id,
            args,
            media_info.duration_secs,
            self.registry.clone(),
            self.cancelled.clone(),
            on_progress,
            on_log,
        )
        .await;

        match result {
            Ok(RunOutcome::Completed) => {
                self.set_status(id, TaskStatus::Completed, Some(output), None)
                    .await;
            }
            Ok(RunOutcome::Cancelled) => {
                self.set_status(id, TaskStatus::Cancelled, None, None).await;
            }
            Err(e) => self.fail(id, e.to_string()).await,
        }
    }

    async fn set_status(
        &self,
        id: Uuid,
        status: TaskStatus,
        output: Option<PathBuf>,
        error: Option<String>,
    ) {
        {
            let mut items = self.items.lock().await;
            if let Some(item) = items.iter_mut().find(|i| i.id == id) {
                item.status = status;
                if output.is_some() {
                    item.output_path = output.clone();
                }
                item.error = error.clone();
                if status == TaskStatus::Completed {
                    item.progress = 100.0;
                }
            }
        }
        let _ = self.app.emit(
            "task-status",
            TaskStatusPayload {
                task_id: id,
                status,
                output_path: output,
                error,
            },
        );
    }

    async fn set_progress(&self, id: Uuid, percent: f32) {
        {
            let mut items = self.items.lock().await;
            if let Some(item) = items.iter_mut().find(|i| i.id == id) {
                item.progress = percent;
            }
        }
        let _ = self
            .app
            .emit("task-progress", TaskProgressPayload { task_id: id, percent });
    }

    async fn log(&self, task_id: Option<Uuid>, message: String) {
        self.logger.append(&message);
        let _ = self.app.emit(
            "task-log",
            TaskLogPayload {
                task_id,
                message,
            },
        );
    }

    async fn fail(&self, id: Uuid, message: String) {
        self.log(Some(id), message.clone()).await;
        self.set_status(id, TaskStatus::Failed, None, Some(message))
            .await;
    }
}

fn default_suffix(operation: &Operation) -> Option<&'static str> {
    match operation {
        Operation::CompressVideo { .. } => Some("_compressed"),
        Operation::Trim { .. } => Some("_trim"),
        Operation::Rotate { .. } => Some("_rotated"),
        Operation::ChangeSpeed { .. } => Some("_speed"),
        Operation::ChangeResolution { .. } => Some("_resized"),
        Operation::ChangeFps { .. } => Some("_fps"),
        Operation::ChangeBitrate { .. } => Some("_bitrate"),
        Operation::AdaptImage { .. } => Some("_adapted"),
        Operation::MergeVideos => Some("_merged"),
        _ => None,
    }
}

fn resolve_target_dir(input: &Path, settings: &Settings) -> PathBuf {
    let base = match settings.save_mode {
        SaveMode::NextToOriginal => input
            .parent()
            .map(Path::to_path_buf)
            .unwrap_or_else(|| PathBuf::from(".")),
        SaveMode::ChooseFolder => settings
            .custom_output_dir
            .clone()
            .unwrap_or_else(|| input.parent().map(Path::to_path_buf).unwrap_or_else(|| PathBuf::from("."))),
    };
    if settings.use_output_subfolder {
        base.join("Output")
    } else {
        base
    }
}

fn compute_output_path(input: &Path, operation: &Operation, settings: &Settings) -> PathBuf {
    if operation.produces_directory() {
        let dir = resolve_target_dir(input, settings);
        let stem = input
            .file_stem()
            .map(|s| s.to_string_lossy().to_string())
            .unwrap_or_else(|| "frames".to_string());
        let mut candidate = dir.join(format!("{stem}_frames"));
        let mut n = 1;
        while candidate.exists() {
            candidate = dir.join(format!("{stem}_frames ({n})"));
            n += 1;
        }
        return candidate;
    }

    let target_dir = resolve_target_dir(input, settings);
    utils::build_output_path(
        input,
        Some(&target_dir),
        false, // subfolder already folded into target_dir above
        operation.output_extension(),
        default_suffix(operation),
    )
}

fn prepare_output_location(output: &Path, operation: &Operation) -> std::io::Result<()> {
    if operation.produces_directory() {
        std::fs::create_dir_all(output)
    } else if let Some(parent) = output.parent() {
        std::fs::create_dir_all(parent)
    } else {
        Ok(())
    }
}
