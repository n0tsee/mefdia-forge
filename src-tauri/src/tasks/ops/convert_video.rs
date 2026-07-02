use std::path::Path;

use crate::tasks::ops::encode::{video_args, EncodeCtx, Quality};
use crate::tasks::types::VideoFormat;
use crate::utils::path_str;

pub fn extension(format: VideoFormat) -> &'static str {
    match format {
        VideoFormat::Mp4 => "mp4",
        VideoFormat::Mov => "mov",
        VideoFormat::Avi => "avi",
        VideoFormat::Mkv => "mkv",
        VideoFormat::Webm => "webm",
        VideoFormat::M4v => "m4v",
    }
}

pub fn build_args(input: &Path, output: &Path, format: VideoFormat, ctx: &EncodeCtx) -> Vec<String> {
    let mut args = vec!["-i".to_string(), path_str(input)];

    match format {
        // WebM and AVI use their own codecs (no H.264), so hardware accel
        // doesn't apply - keep the software encoders.
        VideoFormat::Webm => args.extend(
            [
                "-c:v", "libvpx-vp9", "-crf", "32", "-b:v", "0", "-c:a", "libopus", "-b:a", "128k",
            ]
            .map(String::from),
        ),
        VideoFormat::Avi => args.extend(
            [
                "-c:v", "mpeg4", "-q:v", "5", "-c:a", "libmp3lame", "-b:a", "192k",
            ]
            .map(String::from),
        ),
        VideoFormat::Mkv => {
            args.extend(video_args(ctx, Quality::High));
            args.extend(["-c:a", "aac", "-b:a", "192k"].map(String::from));
        }
        VideoFormat::Mp4 | VideoFormat::Mov | VideoFormat::M4v => {
            args.extend(video_args(ctx, Quality::High));
            args.extend(
                ["-c:a", "aac", "-b:a", "192k", "-movflags", "+faststart"].map(String::from),
            );
        }
    }

    args.push(path_str(output));
    args
}
