import { create } from "zustand";
import { api } from "@/api/tauri";
import type { Settings } from "@/api/types";

const DEFAULT_SETTINGS: Settings = {
  saveMode: "next_to_original",
  customOutputDir: null,
  // Default to a dedicated "Output" subfolder so results don't get mixed in
  // with the source files.
  useOutputSubfolder: true,
  openFolderWhenDone: true,
  playSoundWhenDone: true,
  closeAppWhenDone: false,
  threadCount: null,
  hardwareAccel: true,
};

interface SettingsState {
  settings: Settings;
  loaded: boolean;
  load: () => Promise<void>;
  update: (patch: Partial<Settings>) => Promise<void>;
}

export const useSettingsStore = create<SettingsState>((set, get) => ({
  settings: DEFAULT_SETTINGS,
  loaded: false,
  load: async () => {
    try {
      const settings = await api.getSettings();
      set({ settings, loaded: true });
    } catch {
      set({ loaded: true });
    }
  },
  update: async (patch) => {
    const next = { ...get().settings, ...patch };
    set({ settings: next });
    await api.saveSettings(next);
  },
}));
