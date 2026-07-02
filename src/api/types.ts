// Mirrors the Rust types in src-tauri/src/tasks/types.ts, src-tauri/src/queue,
// src-tauri/src/settings and src-tauri/src/ffmpeg/probe.rs. Field/variant
// casing here must match what serde actually produces - see the comments
// next to each type for which Rust type it mirrors.

export type CompressLevel = "strong" | "medium" | "lossless";

export type VideoFormat = "mp4" | "mov" | "avi" | "mkv" | "webm" | "m4v";

export type AudioFormat = "mp3" | "ogg" | "wav" | "aac" | "m4a" | "flac" | "opus";

export type RotateDegrees = "cw90" | "ccw90" | "rotate180";

export type ImageFit = "contain" | "cover" | "stretch";

export type ImageFormat = "jpg" | "png";

export type FrameExtractMode =
  | { mode: "interval"; seconds: number }
  | { mode: "fps"; fps: number }
  | { mode: "thumbnail" };

// tasks::types::Operation
export type Operation =
  | { kind: "telegram_voice" }
  | { kind: "telegram_video_note" }
  | { kind: "compress_video"; level: CompressLevel }
  | { kind: "convert_video"; format: VideoFormat }
  | { kind: "convert_audio"; format: AudioFormat }
  | { kind: "extract_audio"; format: AudioFormat }
  | { kind: "extract_frames"; mode: FrameExtractMode }
  | { kind: "gif"; fps: number; width: number | null; height: number | null }
  | { kind: "adapt_image"; width: number; height: number; fit: ImageFit; format: ImageFormat }
  | { kind: "change_fps"; fps: number }
  | { kind: "change_resolution"; width: number; height: number }
  | { kind: "trim"; start_secs: number; end_secs: number | null }
  | { kind: "rotate"; degrees: RotateDegrees }
  | { kind: "change_speed"; factor: number }
  | { kind: "change_bitrate"; video_kbps: number | null; audio_kbps: number | null }
  | { kind: "merge_videos" };

// queue::TaskStatus
export type TaskStatus =
  | "queued"
  | "probing"
  | "running"
  | "completed"
  | "failed"
  | "cancelled";

// queue::QueueItem
export interface QueueItem {
  id: string;
  source_name: string;
  inputs: string[];
  operation: Operation;
  status: TaskStatus;
  progress: number;
  output_path: string | null;
  error: string | null;
}

export interface TaskProgressPayload {
  task_id: string;
  percent: number;
}

export interface TaskStatusPayload {
  task_id: string;
  status: TaskStatus;
  output_path: string | null;
  error: string | null;
}

export interface TaskLogPayload {
  task_id: string | null;
  message: string;
}

// settings::SaveMode (unit enum -> plain snake_case string)
export type SaveMode = "next_to_original" | "choose_folder";

// settings::Settings (struct has #[serde(rename_all = "camelCase")])
export interface Settings {
  saveMode: SaveMode;
  customOutputDir: string | null;
  useOutputSubfolder: boolean;
  openFolderWhenDone: boolean;
  playSoundWhenDone: boolean;
  closeAppWhenDone: boolean;
  threadCount: number | null;
  hardwareAccel: boolean;
}

// ffmpeg::probe::MediaInfo
export interface MediaInfo {
  duration_secs: number;
  width: number | null;
  height: number | null;
  has_video: boolean;
  has_audio: boolean;
}
