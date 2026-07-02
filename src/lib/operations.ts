import type {
  AudioFormat,
  ImageFit,
  Operation,
  RotateDegrees,
  VideoFormat,
} from "@/api/types";

export type CardId =
  | "voice"
  | "video_note"
  | "adapt_image"
  | "compress"
  | "convert_video"
  | "convert_audio"
  | "extract_frames"
  | "advanced";

/** Still-image formats the image-adaptation card accepts. */
export const IMAGE_EXTS = ["jpg", "jpeg", "png", "webp", "bmp", "tiff", "tif"];

export interface ActionCardMeta {
  id: CardId;
  emoji: string;
  title: string;
  subtitle: string;
  /** Extensions this card accepts (lowercase, no dot). `null` = any file. */
  accepts: string[] | null;
  /** Whether clicking the card queues immediately (no options to choose). */
  instant: boolean;
}

export const ACTION_CARDS: ActionCardMeta[] = [
  {
    id: "voice",
    emoji: "🎵",
    title: "Telegram Voice",
    subtitle: "Конвертация в .ogg",
    accepts: ["mp3", "wav", "m4a", "aac", "flac", "ogg", "opus"],
    instant: true,
  },
  {
    id: "video_note",
    emoji: "🎥",
    title: "Video Note",
    subtitle: "Кружок для Telegram",
    accepts: ["mp4", "mov", "avi", "mkv", "webm", "m4v"],
    instant: true,
  },
  {
    id: "adapt_image",
    emoji: "📸",
    title: "Фото для Telegram",
    subtitle: "Точный размер (640×360 и др.)",
    accepts: IMAGE_EXTS,
    instant: false,
  },
  {
    id: "compress",
    emoji: "📦",
    title: "Сжатие видео",
    subtitle: "Уменьшить размер файла",
    accepts: ["mp4", "mov", "avi", "mkv", "webm", "m4v"],
    instant: false,
  },
  {
    id: "convert_video",
    emoji: "🎬",
    title: "Конвертация видео",
    subtitle: "mp4 · mov · avi · mkv · webm · m4v",
    accepts: ["mp4", "mov", "avi", "mkv", "webm", "m4v"],
    instant: false,
  },
  {
    id: "convert_audio",
    emoji: "🎧",
    title: "Конвертация аудио",
    subtitle: "mp3 · ogg · wav · aac · m4a · flac · opus",
    accepts: ["mp3", "ogg", "wav", "aac", "m4a", "flac", "opus"],
    instant: false,
  },
  {
    id: "extract_frames",
    emoji: "🖼",
    title: "Извлечение кадров",
    subtitle: "Кадры в JPG",
    accepts: ["mp4", "mov", "avi", "mkv", "webm", "m4v"],
    instant: false,
  },
  {
    id: "advanced",
    emoji: "⚙",
    title: "Дополнительно",
    subtitle: "Объединение, GIF, обрезка и другое",
    accepts: null,
    instant: false,
  },
];

export const VIDEO_FORMATS: { value: VideoFormat; label: string }[] = [
  { value: "mp4", label: "MP4" },
  { value: "mov", label: "MOV" },
  { value: "avi", label: "AVI" },
  { value: "mkv", label: "MKV" },
  { value: "webm", label: "WebM" },
  { value: "m4v", label: "M4V" },
];

export const AUDIO_FORMATS: { value: AudioFormat; label: string }[] = [
  { value: "mp3", label: "MP3" },
  { value: "ogg", label: "OGG" },
  { value: "wav", label: "WAV" },
  { value: "aac", label: "AAC" },
  { value: "m4a", label: "M4A" },
  { value: "flac", label: "FLAC" },
  { value: "opus", label: "Opus" },
];

export const ROTATE_OPTIONS: { value: RotateDegrees; label: string }[] = [
  { value: "cw90", label: "На 90° по часовой" },
  { value: "ccw90", label: "На 90° против часовой" },
  { value: "rotate180", label: "На 180°" },
];

export const IMAGE_FIT_OPTIONS: { value: ImageFit; label: string }[] = [
  { value: "contain", label: "Вписать (поля)" },
  { value: "cover", label: "Заполнить (обрезка)" },
  { value: "stretch", label: "Растянуть" },
];

/** Presets that satisfy Telegram bot description photo/GIF requirements. */
export const IMAGE_SIZE_PRESETS: { value: string; label: string; width: number; height: number }[] = [
  { value: "640x360", label: "640×360", width: 640, height: 360 },
  { value: "320x180", label: "320×180", width: 320, height: 180 },
  { value: "960x540", label: "960×540", width: 960, height: 540 },
];

export function voiceOperation(): Operation {
  return { kind: "telegram_voice" };
}

export function videoNoteOperation(): Operation {
  return { kind: "telegram_video_note" };
}
