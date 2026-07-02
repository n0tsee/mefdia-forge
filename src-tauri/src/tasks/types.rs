use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum CompressLevel {
    Strong,
    Medium,
    Lossless,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "lowercase")]
pub enum VideoFormat {
    Mp4,
    Mov,
    Avi,
    Mkv,
    Webm,
    M4v,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "lowercase")]
pub enum AudioFormat {
    Mp3,
    Ogg,
    Wav,
    Aac,
    M4a,
    Flac,
    Opus,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum RotateDegrees {
    Cw90,
    Ccw90,
    Rotate180,
}

/// How to reconcile the source aspect ratio with a fixed target size.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum ImageFit {
    /// Fit entirely inside, padding the remainder (letterbox). No cropping.
    Contain,
    /// Fill the whole frame, cropping the overflow. No padding.
    Cover,
    /// Ignore aspect ratio, stretch to the exact size.
    Stretch,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "lowercase")]
pub enum ImageFormat {
    Jpg,
    Png,
}

#[derive(Debug, Clone, Copy, Serialize, Deserialize)]
#[serde(tag = "mode", rename_all = "snake_case")]
pub enum FrameExtractMode {
    Interval { seconds: f64 },
    Fps { fps: f64 },
    Thumbnail,
}

/// Every batch operation the app can perform. Each variant carries exactly
/// the options its ffmpeg argument builder (in `tasks::ops`) needs - the UI
/// never assembles ffmpeg flags itself, it only ever produces one of these.
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(tag = "kind", rename_all = "snake_case")]
pub enum Operation {
    TelegramVoice,
    TelegramVideoNote,
    CompressVideo { level: CompressLevel },
    ConvertVideo { format: VideoFormat },
    ConvertAudio { format: AudioFormat },
    ExtractAudio { format: AudioFormat },
    ExtractFrames { mode: FrameExtractMode },
    Gif {
        fps: u32,
        width: Option<u32>,
        height: Option<u32>,
    },
    /// Resize an image to exact WxH (for fixed-size requirements like a
    /// Telegram bot description photo, 640x360).
    AdaptImage {
        width: u32,
        height: u32,
        fit: ImageFit,
        format: ImageFormat,
    },
    ChangeFps { fps: u32 },
    ChangeResolution { width: u32, height: u32 },
    Trim { start_secs: f64, end_secs: Option<f64> },
    Rotate { degrees: RotateDegrees },
    ChangeSpeed { factor: f64 },
    ChangeBitrate {
        video_kbps: Option<u32>,
        audio_kbps: Option<u32>,
    },
    MergeVideos,
}

impl Operation {
    /// Forced output extension, or `None` to keep the source file's extension.
    pub fn output_extension(&self) -> Option<&'static str> {
        use super::ops::{convert_audio, convert_video};
        match self {
            Operation::TelegramVoice => Some("ogg"),
            Operation::TelegramVideoNote => Some("mp4"),
            Operation::ConvertVideo { format } => Some(convert_video::extension(*format)),
            Operation::ConvertAudio { format } | Operation::ExtractAudio { format } => {
                Some(convert_audio::extension(*format))
            }
            Operation::Gif { .. } => Some("gif"),
            Operation::AdaptImage { format, .. } => Some(match format {
                ImageFormat::Jpg => "jpg",
                ImageFormat::Png => "png",
            }),
            Operation::MergeVideos => Some("mp4"),
            _ => None,
        }
    }

    /// Merge combines every selected file into a single output instead of
    /// processing each file independently.
    #[allow(dead_code)]
    pub fn is_multi_input(&self) -> bool {
        matches!(self, Operation::MergeVideos)
    }

    /// Extracting frames writes a numbered sequence of images into a folder
    /// rather than a single output file.
    pub fn produces_directory(&self) -> bool {
        matches!(self, Operation::ExtractFrames { .. })
    }

    #[allow(dead_code)]
    pub fn label(&self) -> &'static str {
        match self {
            Operation::TelegramVoice => "Telegram Voice",
            Operation::TelegramVideoNote => "Telegram Video Note",
            Operation::CompressVideo { .. } => "Сжатие видео",
            Operation::ConvertVideo { .. } => "Конвертация видео",
            Operation::ConvertAudio { .. } => "Конвертация аудио",
            Operation::ExtractAudio { .. } => "Извлечение аудио",
            Operation::ExtractFrames { .. } => "Извлечение кадров",
            Operation::Gif { .. } => "Создание GIF",
            Operation::AdaptImage { .. } => "Адаптация изображения",
            Operation::ChangeFps { .. } => "Изменение FPS",
            Operation::ChangeResolution { .. } => "Изменение разрешения",
            Operation::Trim { .. } => "Обрезка видео",
            Operation::Rotate { .. } => "Поворот видео",
            Operation::ChangeSpeed { .. } => "Изменение скорости",
            Operation::ChangeBitrate { .. } => "Изменение битрейта",
            Operation::MergeVideos => "Объединение видео",
        }
    }
}
