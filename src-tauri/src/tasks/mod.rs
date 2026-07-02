pub mod ops;
pub mod types;

use std::path::{Path, PathBuf};

use ops::encode::EncodeCtx;
use types::Operation;

/// Translates a high-level `Operation` into a concrete ffmpeg argument list.
/// This is the single place that maps "what the user wants" to "what ffmpeg
/// needs to hear" - the UI and the queue never construct ffmpeg flags directly.
///
/// `ctx` carries the encoder choice (hardware vs software) and source
/// resolution, so every re-encoding op can honor the "hardware acceleration"
/// setting consistently.
pub fn build_args(
    operation: &Operation,
    inputs: &[PathBuf],
    output: &Path,
    ctx: &EncodeCtx,
) -> Vec<String> {
    match operation {
        Operation::TelegramVoice => ops::voice::build_args(&inputs[0], output),
        Operation::TelegramVideoNote => ops::video_note::build_args(&inputs[0], output, ctx),
        Operation::CompressVideo { level } => {
            ops::compress::build_args(&inputs[0], output, *level, ctx)
        }
        Operation::ConvertVideo { format } => {
            ops::convert_video::build_args(&inputs[0], output, *format, ctx)
        }
        Operation::ConvertAudio { format } | Operation::ExtractAudio { format } => {
            ops::convert_audio::build_args(&inputs[0], output, *format)
        }
        Operation::ExtractFrames { mode } => {
            ops::extract_frames::build_args(&inputs[0], output, *mode)
        }
        Operation::Gif { fps, width, height } => {
            ops::gif::build_args(&inputs[0], output, *fps, *width, *height)
        }
        Operation::AdaptImage {
            width,
            height,
            fit,
            format,
        } => ops::image::build_args(&inputs[0], output, *width, *height, *fit, *format),
        Operation::ChangeFps { fps } => ops::fps::build_args(&inputs[0], output, *fps, ctx),
        Operation::ChangeResolution { width, height } => {
            ops::resolution::build_args(&inputs[0], output, *width, *height, ctx)
        }
        Operation::Trim {
            start_secs,
            end_secs,
        } => ops::trim::build_args(&inputs[0], output, *start_secs, *end_secs),
        Operation::Rotate { degrees } => ops::rotate::build_args(&inputs[0], output, *degrees, ctx),
        Operation::ChangeSpeed { factor } => {
            ops::speed::build_args(&inputs[0], output, *factor, ctx)
        }
        Operation::ChangeBitrate {
            video_kbps,
            audio_kbps,
        } => ops::bitrate::build_args(&inputs[0], output, *video_kbps, *audio_kbps, ctx),
        Operation::MergeVideos => ops::merge::build_args(inputs, output, ctx),
    }
}
