use std::path::Path;

use crate::utils::path_str;

/// Single-pass palette-generated GIF (`split` + `palettegen`/`paletteuse`)
/// for noticeably better quality/size than a naive `-vf fps,scale`.
///
/// When `height` is given, the output is padded to an exact `width`x`height`
/// (letterbox) - needed for fixed-size targets like a Telegram bot GIF
/// (320x180 / 640x360 / 960x540). Otherwise height follows the aspect ratio.
pub fn build_args(
    input: &Path,
    output: &Path,
    fps: u32,
    width: Option<u32>,
    height: Option<u32>,
) -> Vec<String> {
    let width = width.unwrap_or(480);
    let scale = match height {
        Some(h) => format!(
            "scale={width}:{h}:force_original_aspect_ratio=decrease:flags=lanczos,\
             pad={width}:{h}:(ow-iw)/2:(oh-ih)/2:color=black"
        ),
        None => format!("scale={width}:-1:flags=lanczos"),
    };
    let filter =
        format!("fps={fps},{scale},split[s0][s1];[s0]palettegen[p];[s1][p]paletteuse");
    vec![
        "-i".into(),
        path_str(input),
        "-filter_complex".into(),
        filter,
        path_str(output),
    ]
}
