use std::path::Path;

use crate::tasks::ops::encode::{video_args, EncodeCtx, Quality};
use crate::utils::path_str;

/// `width` or `height` of `0` means "keep aspect ratio, derive from the other".
pub fn build_args(input: &Path, output: &Path, width: u32, height: u32, ctx: &EncodeCtx) -> Vec<String> {
    let scale = match (width, height) {
        (w, 0) => format!("scale={w}:-2"),
        (0, h) => format!("scale=-2:{h}"),
        (w, h) => format!("scale={w}:{h}"),
    };

    // Base the hardware bitrate on the *target* resolution, not the source.
    let target_ctx = EncodeCtx {
        width: if width > 0 { Some(width) } else { ctx.width },
        height: if height > 0 { Some(height) } else { ctx.height },
        ..*ctx
    };

    let mut args = vec!["-i".to_string(), path_str(input), "-vf".into(), scale];
    args.extend(video_args(&target_ctx, Quality::High));
    args.extend(["-c:a", "copy"].map(String::from));
    args.push(path_str(output));
    args
}
