use std::path::Path;

use crate::tasks::types::{ImageFit, ImageFormat};
use crate::utils::path_str;

/// Resizes a still image to an exact WxH target - used for fixed-size
/// requirements such as a Telegram bot description photo (640x360).
///
/// - `Contain`: fit inside and pad the rest (letterbox), nothing is cut off.
/// - `Cover`: fill the frame and crop the overflow.
/// - `Stretch`: ignore aspect ratio.
pub fn build_args(
    input: &Path,
    output: &Path,
    width: u32,
    height: u32,
    fit: ImageFit,
    format: ImageFormat,
) -> Vec<String> {
    let filter = match fit {
        ImageFit::Contain => format!(
            "scale={width}:{height}:force_original_aspect_ratio=decrease,\
             pad={width}:{height}:(ow-iw)/2:(oh-ih)/2:color=black,setsar=1"
        ),
        ImageFit::Cover => format!(
            "scale={width}:{height}:force_original_aspect_ratio=increase,\
             crop={width}:{height},setsar=1"
        ),
        ImageFit::Stretch => format!("scale={width}:{height},setsar=1"),
    };

    let mut args = vec![
        "-i".to_string(),
        path_str(input),
        "-vf".into(),
        filter,
        "-frames:v".into(),
        "1".into(),
    ];

    match format {
        ImageFormat::Jpg => args.extend(["-q:v", "2"].map(String::from)),
        // Force a browser/Telegram-friendly 8-bit RGB PNG.
        ImageFormat::Png => args.extend(["-pix_fmt", "rgb24"].map(String::from)),
    }

    args.push(path_str(output));
    args
}
