import { useState } from "react";
import { Button } from "@/components/common/Button";
import { SegmentedControl } from "@/components/common/SegmentedControl";
import { ACTION_CARDS, VIDEO_FORMATS } from "@/lib/operations";
import { queueOperationForFiles } from "@/lib/queueHelpers";
import { useFilesStore } from "@/store/useFilesStore";
import type { VideoFormat } from "@/api/types";
import { PanelHeader } from "../PanelHeader";

const card = ACTION_CARDS.find((c) => c.id === "convert_video")!;

export function ConvertVideoPanel({ onBack }: { onBack: () => void }) {
  const [format, setFormat] = useState<VideoFormat>("mp4");
  const files = useFilesStore((s) => s.files);
  const matching = files.filter((f) => card.accepts!.includes(f.ext));

  async function handleQueue() {
    await queueOperationForFiles(files, { kind: "convert_video", format }, card.accepts);
    onBack();
  }

  return (
    <div>
      <PanelHeader emoji={card.emoji} title={card.title} subtitle={card.subtitle} onBack={onBack} />
      <div className="flex flex-col gap-3">
        <SegmentedControl value={format} onChange={setFormat} options={VIDEO_FORMATS} />
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
