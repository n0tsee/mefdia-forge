import { useState } from "react";
import { Button } from "@/components/common/Button";
import { SegmentedControl } from "@/components/common/SegmentedControl";
import { ACTION_CARDS } from "@/lib/operations";
import { queueOperationForFiles } from "@/lib/queueHelpers";
import { useFilesStore } from "@/store/useFilesStore";
import type { CompressLevel } from "@/api/types";
import { PanelHeader } from "../PanelHeader";

const card = ACTION_CARDS.find((c) => c.id === "compress")!;

const LEVELS: { value: CompressLevel; label: string; hint: string }[] = [
  { value: "strong", label: "Очень сильное", hint: "CRF 32 · минимальный размер" },
  { value: "medium", label: "Среднее", hint: "CRF 26 · баланс размера и качества" },
  { value: "lossless", label: "Без потерь", hint: "CRF 18 · максимальное качество" },
];

export function CompressPanel({ onBack }: { onBack: () => void }) {
  const [level, setLevel] = useState<CompressLevel>("medium");
  const files = useFilesStore((s) => s.files);
  const matching = files.filter((f) => card.accepts!.includes(f.ext));
  const activeHint = LEVELS.find((l) => l.value === level)?.hint;

  async function handleQueue() {
    await queueOperationForFiles(files, { kind: "compress_video", level }, card.accepts);
    onBack();
  }

  return (
    <div>
      <PanelHeader emoji={card.emoji} title={card.title} subtitle={card.subtitle} onBack={onBack} />
      <div className="flex flex-col gap-3">
        <SegmentedControl
          value={level}
          onChange={setLevel}
          options={LEVELS.map(({ value, label }) => ({ value, label }))}
        />
        <p className="text-xs text-base-400">{activeHint}</p>
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
