# FFmpeg sidecar binaries

Tauri bundles FFmpeg/FFprobe as "sidecar" executables. This folder must contain
one static build of `ffmpeg` and `ffprobe` **per target platform you build for**,
named with the Rust target-triple suffix (see `externalBin` in `tauri.conf.json`).

Place the files here (download static builds — see sources below):

| Platform            | Target triple                | Files                                                        |
|---------------------|-------------------------------|---------------------------------------------------------------|
| Windows x64         | `x86_64-pc-windows-msvc`       | `ffmpeg-x86_64-pc-windows-msvc.exe`, `ffprobe-x86_64-pc-windows-msvc.exe` |
| macOS Apple Silicon | `aarch64-apple-darwin`         | `ffmpeg-aarch64-apple-darwin`, `ffprobe-aarch64-apple-darwin`  |
| macOS Intel         | `x86_64-apple-darwin`          | `ffmpeg-x86_64-apple-darwin`, `ffprobe-x86_64-apple-darwin`    |
| Linux x64           | `x86_64-unknown-linux-gnu`     | `ffmpeg-x86_64-unknown-linux-gnu`, `ffprobe-x86_64-unknown-linux-gnu` |

Find your current dev machine's target triple with `rustc -vV | grep host`.

## Where to get static builds

- Windows: https://www.gyan.dev/ffmpeg/builds/ (release "full" or "essentials" build, `bin/ffmpeg.exe` + `bin/ffprobe.exe`)
- Linux: https://johnvansickle.com/ffmpeg/ (static builds)
- macOS: https://evermeet.cx/ffmpeg/ (separate `ffmpeg` and `ffprobe` static builds)

## Setup (example for this machine: aarch64-apple-darwin)

```bash
cd src-tauri/binaries
curl -L -o ffmpeg.zip   https://evermeet.cx/ffmpeg/getrelease/zip
curl -L -o ffprobe.zip  https://evermeet.cx/ffmpeg/getrelease/ffprobe/zip
unzip ffmpeg.zip  && mv ffmpeg  ffmpeg-aarch64-apple-darwin
unzip ffprobe.zip && mv ffprobe ffprobe-aarch64-apple-darwin
chmod +x ffmpeg-aarch64-apple-darwin ffprobe-aarch64-apple-darwin
rm ffmpeg.zip ffprobe.zip
```

## License note

FFmpeg static builds that include libx264/libopus are licensed GPL. Since this
app bundles the binary (not linking dynamically), when distributing publicly
you must comply with GPL: ship/offer the corresponding FFmpeg source or a
written offer for it, and make sure your own app's license is compatible, or
switch to an LGPL build without GPL-only encoders (loses libx264 — not
recommended for this app since H.264 is required for Telegram compatibility).
