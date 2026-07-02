use std::path::Path;

use crate::tasks::ops::encode::{video_args, EncodeCtx, Quality};
use crate::utils::path_str;

pub fn build_args(input: &Path, output: &Path, fps: u32, ctx: &EncodeCtx) -> Vec<String> {
    let mut args = vec![
        "-i".to_string(),
        path_str(input),
        "-r".into(),
        fps.to_string(),
    ];
    args.extend(video_args(ctx, Quality::High));
    args.extend(["-c:a", "copy"].map(String::from));
    args.push(path_str(output));
    args
}
