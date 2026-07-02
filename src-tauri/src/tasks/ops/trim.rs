use std::path::Path;

use crate::utils::path_str;

/// Stream-copy trim (`-ss` before `-i` for fast seeking, `-c copy`). Cut
/// points snap to the nearest keyframe rather than the exact frame - trading
/// precision for speed, which is the right default for batch trimming.
pub fn build_args(input: &Path, output: &Path, start_secs: f64, end_secs: Option<f64>) -> Vec<String> {
    let mut args = vec![
        "-ss".to_string(),
        format!("{start_secs}"),
        "-i".into(),
        path_str(input),
    ];

    if let Some(end) = end_secs {
        let duration = (end - start_secs).max(0.0);
        args.push("-t".into());
        args.push(format!("{duration}"));
    }

    args.push("-c".into());
    args.push("copy".into());
    args.push("-avoid_negative_ts".into());
    args.push("make_zero".into());
    args.push(path_str(output));
    args
}
