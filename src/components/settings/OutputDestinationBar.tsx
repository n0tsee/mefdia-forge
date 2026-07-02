import { Folder, FolderInput, FolderPlus } from "lucide-react";
import type { ReactNode } from "react";
import { api } from "@/api/tauri";
import { useSettingsStore } from "@/store/useSettingsStore";
import type { Settings } from "@/api/types";

type Preset = "subfolder" | "next" | "custom";

/// Persistent, always-visible control for where processed files are written.
/// Mirrors the (also-available) options in the settings drawer, but surfaced
/// on the main screen so the user never has to hunt for it.
function currentPreset(s: Settings): Preset {
  if (s.saveMode === "choose_folder") return "custom";
  return s.useOutputSubfolder ? "subfolder" : "next";
}

export function OutputDestinationBar() {
  const settings = useSettingsStore((s) => s.settings);
  const update = useSettingsStore((s) => s.update);
  const preset = currentPreset(settings);

  async function choosePreset(next: Preset) {
    if (next === "subfolder") {
      await update({ saveMode: "next_to_original", useOutputSubfolder: true });
    } else if (next === "next") {
      await update({ saveMode: "next_to_original", useOutputSubfolder: false });
    } else {
      const folder = await api.pickOutputFolder();
      if (folder) {
        await update({ saveMode: "choose_folder", customOutputDir: folder });
      }
    }
  }

  const options: { id: Preset; label: string; icon: ReactNode }[] = [
    { id: "subfolder", label: "Подпапка Output", icon: <FolderPlus size={13} /> },
    { id: "next", label: "Рядом с оригиналом", icon: <FolderInput size={13} /> },
    { id: "custom", label: "Выбрать папку…", icon: <Folder size={13} /> },
  ];

  return (
    <div className="mb-3 flex flex-col gap-1.5 rounded-xl border border-base-700 bg-base-850 px-3 py-2.5">
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium text-base-300">Куда сохранять результат</span>
      </div>
      <div className="flex flex-wrap gap-1.5">
        {options.map((opt) => (
          <button
            key={opt.id}
            onClick={() => choosePreset(opt.id)}
            className={`inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-xs font-medium transition-colors ${
              preset === opt.id
                ? "border-accent bg-accent/15 text-accent"
                : "border-base-600 bg-base-800 text-base-300 hover:border-base-500"
            }`}
          >
            {opt.icon}
            {opt.label}
          </button>
        ))}
      </div>
      {preset === "custom" && settings.customOutputDir && (
        <p className="truncate text-[11px] text-base-500" title={settings.customOutputDir}>
          → {settings.customOutputDir}
        </p>
      )}
    </div>
  );
}
