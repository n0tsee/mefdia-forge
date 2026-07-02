import { ChevronUp, Play, Square } from "lucide-react";
import { useMemo, useState } from "react";
import { Button } from "@/components/common/Button";
import { useQueueStore } from "@/store/useQueueStore";
import { LogPanel } from "./LogPanel";
import { ProgressBar } from "./ProgressBar";

export function BottomBar() {
  const [logOpen, setLogOpen] = useState(false);
  const isRunning = useQueueStore((s) => s.isRunning);
  const start = useQueueStore((s) => s.start);
  const stop = useQueueStore((s) => s.stop);

  // Subscribe to the raw (stable-reference) slices and derive everything with
  // useMemo, so we never hand Zustand a selector that returns a fresh object
  // (which would trigger an infinite getSnapshot loop).
  const items = useQueueStore((s) => s.items);
  const order = useQueueStore((s) => s.order);

  const { progress, counts, hasQueued } = useMemo(() => {
    const list = order.map((id) => items[id]).filter(Boolean);
    const total = list.length;
    const sum = list.reduce((acc, i) => acc + i.progress, 0);
    return {
      progress: total === 0 ? 0 : sum / total,
      hasQueued: list.some((i) => i.status === "queued"),
      counts: {
        total,
        completed: list.filter((i) => i.status === "completed").length,
        failed: list.filter((i) => i.status === "failed").length,
        running: list.filter((i) => i.status === "running" || i.status === "probing").length,
      },
    };
  }, [items, order]);

  return (
    <div className="border-t border-base-700 bg-base-900">
      <div
        className="grid overflow-hidden transition-[grid-template-rows] duration-200 ease-out"
        style={{ gridTemplateRows: logOpen ? "1fr" : "0fr" }}
      >
        <div className="min-h-0 px-4 pt-3">
          <div className="h-40">
            <LogPanel />
          </div>
        </div>
      </div>

      <div className="flex items-center gap-4 px-4 py-3">
        <div className="flex gap-2">
          <Button variant="primary" disabled={isRunning || !hasQueued} onClick={() => start()}>
            <Play size={15} /> Начать
          </Button>
          <Button variant="danger" disabled={!isRunning} onClick={() => stop()}>
            <Square size={15} /> Остановить
          </Button>
        </div>

        <div className="min-w-0 flex-1">
          <div className="mb-1 flex items-center justify-between text-xs text-base-400">
            <span>
              {counts.total === 0
                ? "Очередь пуста"
                : `${counts.completed}/${counts.total} завершено${
                    counts.failed ? ` · ${counts.failed} ошибок` : ""
                  }`}
            </span>
            <span>{Math.round(progress)}%</span>
          </div>
          <ProgressBar percent={progress} tone={counts.failed > 0 ? "danger" : "accent"} />
        </div>

        <button
          onClick={() => setLogOpen((v) => !v)}
          className="flex shrink-0 items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs text-base-300 hover:bg-base-800"
        >
          Лог
          <ChevronUp
            size={14}
            className={`transition-transform ${logOpen ? "" : "rotate-180"}`}
          />
        </button>
      </div>
    </div>
  );
}
