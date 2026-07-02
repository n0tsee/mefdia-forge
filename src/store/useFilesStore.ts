import { create } from "zustand";

export interface FileEntry {
  path: string;
  name: string;
  ext: string;
}

interface FilesState {
  files: FileEntry[];
  addPaths: (paths: string[]) => void;
  removeFile: (path: string) => void;
  clear: () => void;
}

function toEntry(path: string): FileEntry {
  const name = path.split(/[\\/]/).pop() ?? path;
  const dot = name.lastIndexOf(".");
  const ext = dot > 0 ? name.slice(dot + 1).toLowerCase() : "";
  return { path, name, ext };
}

export const useFilesStore = create<FilesState>((set) => ({
  files: [],
  addPaths: (paths) =>
    set((state) => {
      const existing = new Set(state.files.map((f) => f.path));
      const additions = paths.filter((p) => !existing.has(p)).map(toEntry);
      return additions.length ? { files: [...state.files, ...additions] } : state;
    }),
  removeFile: (path) =>
    set((state) => ({ files: state.files.filter((f) => f.path !== path) })),
  clear: () => set({ files: [] }),
}));
