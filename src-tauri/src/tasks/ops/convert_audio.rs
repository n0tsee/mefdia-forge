use std::path::Path;

use crate::tasks::types::AudioFormat;
use crate::utils::path_str;

pub fn extension(format: AudioFormat) -> &'static str {
    match format {
        AudioFormat::Mp3 => "mp3",
        AudioFormat::Ogg => "ogg",
        AudioFormat::Wav => "wav",
        AudioFormat::Aac => "aac",
        AudioFormat::M4a => "m4a",
        AudioFormat::Flac => "flac",
        AudioFormat::Opus => "opus",
    }
}

/// Also used for "extract audio" (video input, `-vn` drops the video stream).
pub fn build_args(input: &Path, output: &Path, format: AudioFormat) -> Vec<String> {
    let mut args = vec!["-i".to_string(), path_str(input), "-vn".into()];

    match format {
        AudioFormat::Mp3 => args.extend(["-c:a", "libmp3lame", "-b:a", "192k"].map(String::from)),
        AudioFormat::Ogg => args.extend(["-c:a", "libvorbis", "-q:a", "5"].map(String::from)),
        AudioFormat::Wav => args.extend(["-c:a", "pcm_s16le"].map(String::from)),
        AudioFormat::Aac => args.extend(["-c:a", "aac", "-b:a", "192k"].map(String::from)),
        AudioFormat::M4a => args.extend(["-c:a", "aac", "-b:a", "192k"].map(String::from)),
        AudioFormat::Flac => args.extend(["-c:a", "flac"].map(String::from)),
        AudioFormat::Opus => args.extend(["-c:a", "libopus", "-b:a", "128k"].map(String::from)),
    }

    args.push(path_str(output));
    args
}
