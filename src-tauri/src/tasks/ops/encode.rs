//! Shared H.264 video-encoding flags used by every re-encoding operation.
//!
//! The concrete encoder is chosen at runtime per platform/hardware (see
//! [`H264Encoder::detect`]): the platform hardware encoder when available and
//! validated, otherwise a portable `libx264` software fallback. Picking the
//! encoder once (cached in the queue) and threading it through here keeps every
//! operation consistent.

use tauri::AppHandle;

use crate::ffmpeg::binary::ffmpeg_sidecar;

/// H.264 encoder backend actually used for a task.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum H264Encoder {
    /// Apple VideoToolbox (macOS). Quality via average bitrate.
    VideoToolbox,
    /// NVIDIA NVENC. Quality via constant-quality (`-cq`).
    Nvenc,
    /// Intel Quick Sync. Quality via `-global_quality`.
    Qsv,
    /// AMD AMF. Quality via constant QP.
    Amf,
    /// Portable CPU encoder (libx264). Quality via CRF.
    Software,
}

impl H264Encoder {
    fn codec(self) -> &'static str {
        match self {
            H264Encoder::VideoToolbox => "h264_videotoolbox",
            H264Encoder::Nvenc => "h264_nvenc",
            H264Encoder::Qsv => "h264_qsv",
            H264Encoder::Amf => "h264_amf",
            H264Encoder::Software => "libx264",
        }
    }

    /// Ordered candidates to probe for the current platform, best first.
    fn candidates() -> &'static [H264Encoder] {
        if cfg!(target_os = "macos") {
            &[H264Encoder::VideoToolbox]
        } else if cfg!(target_os = "windows") {
            &[H264Encoder::Nvenc, H264Encoder::Qsv, H264Encoder::Amf]
        } else {
            &[H264Encoder::Nvenc]
        }
    }

    /// Picks the fastest usable H.264 encoder. VideoToolbox is assumed present
    /// on macOS (part of the OS); every other hardware candidate is confirmed
    /// with a tiny real encode so a missing GPU/driver quietly falls back to
    /// software instead of failing every task.
    pub async fn detect(app: &AppHandle) -> H264Encoder {
        for &candidate in H264Encoder::candidates() {
            if candidate == H264Encoder::VideoToolbox {
                return candidate; // always available on macOS
            }
            if test_encoder(app, candidate).await {
                return candidate;
            }
        }
        H264Encoder::Software
    }

    pub fn label(self) -> &'static str {
        match self {
            H264Encoder::VideoToolbox => "VideoToolbox (GPU)",
            H264Encoder::Nvenc => "NVIDIA NVENC (GPU)",
            H264Encoder::Qsv => "Intel Quick Sync (GPU)",
            H264Encoder::Amf => "AMD AMF (GPU)",
            H264Encoder::Software => "libx264 (CPU)",
        }
    }
}

/// Runs a 5-frame throwaway encode to confirm the encoder actually initializes
/// on this machine (present in `-encoders` list AND the driver/GPU works).
async fn test_encoder(app: &AppHandle, encoder: H264Encoder) -> bool {
    let mut args = vec![
        "-hide_banner".to_string(),
        "-loglevel".into(),
        "error".into(),
        "-f".into(),
        "lavfi".into(),
        "-i".into(),
        "color=c=black:s=128x128:r=30:d=1".into(),
    ];
    args.extend(codec_args(encoder));
    args.extend(
        ["-frames:v", "5", "-f", "null", "-"].map(String::from),
    );

    let Ok(cmd) = ffmpeg_sidecar(app) else {
        return false;
    };
    match cmd.args(args).output().await {
        Ok(out) => out.status.success(),
        Err(_) => false,
    }
}

/// Quality tier, mapped to encoder-specific quality settings.
#[derive(Debug, Clone, Copy)]
pub enum Quality {
    /// Visually lossless / conversion default.
    High,
    Medium,
    Strong,
    /// Telegram video note (small square, keep it light).
    Note,
}

/// Context the queue assembles per task (chosen encoder + source resolution)
/// and threads into the argument builders.
#[derive(Debug, Clone, Copy)]
pub struct EncodeCtx {
    pub encoder: H264Encoder,
    pub width: Option<u32>,
    pub height: Option<u32>,
}

impl Quality {
    fn crf(self) -> u32 {
        match self {
            Quality::High => 20,
            Quality::Medium => 26,
            Quality::Strong => 32,
            Quality::Note => 23,
        }
    }

    /// Constant-quality value for NVENC/QSV/AMF (same 0-51 scale as CRF, a bit
    /// looser so hardware output size stays reasonable).
    fn cq(self) -> u32 {
        match self {
            Quality::High => 23,
            Quality::Medium => 28,
            Quality::Strong => 34,
            Quality::Note => 26,
        }
    }

    /// Bits per pixel per frame for VideoToolbox (bitrate = w*h*fps*bpp).
    fn bpp(self) -> f64 {
        match self {
            Quality::High => 0.10,
            Quality::Medium => 0.05,
            Quality::Strong => 0.025,
            Quality::Note => 0.08,
        }
    }
}

/// Encoder + pixel-format flags WITHOUT quality (used by the detection probe).
fn codec_args(encoder: H264Encoder) -> Vec<String> {
    let mut v = vec!["-c:v".to_string(), encoder.codec().to_string()];
    let pix = match encoder {
        H264Encoder::Qsv => "nv12",
        _ => "yuv420p",
    };
    v.push("-pix_fmt".into());
    v.push(pix.into());
    v
}

/// Full `-c:v ...` block (codec + quality + pixel format) for a real encode.
/// Caller adds input/output/audio flags around it.
pub fn video_args(ctx: &EncodeCtx, quality: Quality) -> Vec<String> {
    let mut args = vec!["-c:v".to_string(), ctx.encoder.codec().to_string()];

    match ctx.encoder {
        H264Encoder::VideoToolbox => {
            let kbps = hw_bitrate_kbps(ctx, quality);
            args.push("-b:v".into());
            args.push(format!("{kbps}k"));
            args.push("-prio_speed".into());
            args.push("1".into());
        }
        H264Encoder::Nvenc => {
            args.push("-rc".into());
            args.push("vbr".into());
            args.push("-cq".into());
            args.push(quality.cq().to_string());
            args.push("-b:v".into());
            args.push("0".into());
            args.push("-preset".into());
            args.push("p5".into());
        }
        H264Encoder::Qsv => {
            args.push("-global_quality".into());
            args.push(quality.cq().to_string());
        }
        H264Encoder::Amf => {
            args.push("-rc".into());
            args.push("cqp".into());
            let qp = quality.cq().to_string();
            args.push("-qp_i".into());
            args.push(qp.clone());
            args.push("-qp_p".into());
            args.push(qp);
        }
        H264Encoder::Software => {
            args.push("-crf".into());
            args.push(quality.crf().to_string());
            args.push("-preset".into());
            args.push("veryfast".into());
        }
    }

    args.push("-pix_fmt".into());
    args.push(if ctx.encoder == H264Encoder::Qsv {
        "nv12".into()
    } else {
        "yuv420p".into()
    });
    args
}

/// Average bitrate (kbps) for VideoToolbox, derived from resolution.
/// Assumes ~30 fps and clamps to a sane floor/ceiling.
fn hw_bitrate_kbps(ctx: &EncodeCtx, quality: Quality) -> u32 {
    let pixels = match (ctx.width, ctx.height) {
        (Some(w), Some(h)) => (w as f64) * (h as f64),
        _ => 1920.0 * 1080.0,
    };
    let bps = pixels * 30.0 * quality.bpp();
    ((bps / 1000.0) as u32).clamp(800, 60_000)
}
