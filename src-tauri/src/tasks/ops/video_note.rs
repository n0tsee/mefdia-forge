use std::path::Path;

use crate::tasks::ops::encode::{video_args, EncodeCtx, H264Encoder, Quality};
use crate::utils::path_str;

/// Center-crops to a square, scales to Telegram's 512x512 round-video-note
/// size, and re-encodes to H.264/AAC MP4 that Telegram accepts as a video note.
///
/// Note: the hardware encoder ignores x264-only flags like baseline profile,
/// but VideoToolbox's default H.264 output is already Telegram-compatible.
pub fn build_args(input: &Path, output: &Path, ctx: &EncodeCtx) -> Vec<String> {
    let filter = "crop='min(iw,ih)':'min(iw,ih)',scale=512:512,setsar=1";
    let mut args = vec![
        "-i".to_string(),
        path_str(input),
        "-vf".into(),
        filter.into(),
    ];

    // The note is always 512x512 regardless of source, so pin the ctx size.
    let note_ctx = EncodeCtx {
        width: Some(512),
        height: Some(512),
        ..*ctx
    };
    args.extend(video_args(&note_ctx, Quality::Note));

    if ctx.encoder == H264Encoder::Software {
        // x264-specific compatibility knobs (harmless to add only here).
        args.extend(["-profile:v", "baseline", "-level", "3.1"].map(String::from));
    }

    args.extend(
        [
            "-c:a", "aac", "-b:a", "128k", "-ar", "44100", "-movflags", "+faststart",
        ]
        .map(String::from),
    );
    args.push(path_str(output));
    args
}
