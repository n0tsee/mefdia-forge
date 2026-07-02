import { useState } from "react";
import { Button } from "@/components/common/Button";
import { SegmentedControl } from "@/components/common/SegmentedControl";
import { ACTION_CARDS, AUDIO_FORMATS } from "@/lib/operations";
import { queueOperationForFiles } from "@/lib/queueHelpers";
import { useFilesStore } from "@/store/useFilesStore";
import type { AudioFormat } from "@/api/types";
import { PanelHeader } from "../PanelHeader";

const card = ACTION_CARDS.find((c) => c.id === "convert_audio")!;

export function ConvertAudioPanel({ onBack }: { onBack: () => void }) {
  const [format, setFormat] = useState<AudioFormat>("mp3");
  const files = useFilesStore((s) => s.files);
  const matching = files.filter((f) => card.accepts!.includes(f.ext));

  async function handleQueue() {
    await queueOperationForFiles(files, { kind: "convert_audio", format }, card.accepts);
    onBack();
  }

  return (
    <div>
      <PanelHeader emoji={card.emoji} title={card.title} subtitle={card.subtitle} onBack={onBack} />
      <div className="flex flex-col gap-3">
        <SegmentedControl value={format} onChange={setFormat} options={AUDIO_FORMATS} />
        <Button
          variant="primary"
          className="mt-2 w-full"
          disabled={matching.length === 0}
          onClick={handleQueue}
        >
          Добавить в очередь ({matching.length})
        </Button>
      </div>
    </div>
  );
}
