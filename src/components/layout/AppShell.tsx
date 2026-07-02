import { Settings } from "lucide-react";
import { useState } from "react";
import { ActionsPanel } from "@/components/actions/ActionsPanel";
import { BottomBar } from "@/components/queue/BottomBar";
import { FileList } from "@/components/files/FileList";
import { OutputDestinationBar } from "@/components/settings/OutputDestinationBar";
import { SettingsDrawer } from "@/components/settings/SettingsDrawer";

export function AppShell() {
  const [settingsOpen, setSettingsOpen] = useState(false);

  return (
    <div className="flex h-screen flex-col bg-base-950">
      <header
        data-tauri-drag-region
        className="flex h-11 shrink-0 items-center justify-between border-b border-base-800 px-4"
      >
        <span className="pointer-events-none text-xs font-semibold tracking-wide text-base-400">
          MediaForge
        </span>
        <button
          onClick={() => setSettingsOpen(true)}
          className="rounded-lg p-1.5 text-base-400 hover:bg-base-800 hover:text-base-100"
          title="Настройки"
        >
          <Settings size={16} />
        </button>
      </header>

      <main className="grid min-h-0 flex-1 grid-cols-[1fr_1.1fr] gap-4 p-4">
        <section className="min-h-0">
          <FileList />
        </section>
        <section className="flex min-h-0 flex-col overflow-y-auto rounded-xl2 border border-base-700 bg-base-900/40 p-4">
          <OutputDestinationBar />
          <ActionsPanel />
        </section>
      </main>

      <BottomBar />
      <SettingsDrawer open={settingsOpen} onClose={() => setSettingsOpen(false)} />
    </div>
  );
}
