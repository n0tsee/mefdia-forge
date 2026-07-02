use std::path::Path;

use crate::tasks::ops::encode::{video_args, EncodeCtx, Quality};
use crate::tasks::types::RotateDegrees;
use crate::utils::path_str;

pub fn build_args(input: &Path, output: &Path, degrees: RotateDegrees, ctx: &EncodeCtx) -> Vec<String> {
    let transpose = match degrees {
        RotateDegrees::Cw90 => "transpose=1".to_string(),
        RotateDegrees::Ccw90 => "transpose=2".to_string(),
        RotateDegrees::Rotate180 => "transpose=1,transpose=1".to_string(),
    };

    let mut args = vec!["-i".to_string(), path_str(input), "-vf".into(), transpose];
    args.extend(video_args(ctx, Quality::High));
    args.extend(["-c:a", "copy"].map(String::from));
    args.push(path_str(output));
    args
}
