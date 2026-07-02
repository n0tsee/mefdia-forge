use std::path::Path;

use crate::utils::path_str;

/// `ffmpeg -i input -ac 1 -ar 48000 -b:a 16k -c:a libopus output.ogg`
pub fn build_args(input: &Path, output: &Path) -> Vec<String> {
    vec![
        "-i".into(),
        path_str(input),
        "-vn".into(),
        "-ac".into(),
        "1".into(),
        "-ar".into(),
        "48000".into(),
        "-b:a".into(),
        "16k".into(),
        "-c:a".into(),
        "libopus".into(),
        path_str(output),
    ]
}
