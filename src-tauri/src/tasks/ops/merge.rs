use std::path::{Path, PathBuf};

use crate::tasks::ops::encode::{video_args, EncodeCtx, Quality};
use crate::utils::path_str;

/// Concatenates arbitrary inputs (possibly differing codec/resolution/fps)
/// via the `concat` filter, re-encoding everything to a common H.264/AAC
/// stream so mismatched sources still merge correctly.
pub fn build_args(inputs: &[PathBuf], output: &Path, ctx: &EncodeCtx) -> Vec<String> {
    let mut args = Vec::new();
    for input in inputs {
        args.push("-i".to_string());
        args.push(path_str(input));
    }

    let n = inputs.len();
    let mut filter = String::new();
    for i in 0..n {
        filter.push_str(&format!("[{i}:v:0][{i}:a:0]"));
    }
    filter.push_str(&format!("concat=n={n}:v=1:a=1[v][a]"));

    args.push("-filter_complex".into());
    args.push(filter);
    args.push("-map".into());
    args.push("[v]".into());
    args.push("-map".into());
    args.push("[a]".into());
    args.extend(video_args(ctx, Quality::High));
    args.push("-c:a".into());
    args.push("aac".into());
    args.push("-b:a".into());
    args.push("192k".into());
    args.push(path_str(output));
    args
}
