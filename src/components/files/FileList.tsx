import { open } from "@tauri-apps/plugin-dialog";
import { getCurrentWebview } from "@tauri-apps/api/webview";
import { AnimatePresence, motion } from "framer-motion";
import { FolderOpen, Trash2, UploadCloud } from "lucide-react";
import { useEffect, useState } from "react";
import { Button } from "@/components/common/Button";
import { useFilesStore } from "@/store/useFilesStore";
import { FileListItem } from "./FileListItem";

const ALL_MEDIA_EXTS = [
  "mp4",
  "mov",
  "avi",
  "mkv",
  "webm",
  "m4v",
  "mp3",
  "ogg",
  "wav",
  "aac",
  "m4a",
  "flac",
  "opus",
  "jpg",
  "jpeg",
  "png",
  "webp",
  "bmp",
  "tiff",
  "tif",
];

export function FileList() {
  const files = useFilesStore((s) => s.files);
  const addPaths = useFilesStore((s) => s.addPaths);
  const removeFile = useFilesStore((s) => s.removeFile);
  const clear = useFilesStore((s) => s.clear);
  const [isDragging, setIsDragging] = useState(false);

  useEffect(() => {
    let unlisten: (() => void) | undefined;
    // Guard against non-Tauri contexts (e.g. running the built assets in a
    // plain browser during debugging) where the webview API is unavailable.
    try {
      getCurrentWebview()
        .onDragDropEvent((event) => {
          if (event.payload.type === "enter" || event.payload.type === "over") {
            setIsDragging(true);
          } else if (event.payload.type === "drop") {
            setIsDragging(false);
            addPaths(event.payload.paths);
          } else {
            setIsDragging(false);
          }
        })
        .then((fn) => {
          unlisten = fn;
        })
        .catch(() => {});
    } catch {
      // no-op: drag&drop simply stays disabled outside Tauri
    }
    return () => unlisten?.();
  }, [addPaths]);

  async function handleBrowse() {
    const selection = await open({
      multiple: true,
      filters: [{ name: "Медиафайлы", extensions: ALL_MEDIA_EXTS }],
    });
    if (!selection) return;
    const paths = Array.isArray(selection) ? selection : [selection];
    addPaths(paths);
  }

  return (
    <div className="relative flex h-full flex-col">
      <div className="flex items-center justify-between px-1 pb-3">
        <h2 className="text-sm font-semibold text-base-100">
          Файлы {files.length > 0 && <span className="text-base-400">· {files.length}</span>}
        </h2>
        <div className="flex gap-1.5">
          <Button size="sm" variant="ghost" onClick={handleBrowse}>
            <FolderOpen size={14} /> Добавить
          </Button>
          <Button
            size="sm"
            variant="ghost"
            onClick={clear}
            disabled={files.length === 0}
          >
            <Trash2 size={14} /> Очистить
          </Button>
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto rounded-xl border border-base-700 bg-base-900/60 p-1.5">
        {files.length === 0 ? (
          <div className="flex h-full flex-col items-center justify-center gap-2 px-4 text-center text-base-400">
            <UploadCloud size={28} className="text-base-500" />
            <p className="text-sm">Перетащите файлы сюда</p>
            <p className="text-xs text-base-500">или нажмите «Добавить»</p>
          </div>
        ) : (
          <ul className="flex flex-col gap-0.5">
            <AnimatePresence initial={false}>
              {files.map((file) => (
                <FileListItem
                  key={file.path}
                  file={file}
                  onRemove={() => removeFile(file.path)}
                />
              ))}
            </AnimatePresence>
          </ul>
        )}
      </div>

      <AnimatePresence>
        {isDragging && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-accent bg-accent/10 backdrop-blur-sm"
          >
            <UploadCloud size={36} className="text-accent" />
            <p className="text-sm font-medium text-accent">Отпустите, чтобы добавить</p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
