import { AnimatePresence, motion } from "framer-motion";
import { useState } from "react";
import { ACTION_CARDS, type CardId, videoNoteOperation, voiceOperation } from "@/lib/operations";
import { queueOperationForFiles } from "@/lib/queueHelpers";
import { useFilesStore } from "@/store/useFilesStore";
import { ActionCards } from "./ActionCards";
import { AdaptImagePanel } from "./panels/AdaptImagePanel";
import { AdvancedPanel } from "./panels/AdvancedPanel";
import { CompressPanel } from "./panels/CompressPanel";
import { ConvertAudioPanel } from "./panels/ConvertAudioPanel";
import { ConvertVideoPanel } from "./panels/ConvertVideoPanel";
import { ExtractFramesPanel } from "./panels/ExtractFramesPanel";

export function ActionsPanel() {
  const [selected, setSelected] = useState<CardId | null>(null);
  const files = useFilesStore((s) => s.files);

  async function handleSelect(id: CardId) {
    const card = ACTION_CARDS.find((c) => c.id === id)!;
    if (card.id === "voice") {
      await queueOperationForFiles(files, voiceOperation(), card.accepts);
      return;
    }
    if (card.id === "video_note") {
      await queueOperationForFiles(files, videoNoteOperation(), card.accepts);
      return;
    }
    setSelected(id);
  }

  return (
    <div className="relative h-full overflow-hidden">
      <AnimatePresence mode="wait" initial={false}>
        {selected === null ? (
          <motion.div
            key="grid"
            initial={{ opacity: 0, x: -8 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -8 }}
            transition={{ duration: 0.15 }}
          >
            <h2 className="mb-3 px-1 text-sm font-semibold text-base-100">Действие</h2>
            <ActionCards onSelect={handleSelect} />
          </motion.div>
        ) : (
          <motion.div
            key={selected}
            initial={{ opacity: 0, x: 8 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 8 }}
            transition={{ duration: 0.15 }}
          >
            {selected === "adapt_image" && <AdaptImagePanel onBack={() => setSelected(null)} />}
            {selected === "compress" && <CompressPanel onBack={() => setSelected(null)} />}
            {selected === "convert_video" && <ConvertVideoPanel onBack={() => setSelected(null)} />}
            {selected === "convert_audio" && <ConvertAudioPanel onBack={() => setSelected(null)} />}
            {selected === "extract_frames" && <ExtractFramesPanel onBack={() => setSelected(null)} />}
            {selected === "advanced" && <AdvancedPanel onBack={() => setSelected(null)} />}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
