/// Incremental parser for FFmpeg's `-progress pipe:1` machine-readable output.
///
/// FFmpeg emits a block of `key=value` lines for every reporting interval,
/// terminated by either `progress=continue` or `progress=end`. We only care
/// about `out_time=HH:MM:SS.ffffff` to compute a percentage against the
/// media's total duration (obtained up-front via ffprobe).
#[derive(Debug, Clone, Copy, Default)]
pub struct ProgressState {
    out_time_secs: f64,
}

#[derive(Debug, Clone, Copy)]
pub enum ProgressEvent {
    Update { out_time_secs: f64 },
    Ended,
}

impl ProgressState {
    pub fn feed_line(&mut self, line: &str) -> Option<ProgressEvent> {
        let line = line.trim();

        if let Some(value) = line.strip_prefix("out_time=") {
            if let Some(secs) = parse_timecode(value) {
                self.out_time_secs = secs;
            }
            return None;
        }

        match line {
            "progress=continue" => Some(ProgressEvent::Update {
                out_time_secs: self.out_time_secs,
            }),
            "progress=end" => Some(ProgressEvent::Ended),
            _ => None,
        }
    }
}

fn parse_timecode(value: &str) -> Option<f64> {
    let mut parts = value.split(':');
    let h: f64 = parts.next()?.parse().ok()?;
    let m: f64 = parts.next()?.parse().ok()?;
    let s: f64 = parts.next()?.parse().ok()?;
    Some(h * 3600.0 + m * 60.0 + s)
}

/// Clamped percentage of `out_time_secs` against `total_secs`.
/// Falls back to `0.0` when the total duration is unknown (e.g. probe failed).
pub fn percent(out_time_secs: f64, total_secs: f64) -> f32 {
    if total_secs <= 0.0 {
        return 0.0;
    }
    ((out_time_secs / total_secs) * 100.0).clamp(0.0, 100.0) as f32
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn parses_progress_block() {
        let mut state = ProgressState::default();
        assert!(state.feed_line("frame=120").is_none());
        assert!(state.feed_line("out_time=00:00:05.500000").is_none());
        match state.feed_line("progress=continue") {
            Some(ProgressEvent::Update { out_time_secs }) => {
                assert!((out_time_secs - 5.5).abs() < 1e-6);
            }
            _ => panic!("expected update event"),
        }
    }

    #[test]
    fn computes_percent() {
        assert_eq!(percent(50.0, 100.0), 50.0);
        assert_eq!(percent(150.0, 100.0), 100.0);
        assert_eq!(percent(10.0, 0.0), 0.0);
    }
}
