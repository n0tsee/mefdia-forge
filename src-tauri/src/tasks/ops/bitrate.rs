use std::path::Path;

use crate::tasks::ops::encode::{EncodeCtx, H264Encoder};
use crate::utils::path_str;

/// User specifies the target bitrate explicitly, so we honor it directly on the
/// chosen encoder (hardware when available, else libx264).
pub fn build_args(
    input: &Path,
    output: &Path,
    video_kbps: Option<u32>,
    audio_kbps: Option<u32>,
    ctx: &EncodeCtx,
) -> Vec<String> {
    let mut args = vec!["-i".to_string(), path_str(input)];

    match video_kbps {
        Some(v) => {
            let codec = match ctx.encoder {
                H264Encoder::VideoToolbox => "h264_videotoolbox",
                H264Encoder::Nvenc => "h264_nvenc",
                H264Encoder::Qsv => "h264_qsv",
                H264Encoder::Amf => "h264_amf",
                H264Encoder::Software => "libx264",
            };
            args.push("-c:v".into());
            args.push(codec.into());
            args.push("-b:v".into());
            args.push(format!("{v}k"));

            if ctx.encoder == H264Encoder::Software {
                args.push("-maxrate".into());
                args.push(format!("{v}k"));
                args.push("-bufsize".into());
                args.push(format!("{}k", v * 2));
                args.push("-preset".into());
                args.push("veryfast".into());
            } else if ctx.encoder == H264Encoder::VideoToolbox {
                args.push("-prio_speed".into());
                args.push("1".into());
            }
        }
        None => {
            args.push("-c:v".into());
            args.push("copy".into());
        }
    }

    match audio_kbps {
        Some(a) => {
            args.push("-c:a".into());
            args.push("aac".into());
            args.push("-b:a".into());
            args.push(format!("{a}k"));
        }
        None => {
            args.push("-c:a".into());
            args.push("copy".into());
        }
    }

    args.push(path_str(output));
    args
}
