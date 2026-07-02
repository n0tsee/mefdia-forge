use std::path::Path;

use crate::tasks::ops::encode::{video_args, EncodeCtx, Quality};
use crate::tasks::types::CompressLevel;
use crate::utils::path_str;

fn quality_for(level: CompressLevel) -> Quality {
    match level {
        CompressLevel::Strong => Quality::Strong,
        CompressLevel::Medium => Quality::Medium,
        CompressLevel::Lossless => Quality::High,
    }
}

pub fn build_args(input: &Path, output: &Path, level: CompressLevel, ctx: &EncodeCtx) -> Vec<String> {
    let mut args = vec!["-i".to_string(), path_str(input)];
    args.extend(video_args(ctx, quality_for(level)));
    args.extend(
        [
            "-c:a", "aac", "-b:a", "128k", "-movflags", "+faststart",
        ]
        .map(String::from),
    );
    args.push(path_str(output));
    args
}
