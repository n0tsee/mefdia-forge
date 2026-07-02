import { invoke } from "@tauri-apps/api/core";
import { listen, type UnlistenFn } from "@tauri-apps/api/event";
import type {
  MediaInfo,
  Operation,
  QueueItem,
  Settings,
  TaskLogPayload,
  TaskProgressPayload,
  TaskStatusPayload,
} from "./types";

export interface AddTaskGroup {
  inputs: string[];
  operation: Operation;
}

export const api = {
  queueAdd: (groups: AddTaskGroup[]) =>
    invoke<QueueItem[]>("queue_add", { groups }),
  queueStart: () => invoke<void>("queue_start"),
  queueStop: () => invoke<void>("queue_stop"),
  queueCancelTask: (taskId: string) =>
    invoke<void>("queue_cancel_task", { taskId }),
  queueSnapshot: () => invoke<QueueItem[]>("queue_snapshot"),
  queueClearFinished: () => invoke<void>("queue_clear_finished"),
  queueIsRunning: () => invoke<boolean>("queue_is_running"),

  getSettings: () => invoke<Settings>("get_settings"),
  saveSettings: (settings: Settings) =>
    invoke<void>("save_settings", { settings }),

  probeFile: (path: string) => invoke<MediaInfo>("probe_file", { path }),
  pickOutputFolder: () => invoke<string | null>("pick_output_folder"),
  revealPath: (path: string) => invoke<void>("reveal_path", { path }),
  quitApp: () => invoke<void>("quit_app"),
};

export const events = {
  onTaskAdded: (cb: (item: QueueItem) => void): Promise<UnlistenFn> =>
    listen<QueueItem>("task-added", (e) => cb(e.payload)),
  onTaskProgress: (
    cb: (payload: TaskProgressPayload) => void,
  ): Promise<UnlistenFn> =>
    listen<TaskProgressPayload>("task-progress", (e) => cb(e.payload)),
  onTaskStatus: (
    cb: (payload: TaskStatusPayload) => void,
  ): Promise<UnlistenFn> =>
    listen<TaskStatusPayload>("task-status", (e) => cb(e.payload)),
  onTaskLog: (cb: (payload: TaskLogPayload) => void): Promise<UnlistenFn> =>
    listen<TaskLogPayload>("task-log", (e) => cb(e.payload)),
  onQueueDone: (cb: () => void): Promise<UnlistenFn> =>
    listen("queue-done", () => cb()),
};
