import { api } from "@/api/tauri";
import type { Operation } from "@/api/types";
import type { FileEntry } from "@/store/useFilesStore";
import { useToastStore } from "@/store/useToastStore";

export async function queueOperationForFiles(
  files: FileEntry[],
  operation: Operation,
  accepts: string[] | null,
) {
  const matching = accepts ? files.filter((f) => accepts.includes(f.ext)) : files;
  if (matching.length === 0) {
    useToastStore.getState().push({
      kind: "error",
      title: "Нет подходящих файлов",
      description: accepts ? `Ожидаются: ${accepts.join(", ")}` : undefined,
    });
    return;
  }
  const groups = matching.map((f) => ({ inputs: [f.path], operation }));
  await api.queueAdd(groups);
  useToastStore.getState().push({
    kind: "success",
    title: `Добавлено в очередь: ${matching.length}`,
  });
}

export async function queueMerge(files: FileEntry[], operation: Operation) {
  if (files.length < 2) {
    useToastStore.getState().push({
      kind: "error",
      title: "Нужно минимум 2 файла для объединения",
    });
    return;
  }
  await api.queueAdd([{ inputs: files.map((f) => f.path), operation }]);
  useToastStore
    .getState()
    .push({ kind: "success", title: "Задача объединения добавлена" });
}
