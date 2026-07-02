use anyhow::{Context, Result};
use serde::{Deserialize, Serialize};
use tauri::AppHandle;

use super::binary::ffprobe_sidecar;

#[derive(Debug, Clone, Default, Serialize)]
pub struct MediaInfo {
    pub duration_secs: f64,
    pub width: Option<u32>,
    pub height: Option<u32>,
    pub has_video: bool,
    pub has_audio: bool,
}

#[derive(Deserialize)]
struct ProbeFormat {
    duration: Option<String>,
}

#[derive(Deserialize)]
struct ProbeStream {
    codec_type: String,
    width: Option<u32>,
    height: Option<u32>,
}

#[derive(Deserialize)]
struct ProbeOutput {
    format: Option<ProbeFormat>,
    #[serde(default)]
    streams: Vec<ProbeStream>,
}

/// Runs `ffprobe -show_format -show_streams` on a media file and extracts
/// the fields the app needs: duration (for progress %) and video dimensions
/// (for the compress/convert/video-note pipelines).
pub async fn probe(app: &AppHandle, path: &str) -> Result<MediaInfo> {
    let output = ffprobe_sidecar(app)?
        .args([
            "-v",
            "quiet",
            "-print_format",
            "json",
            "-show_format",
            "-show_streams",
            path,
        ])
        .output()
        .await
        .context("failed to execute ffprobe")?;

    if !output.status.success() {
        anyhow::bail!(
            "ffprobe failed for {path}: {}",
            String::from_utf8_lossy(&output.stderr)
        );
    }

    let raw = String::from_utf8_lossy(&output.stdout);
    let parsed: ProbeOutput =
        serde_json::from_str(&raw).context("failed to parse ffprobe JSON output")?;

    let duration_secs = parsed
        .format
        .as_ref()
        .and_then(|f| f.duration.as_ref())
        .and_then(|d| d.parse::<f64>().ok())
        .unwrap_or(0.0);

    let video_stream = parsed.streams.iter().find(|s| s.codec_type == "video");
    let has_audio = parsed.streams.iter().any(|s| s.codec_type == "audio");

    Ok(MediaInfo {
        duration_secs,
        width: video_stream.and_then(|s| s.width),
        height: video_stream.and_then(|s| s.height),
        has_video: video_stream.is_some(),
        has_audio,
    })
}
