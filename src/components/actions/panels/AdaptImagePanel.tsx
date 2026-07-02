import { useState } from "react";
import { Button } from "@/components/common/Button";
import { Field, inputClass } from "@/components/common/Field";
import { SegmentedControl } from "@/components/common/SegmentedControl";
import {
  IMAGE_EXTS,
  IMAGE_FIT_OPTIONS,
  IMAGE_SIZE_PRESETS,
} from "@/lib/operations";
import { queueOperationForFiles } from "@/lib/queueHelpers";
import { useFilesStore } from "@/store/useFilesStore";
import type { ImageFit, ImageFormat } from "@/api/types";
import { PanelHeader } from "../PanelHeader";

export function AdaptImagePanel({ onBack }: { onBack: () => void }) {
  const files = useFilesStore((s) => s.files);
  const [width, setWidth] = useState(640);
  const [height, setHeight] = useState(360);
  const [fit, setFit] = useState<ImageFit>("contain");
  const [format, setFormat] = useState<ImageFormat>("jpg");

  const matching = files.filter((f) => IMAGE_EXTS.includes(f.ext));
  const presetValue = `${width}x${height}`;

  async function handle() {
    await queueOperationForFiles(
      files,
      { kind: "adapt_image", width, height, fit, format },
      IMAGE_EXTS,
    );
  }

  return (
    <div>
      <PanelHeader
        emoji="📸"
        title="Фото для Telegram"
        subtitle="Приводит изображение к точному размеру"
        onBack={onBack}
      />
      <div className="flex flex-col gap-3">
        <Field label="Размер">
          <SegmentedControl
            value={presetValue}
            onChange={(v) => {
              const p = IMAGE_SIZE_PRESETS.find((x) => x.value === v);
              if (p) {
                setWidth(p.width);
                setHeight(p.height);
              }
            }}
            options={IMAGE_SIZE_PRESETS.map((p) => ({ value: p.value, label: p.label }))}
          />
        </Field>

        <div className="grid grid-cols-2 gap-3">
          <Field label="Ширина, px">
            <input
              type="number"
              min={1}
              className={inputClass}
              value={width}
              onChange={(e) => setWidth(Number(e.target.value))}
            />
          </Field>
          <Field label="Высота, px">
            <input
              type="number"
              min={1}
              className={inputClass}
              value={height}
              onChange={(e) => setHeight(Number(e.target.value))}
            />
          </Field>
        </div>

        <Field label="Как вписывать">
          <SegmentedControl value={fit} onChange={setFit} options={IMAGE_FIT_OPTIONS} />
        </Field>

        <Field label="Формат">
          <SegmentedControl
            value={format}
            onChange={setFormat}
            options={[
              { value: "jpg", label: "JPG" },
              { value: "png", label: "PNG" },
            ]}
          />
        </Field>

        <p className="text-[11px] leading-relaxed text-base-500">
          Для фото-описания бота у BotFather нужен размер 640×360 (или GIF 320×180 /
          640×360 / 960×540 — через «Дополнительно → Создание GIF»).
        </p>

        <Button
          variant="primary"
          className="mt-1 w-full"
          disabled={matching.length === 0}
          onClick={handle}
        >
          Адаптировать ({matching.length})
        </Button>
      </div>
    </div>
  );
}
