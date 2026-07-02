import { create } from "zustand";
import { api, events } from "@/api/tauri";
import type { QueueItem } from "@/api/types";

export interface LogLine {
  id: number;
  taskId: string | null;
  message: string;
  time: string;
}

interface QueueState {
  items: Record<string, QueueItem>;
  order: string[];
  logs: LogLine[];
  isRunning: boolean;
  initialized: boolean;
  init: () => Promise<void>;
  start: () => Promise<void>;
  stop: () => Promise<void>;
  cancelTask: (id: string) => Promise<void>;
  clearFinished: () => Promise<void>;
}

let logIdCounter = 0;

export const useQueueStore = create<QueueState>((set, get) => ({
  items: {},
  order: [],
  logs: [],
  isRunning: false,
  initialized: false,

  init: async () => {
    if (get().initialized) return;
    set({ initialized: true });

    const [snapshot, running] = await Promise.all([
      api.queueSnapshot(),
      api.queueIsRunning(),
    ]);
    const items: Record<string, QueueItem> = {};
    const order: string[] = [];
    for (const item of snapshot) {
      items[item.id] = item;
      order.push(item.id);
    }
    set({ items, order, isRunning: running });

    await events.onTaskAdded((item) => {
      set((state) => ({
        items: { ...state.items, [item.id]: item },
        order: state.order.includes(item.id)
          ? state.order
          : [...state.order, item.id],
      }));
    });

    await events.onTaskProgress(({ task_id, percent }) => {
      set((state) => {
        const item = state.items[task_id];
        if (!item) return state;
        return {
          items: { ...state.items, [task_id]: { ...item, progress: percent } },
        };
      });
    });

    await events.onTaskStatus(({ task_id, status, output_path, error }) => {
      set((state) => {
        const item = state.items[task_id];
        if (!item) return state;
        return {
          items: {
            ...state.items,
            [task_id]: {
              ...item,
              status,
              output_path: output_path ?? item.output_path,
              error,
              progress: status === "completed" ? 100 : item.progress,
            },
          },
        };
      });
    });

    await events.onTaskLog(({ task_id, message }) => {
      set((state) => ({
        logs: [
          ...state.logs.slice(-499),
          {
            id: logIdCounter++,
            taskId: task_id,
            message,
            time: new Date().toLocaleTimeString("ru-RU"),
          },
        ],
      }));
    });

    await events.onQueueDone(() => {
      set({ isRunning: false });
    });
  },

  start: async () => {
    set({ isRunning: true });
    await api.queueStart();
  },
  stop: async () => {
    await api.queueStop();
  },
  cancelTask: async (id) => {
    await api.queueCancelTask(id);
  },
  clearFinished: async () => {
    await api.queueClearFinished();
    set((state) => {
      const items: Record<string, QueueItem> = {};
      const order: string[] = [];
      for (const id of state.order) {
        const item = state.items[id];
        if (item && (item.status === "running" || item.status === "probing")) {
          items[id] = item;
          order.push(id);
        }
      }
      return { items, order };
    });
  },
}));

export function selectOverallProgress(state: QueueState): number {
  const list = state.order.map((id) => state.items[id]).filter(Boolean);
  if (list.length === 0) return 0;
  const sum = list.reduce((acc, i) => acc + i.progress, 0);
  return sum / list.length;
}

export function selectHasQueued(state: QueueState): boolean {
  return state.order.some((id) => state.items[id]?.status === "queued");
}

export function selectCounts(state: QueueState) {
  const list = state.order.map((id) => state.items[id]).filter(Boolean);
  return {
    total: list.length,
    completed: list.filter((i) => i.status === "completed").length,
    failed: list.filter((i) => i.status === "failed").length,
    running: list.filter((i) => i.status === "running" || i.status === "probing").length,
  };
}
