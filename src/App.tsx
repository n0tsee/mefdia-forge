import { useEffect } from "react";
import { api, events } from "@/api/tauri";
import { AppShell } from "@/components/layout/AppShell";
import { ErrorBoundary } from "@/components/common/ErrorBoundary";
import { ToastHost } from "@/components/common/Toast";
import { useQueueStore } from "@/store/useQueueStore";
import { useSettingsStore } from "@/store/useSettingsStore";
import { useToastStore } from "@/store/useToastStore";

function playDoneSound() {
  try {
    const ctx = new AudioContext();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = "sine";
    osc.frequency.value = 880;
    gain.gain.setValueAtTime(0.0001, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.2, ctx.currentTime + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.5);
    osc.connect(gain).connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 0.5);
  } catch {
    // Web Audio unavailable - silently skip the beep.
  }
}

export default function App() {
  useEffect(() => {
    useQueueStore.getState().init();
    useSettingsStore.getState().load();

    const unlisten = events.onQueueDone(async () => {
      const { settings } = useSettingsStore.getState();
      const { items, order } = useQueueStore.getState();
      const completed = order
        .map((id) => items[id])
        .filter((i) => i && i.status === "completed" && i.output_path);

      useToastStore.getState().push({
        kind: "success",
        title: "Готово",
        description: `Обработано файлов: ${completed.length}`,
      });

      if (settings.playSoundWhenDone) playDoneSound();

      if (settings.openFolderWhenDone && completed.length > 0) {
        const path = completed[completed.length - 1].output_path!;
        api.revealPath(path).catch(() => {});
      }

      if (settings.closeAppWhenDone) {
        setTimeout(() => api.quitApp(), 1200);
      }
    });

    return () => {
      unlisten.then((fn) => fn());
    };
  }, []);

  return (
    <ErrorBoundary>
      <AppShell />
      <ToastHost />
    </ErrorBoundary>
  );
}
