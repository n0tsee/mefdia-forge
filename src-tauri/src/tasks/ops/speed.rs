use std::path::Path;

use crate::tasks::ops::encode::{video_args, EncodeCtx, Quality};
use crate::utils::path_str;

/// Changes playback speed while keeping audio pitch/sync correct.
/// `factor` > 1.0 speeds up, < 1.0 slows down.
pub fn build_args(input: &Path, output: &Path, factor: f64, ctx: &EncodeCtx) -> Vec<String> {
    let video_pts = 1.0 / factor;
    let atempo_chain = atempo_chain(factor);

    let mut args = vec![
        "-i".to_string(),
        path_str(input),
        "-filter_complex".into(),
        format!("[0:v]setpts={video_pts}*PTS[v];[0:a]{atempo_chain}[a]"),
        "-map".into(),
        "[v]".into(),
        "-map".into(),
        "[a]".into(),
    ];
    args.extend(video_args(ctx, Quality::High));
    args.extend(["-c:a", "aac", "-b:a", "192k"].map(String::from));
    args.push(path_str(output));
    args
}

/// `atempo` only accepts 0.5-2.0 per instance, so factors outside that range
/// are achieved by chaining multiple `atempo` filters.
fn atempo_chain(mut factor: f64) -> String {
    let mut filters = Vec::new();
    while factor < 0.5 {
        filters.push("atempo=0.5".to_string());
        factor /= 0.5;
    }
    while factor > 2.0 {
        filters.push("atempo=2.0".to_string());
        factor /= 2.0;
    }
    filters.push(format!("atempo={factor:.3}"));
    filters.join(",")
}
