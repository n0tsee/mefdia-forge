pub mod binary;
pub mod probe;
pub mod progress;
pub mod runner;

pub use probe::{probe, MediaInfo};
pub use runner::{run_ffmpeg, ChildRegistry, RunOutcome};

// `runner` also exposes `CancelledSet` and `cancel`/`cancel_all`, referenced
// via `ffmpeg::runner::...` where the full path reads clearer.
