use std::path::Path;

use crate::tasks::types::FrameExtractMode;
use crate::utils::path_str;

/// `output_dir` is a per-task folder (created by the queue before running)
/// so batches never collide on the `frame_%04d.jpg` naming pattern.
pub fn build_args(input: &Path, output_dir: &Path, mode: FrameExtractMode) -> Vec<String> {
    let pattern = output_dir.join("frame_%04d.jpg");
    let mut args = vec!["-i".to_string(), path_str(input)];

    match mode {
        FrameExtractMode::Interval { seconds } => {
            let fps = 1.0 / seconds.max(0.001);
            args.push("-vf".into());
            args.push(format!("fps={fps}"));
        }
        FrameExtractMode::Fps { fps } => {
            args.push("-vf".into());
            args.push(format!("fps={fps}"));
        }
        FrameExtractMode::Thumbnail => {
            args.push("-vf".into());
            args.push("thumbnail".into());
            args.push("-frames:v".into());
            args.push("1".into());
        }
    }

    args.push("-q:v".into());
    args.push("2".into());
    args.push(path_str(&pattern));
    args
}
