import { useState } from "react";
import { Button } from "@/components/common/Button";
import { Field, inputClass } from "@/components/common/Field";
import { SegmentedControl } from "@/components/common/SegmentedControl";
import { ACTION_CARDS } from "@/lib/operations";
import { queueOperationForFiles } from "@/lib/queueHelpers";
import { useFilesStore } from "@/store/useFilesStore";
import type { FrameExtractMode } from "@/api/types";
import { PanelHeader } from "../PanelHeader";

const card = ACTION_CARDS.find((c) => c.id === "extract_frames")!;

type ModeKind = FrameExtractMode["mode"];

export function ExtractFramesPanel({ onBack }: { onBack: () => void }) {
  const [modeKind, setModeKind] = useState<ModeKind>("interval");
  const [seconds, setSeconds] = useState(2);
  const [fps, setFps] = useState(1);
  const files = useFilesStore((s) => s.files);
  const matching = files.filter((f) => card.accepts!.includes(f.ext));

  async function handleQueue() {
    const mode: FrameExtractMode =
      modeKind === "interval"
        ? { mode: "interval", seconds }
        : modeKind === "fps"
          ? { mode: "fps", fps }
          : { mode: "thumbnail" };
    await queueOperationForFiles(files, { kind: "extract_frames", mode }, card.accepts);
    onBack();
  }

  return (
    <div>
      <PanelHeader emoji={card.emoji} title={card.title} subtitle={card.subtitle} onBack={onBack} />
      <div className="flex flex-col gap-3">
        <SegmentedControl
          value={modeKind}
          onChange={setModeKind}
          options={[
            { value: "interval", label: "Каждые N секунд" },
            { value: "fps", label: "N кадров/сек" },
            { value: "thumbnail", label: "Один кадр (превью)" },
          ]}
        />
        {modeKind === "interval" && (
          <Field label="Интервал, сек">
            <input
              type="number"
              min={0.1}
              step={0.1}
              className={inputClass}
              value={seconds}
              onChange={(e) => setSeconds(Number(e.target.value))}
            />
          </Field>
        )}
        {modeKind === "fps" && (
          <Field label="Кадров в секунду">
            <input
              type="number"
              min={0.1}
              step={0.1}
              className={inputClass}
              value={fps}
              onChange={(e) => setFps(Number(e.target.value))}
            />
          </Field>
        )}
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
