import { useEffect, useRef } from "react";
import { useQueueStore } from "@/store/useQueueStore";

export function LogPanel() {
  const logs = useQueueStore((s) => s.logs);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ block: "end" });
  }, [logs.length]);

  return (
    <div className="h-full overflow-y-auto rounded-lg bg-base-950/70 p-2.5 font-mono text-[11px] leading-relaxed">
      {logs.length === 0 ? (
        <p className="text-base-500">Лог пуст - запустите обработку, чтобы увидеть детали.</p>
      ) : (
        logs.map((line) => (
          <div key={line.id} className="flex gap-2 text-base-300">
            <span className="shrink-0 text-base-600">{line.time}</span>
            <span className="whitespace-pre-wrap break-all">{line.message}</span>
          </div>
        ))
      )}
      <div ref={bottomRef} />
    </div>
  );
}
