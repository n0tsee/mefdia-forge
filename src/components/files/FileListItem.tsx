import { motion } from "framer-motion";
import { FileAudio, FileVideo, X } from "lucide-react";
import type { FileEntry } from "@/store/useFilesStore";

const VIDEO_EXTS = new Set(["mp4", "mov", "avi", "mkv", "webm", "m4v"]);

export function FileListItem({
  file,
  onRemove,
}: {
  file: FileEntry;
  onRemove: () => void;
}) {
  const isVideo = VIDEO_EXTS.has(file.ext);

  return (
    <motion.li
      layout
      initial={{ opacity: 0, x: -8 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 8 }}
      className="group flex items-center gap-2.5 rounded-lg px-2.5 py-2 hover:bg-base-800"
    >
      {isVideo ? (
        <FileVideo size={16} className="shrink-0 text-accent" />
      ) : (
        <FileAudio size={16} className="shrink-0 text-base-300" />
      )}
      <span className="min-w-0 flex-1 truncate text-sm text-base-200" title={file.path}>
        {file.name}
      </span>
      <span className="shrink-0 rounded bg-base-700 px-1.5 py-0.5 text-[10px] uppercase text-base-300">
        {file.ext || "?"}
      </span>
      <button
        onClick={onRemove}
        className="shrink-0 rounded p-1 text-base-400 opacity-0 transition-opacity hover:bg-base-700 hover:text-danger group-hover:opacity-100"
        title="Удалить"
      >
        <X size={14} />
      </button>
    </motion.li>
  );
}
