import { useState } from "react";
import { Button } from "@/components/common/Button";
import { Field, inputClass } from "@/components/common/Field";
import { SegmentedControl } from "@/components/common/SegmentedControl";
import { ROTATE_OPTIONS } from "@/lib/operations";
import { queueMerge, queueOperationForFiles } from "@/lib/queueHelpers";
import { useFilesStore } from "@/store/useFilesStore";
import type { RotateDegrees } from "@/api/types";
import { PanelHeader } from "../PanelHeader";

const VIDEO_EXTS = ["mp4", "mov", "avi", "mkv", "webm", "m4v"];

type SubId =
  | "merge"
  | "extract_audio"
  | "gif"
  | "fps"
  | "resolution"
  | "trim"
  | "rotate"
  | "bitrate"
  | "speed";

const SUB_CARDS: { id: SubId; emoji: string; title: string }[] = [
  { id: "merge", emoji: "🧩", title: "Объединение видео" },
  { id: "extract_audio", emoji: "🔊", title: "Извлечение аудио" },
  { id: "gif", emoji: "🌀", title: "Создание GIF" },
  { id: "fps", emoji: "🎞", title: "Изменение FPS" },
  { id: "resolution", emoji: "📐", title: "Изменение разрешения" },
  { id: "trim", emoji: "✂️", title: "Обрезка видео" },
  { id: "rotate", emoji: "🔄", title: "Поворот видео" },
  { id: "bitrate", emoji: "📶", title: "Изменение битрейта" },
  { id: "speed", emoji: "⏩", title: "Изменение скорости" },
];

export function AdvancedPanel({ onBack }: { onBack: () => void }) {
  const [sub, setSub] = useState<SubId | null>(null);
  const files = useFilesStore((s) => s.files);

  if (sub === null) {
    return (
      <div>
        <PanelHeader emoji="⚙" title="Дополнительно" subtitle="Больше операций над видео" onBack={onBack} />
        <div className="grid grid-cols-2 gap-2.5">
          {SUB_CARDS.map((c) => (
            <button
              key={c.id}
              onClick={() => setSub(c.id)}
              className="flex flex-col items-start gap-1.5 rounded-lg border border-base-700 bg-base-800 p-3 text-left transition-colors hover:border-accent/60 hover:bg-base-700/60"
            >
              <span className="text-lg leading-none">{c.emoji}</span>
              <span className="text-xs font-medium text-base-200">{c.title}</span>
            </button>
          ))}
        </div>
      </div>
    );
  }

  const meta = SUB_CARDS.find((c) => c.id === sub)!;
  const goBack = () => setSub(null);

  return (
    <div>
      <PanelHeader emoji={meta.emoji} title={meta.title} onBack={goBack} />
      {sub === "merge" && <MergeForm files={files} />}
      {sub === "extract_audio" && <ExtractAudioForm files={files} />}
      {sub === "gif" && <GifForm files={files} />}
      {sub === "fps" && <FpsForm files={files} />}
      {sub === "resolution" && <ResolutionForm files={files} />}
      {sub === "trim" && <TrimForm files={files} />}
      {sub === "rotate" && <RotateForm files={files} />}
      {sub === "bitrate" && <BitrateForm files={files} />}
      {sub === "speed" && <SpeedForm files={files} />}
    </div>
  );
}

type FormProps = { files: ReturnType<typeof useFilesStore.getState>["files"] };

function QueueButton({
  label,
  disabled,
  onClick,
}: {
  label: string;
  disabled: boolean;
  onClick: () => void;
}) {
  return (
    <Button variant="primary" className="mt-2 w-full" disabled={disabled} onClick={onClick}>
      {label}
    </Button>
  );
}

function MergeForm({ files }: FormProps) {
  async function handle() {
    await queueMerge(files, { kind: "merge_videos" });
  }
  return (
    <div className="flex flex-col gap-3">
      <p className="text-xs text-base-400">
        Все выбранные файлы будут объединены в один в текущем порядке списка слева.
      </p>
      <QueueButton label={`Объединить (${files.length})`} disabled={files.length < 2} onClick={handle} />
    </div>
  );
}

function ExtractAudioForm({ files }: FormProps) {
  const [format, setFormat] = useState<"mp3" | "wav" | "aac" | "flac">("mp3");
  const matching = files.filter((f) => VIDEO_EXTS.includes(f.ext));
  async function handle() {
    await queueOperationForFiles(files, { kind: "extract_audio", format }, VIDEO_EXTS);
  }
  return (
    <div className="flex flex-col gap-3">
      <SegmentedControl
        value={format}
        onChange={setFormat}
        options={[
          { value: "mp3", label: "MP3" },
          { value: "wav", label: "WAV" },
          { value: "aac", label: "AAC" },
          { value: "flac", label: "FLAC" },
        ]}
      />
      <QueueButton label={`Добавить в очередь (${matching.length})`} disabled={matching.length === 0} onClick={handle} />
    </div>
  );
}

const GIF_SIZE_PRESETS = [
  { value: "auto", label: "Пропорц.", width: 480, height: null as number | null },
  { value: "320x180", label: "320×180", width: 320, height: 180 as number | null },
  { value: "640x360", label: "640×360", width: 640, height: 360 as number | null },
  { value: "960x540", label: "960×540", width: 960, height: 540 as number | null },
];

function GifForm({ files }: FormProps) {
  const [fps, setFps] = useState(10);
  const [preset, setPreset] = useState("auto");
  const matching = files.filter((f) => VIDEO_EXTS.includes(f.ext));
  const sel = GIF_SIZE_PRESETS.find((p) => p.value === preset)!;
  async function handle() {
    await queueOperationForFiles(
      files,
      { kind: "gif", fps, width: sel.width, height: sel.height },
      VIDEO_EXTS,
    );
  }
  return (
    <div className="flex flex-col gap-3">
      <Field label="FPS">
        <input type="number" min={1} max={30} className={inputClass} value={fps} onChange={(e) => setFps(Number(e.target.value))} />
      </Field>
      <Field label="Размер" hint="точные размеры — для GIF-описания бота в Telegram">
        <SegmentedControl
          value={preset}
          onChange={setPreset}
          options={GIF_SIZE_PRESETS.map((p) => ({ value: p.value, label: p.label }))}
        />
      </Field>
      <QueueButton label={`Добавить в очередь (${matching.length})`} disabled={matching.length === 0} onClick={handle} />
    </div>
  );
}

function FpsForm({ files }: FormProps) {
  const [fps, setFps] = useState(30);
  const matching = files.filter((f) => VIDEO_EXTS.includes(f.ext));
  async function handle() {
    await queueOperationForFiles(files, { kind: "change_fps", fps }, VIDEO_EXTS);
  }
  return (
    <div className="flex flex-col gap-3">
      <SegmentedControl
        value={String(fps)}
        onChange={(v) => setFps(Number(v))}
        options={[24, 25, 30, 50, 60].map((v) => ({ value: String(v), label: `${v}` }))}
      />
      <Field label="Своё значение">
        <input type="number" min={1} max={240} className={inputClass} value={fps} onChange={(e) => setFps(Number(e.target.value))} />
      </Field>
      <QueueButton label={`Добавить в очередь (${matching.length})`} disabled={matching.length === 0} onClick={handle} />
    </div>
  );
}

function ResolutionForm({ files }: FormProps) {
  const [width, setWidth] = useState(1280);
  const [height, setHeight] = useState(0);
  const matching = files.filter((f) => VIDEO_EXTS.includes(f.ext));
  async function handle() {
    await queueOperationForFiles(files, { kind: "change_resolution", width, height }, VIDEO_EXTS);
  }
  return (
    <div className="flex flex-col gap-3">
      <SegmentedControl
        value={`${width}x${height}`}
        onChange={(v) => {
          const [w, h] = v.split("x").map(Number);
          setWidth(w);
          setHeight(h);
        }}
        options={[
          { value: "1920x0", label: "1920p (авто)" },
          { value: "1280x0", label: "1280p (авто)" },
          { value: "854x0", label: "854p (авто)" },
        ]}
      />
      <div className="grid grid-cols-2 gap-3">
        <Field label="Ширина" hint="0 = авто">
          <input type="number" min={0} className={inputClass} value={width} onChange={(e) => setWidth(Number(e.target.value))} />
        </Field>
        <Field label="Высота" hint="0 = авто">
          <input type="number" min={0} className={inputClass} value={height} onChange={(e) => setHeight(Number(e.target.value))} />
        </Field>
      </div>
      <QueueButton label={`Добавить в очередь (${matching.length})`} disabled={matching.length === 0} onClick={handle} />
    </div>
  );
}

function TrimForm({ files }: FormProps) {
  const [start, setStart] = useState(0);
  const [end, setEnd] = useState<number | "">("");
  const matching = files.filter((f) => VIDEO_EXTS.includes(f.ext));
  async function handle() {
    await queueOperationForFiles(
      files,
      { kind: "trim", start_secs: start, end_secs: end === "" ? null : end },
      VIDEO_EXTS,
    );
  }
  return (
    <div className="flex flex-col gap-3">
      <div className="grid grid-cols-2 gap-3">
        <Field label="Начало, сек">
          <input type="number" min={0} step={0.1} className={inputClass} value={start} onChange={(e) => setStart(Number(e.target.value))} />
        </Field>
        <Field label="Конец, сек" hint="пусто = до конца">
          <input
            type="number"
            min={0}
            step={0.1}
            className={inputClass}
            value={end}
            onChange={(e) => setEnd(e.target.value === "" ? "" : Number(e.target.value))}
          />
        </Field>
      </div>
      <QueueButton label={`Добавить в очередь (${matching.length})`} disabled={matching.length === 0} onClick={handle} />
    </div>
  );
}

function RotateForm({ files }: FormProps) {
  const [degrees, setDegrees] = useState<RotateDegrees>("cw90");
  const matching = files.filter((f) => VIDEO_EXTS.includes(f.ext));
  async function handle() {
    await queueOperationForFiles(files, { kind: "rotate", degrees }, VIDEO_EXTS);
  }
  return (
    <div className="flex flex-col gap-3">
      <SegmentedControl value={degrees} onChange={setDegrees} options={ROTATE_OPTIONS} />
      <QueueButton label={`Добавить в очередь (${matching.length})`} disabled={matching.length === 0} onClick={handle} />
    </div>
  );
}

function BitrateForm({ files }: FormProps) {
  const [videoKbps, setVideoKbps] = useState<number | "">(2000);
  const [audioKbps, setAudioKbps] = useState<number | "">(128);
  const matching = files.filter((f) => VIDEO_EXTS.includes(f.ext));
  async function handle() {
    await queueOperationForFiles(
      files,
      {
        kind: "change_bitrate",
        video_kbps: videoKbps === "" ? null : videoKbps,
        audio_kbps: audioKbps === "" ? null : audioKbps,
      },
      VIDEO_EXTS,
    );
  }
  return (
    <div className="flex flex-col gap-3">
      <div className="grid grid-cols-2 gap-3">
        <Field label="Видео, кбит/с" hint="пусто = без изменений">
          <input
            type="number"
            min={0}
            className={inputClass}
            value={videoKbps}
            onChange={(e) => setVideoKbps(e.target.value === "" ? "" : Number(e.target.value))}
          />
        </Field>
        <Field label="Аудио, кбит/с" hint="пусто = без изменений">
          <input
            type="number"
            min={0}
            className={inputClass}
            value={audioKbps}
            onChange={(e) => setAudioKbps(e.target.value === "" ? "" : Number(e.target.value))}
          />
        </Field>
      </div>
      <QueueButton label={`Добавить в очередь (${matching.length})`} disabled={matching.length === 0} onClick={handle} />
    </div>
  );
}

function SpeedForm({ files }: FormProps) {
  const [factor, setFactor] = useState(1);
  const matching = files.filter((f) => VIDEO_EXTS.includes(f.ext));
  async function handle() {
    await queueOperationForFiles(files, { kind: "change_speed", factor }, VIDEO_EXTS);
  }
  return (
    <div className="flex flex-col gap-3">
      <SegmentedControl
        value={String(factor)}
        onChange={(v) => setFactor(Number(v))}
        options={[0.5, 0.75, 1, 1.25, 1.5, 2].map((v) => ({ value: String(v), label: `×${v}` }))}
      />
      <Field label="Своё значение" hint="0.25 - 4">
        <input
          type="number"
          min={0.25}
          max={4}
          step={0.05}
          className={inputClass}
          value={factor}
          onChange={(e) => setFactor(Number(e.target.value))}
        />
      </Field>
      <QueueButton label={`Добавить в очередь (${matching.length})`} disabled={matching.length === 0} onClick={handle} />
    </div>
  );
}
