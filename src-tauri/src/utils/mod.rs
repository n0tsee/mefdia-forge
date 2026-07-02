use std::path::{Path, PathBuf};

/// Lossy `Path` -> `String` conversion, used everywhere we hand a path to ffmpeg.
pub fn path_str(path: &Path) -> String {
    path.to_string_lossy().to_string()
}

/// Builds the output path for a task, honoring the user's save-location settings.
///
/// - `same_folder`: write next to the original file.
/// - otherwise: write into `target_dir` (optionally inside an `Output` subfolder).
pub fn build_output_path(
    input: &Path,
    target_dir: Option<&Path>,
    use_output_subfolder: bool,
    new_extension: Option<&str>,
    suffix: Option<&str>,
) -> PathBuf {
    let stem = input
        .file_stem()
        .map(|s| s.to_string_lossy().to_string())
        .unwrap_or_else(|| "output".to_string());

    let extension = new_extension
        .map(str::to_string)
        .or_else(|| input.extension().map(|e| e.to_string_lossy().to_string()))
        .unwrap_or_else(|| "mp4".to_string());

    let file_name = match suffix {
        Some(suffix) => format!("{stem}{suffix}.{extension}"),
        None => format!("{stem}.{extension}"),
    };

    let base_dir = match target_dir {
        Some(dir) => dir.to_path_buf(),
        None => input
            .parent()
            .map(Path::to_path_buf)
            .unwrap_or_else(|| PathBuf::from(".")),
    };

    let final_dir = if use_output_subfolder {
        base_dir.join("Output")
    } else {
        base_dir
    };

    ensure_unique_path(final_dir.join(file_name))
}

/// Appends ` (1)`, ` (2)`, ... to the file stem until the path doesn't collide
/// with an existing file, so batch runs never silently overwrite outputs.
pub fn ensure_unique_path(path: PathBuf) -> PathBuf {
    if !path.exists() {
        return path;
    }
    let parent = path.parent().unwrap_or(Path::new(".")).to_path_buf();
    let stem = path
        .file_stem()
        .map(|s| s.to_string_lossy().to_string())
        .unwrap_or_default();
    let ext = path.extension().map(|e| e.to_string_lossy().to_string());

    let mut n = 1;
    loop {
        let candidate_name = match &ext {
            Some(ext) => format!("{stem} ({n}).{ext}"),
            None => format!("{stem} ({n})"),
        };
        let candidate = parent.join(candidate_name);
        if !candidate.exists() {
            return candidate;
        }
        n += 1;
    }
}
