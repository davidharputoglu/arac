//! Vidéo, audio et images avec ffmpeg.

use crate::formats::{kind_of, Kind, AUDIO_TARGETS, IMAGE_TARGETS, VIDEO_TARGETS};
use crate::process::{self, Cancel, RunError, Stream};
use crate::{ConvError, Progress};
use std::path::Path;
use std::time::Duration;

fn s(v: &[&str]) -> Vec<String> {
    v.iter().map(|x| x.to_string()).collect()
}

/// Arguments placés entre l'entrée et la sortie de ffmpeg.
pub fn ffmpeg_args(input_ext: &str, target: &str) -> Option<Vec<String>> {
    let kind = kind_of(input_ext);
    let t = target;
    match kind {
        Kind::Video if VIDEO_TARGETS.contains(&t) => Some(video_args(t)),
        Kind::Video | Kind::Audio if AUDIO_TARGETS.contains(&t) => Some(audio_args(t)),
        Kind::Image if IMAGE_TARGETS.contains(&t) => Some(image_args(t)),
        _ => None,
    }
}

const EVEN: &str = "scale=trunc(iw/2)*2:trunc(ih/2)*2";

fn video_args(t: &str) -> Vec<String> {
    let h264 = ["-c:v", "libx264", "-preset", "medium", "-crf", "22", "-pix_fmt", "yuv420p", "-vf", EVEN];
    let mut a = match t {
        "mp4" | "mov" => {
            let mut a = s(&h264);
            a.extend(s(&["-c:a", "aac", "-b:a", "192k", "-movflags", "+faststart"]));
            a
        }
        "mkv" => {
            let mut a = s(&h264);
            a.extend(s(&["-c:a", "aac", "-b:a", "192k"]));
            a
        }
        "webm" => s(&[
            "-c:v", "libvpx-vp9", "-crf", "32", "-b:v", "0", "-row-mt", "1", "-deadline", "good", "-cpu-used", "4",
            "-c:a", "libopus", "-b:a", "128k",
        ]),
        "avi" => s(&["-c:v", "mpeg4", "-q:v", "4", "-vtag", "xvid", "-c:a", "libmp3lame", "-q:a", "4"]),
        "gif" => s(&[
            "-an",
            "-vf",
            "fps=12,scale='min(720,iw)':-1:flags=lanczos,split[a][b];[a]palettegen[p];[b][p]paletteuse",
            "-loop",
            "0",
        ]),
        _ => Vec::new(),
    };
    a.push("-sn".into());
    a
}

fn audio_args(t: &str) -> Vec<String> {
    let codec: &[&str] = match t {
        "mp3" => &["-c:a", "libmp3lame", "-q:a", "2"],
        "wav" => &["-c:a", "pcm_s16le"],
        "ogg" => &["-c:a", "libvorbis", "-q:a", "5"],
        "flac" => &["-c:a", "flac"],
        "aac" | "m4a" => &["-c:a", "aac", "-b:a", "192k"],
        "opus" => &["-c:a", "libopus", "-b:a", "128k"],
        _ => &[],
    };
    let mut a = s(&["-vn", "-sn"]);
    a.extend(s(codec));
    a
}

fn image_args(t: &str) -> Vec<String> {
    let mut a = s(&["-frames:v", "1", "-update", "1"]);
    match t {
        // Le JPEG n'a pas de transparence : on pose l'image sur un fond blanc.
        "jpg" => a.extend(s(&[
            "-filter_complex",
            "[0:v]format=rgba,split[a][b];[a]format=yuv444p,drawbox=c=white:t=fill[bg];[bg][b]overlay=format=auto,format=yuvj444p",
            "-q:v",
            "2",
        ])),
        "webp" => a.extend(s(&["-c:v", "libwebp", "-quality", "90"])),
        "gif" => a.extend(s(&[
            "-filter_complex",
            "[0:v]split[a][b];[a]palettegen=reserve_transparent=1[p];[b][p]paletteuse=alpha_threshold=128",
        ])),
        "ico" => a.extend(s(&[
            "-vf",
            "scale='min(256,iw)':'min(256,ih)':force_original_aspect_ratio=decrease",
        ])),
        _ => {}
    }
    a
}

/// Lit « Duration: 00:01:02.50, » dans les messages de ffmpeg.
pub fn parse_duration(line: &str) -> Option<f64> {
    let rest = line.trim_start().strip_prefix("Duration:")?.trim_start();
    let hms = rest.split(',').next()?.trim();
    let mut parts = hms.split(':');
    let h: f64 = parts.next()?.parse().ok()?;
    let m: f64 = parts.next()?.parse().ok()?;
    let sec: f64 = parts.next()?.parse().ok()?;
    Some(h * 3600.0 + m * 60.0 + sec)
}

pub fn convert(
    ffmpeg: &Path,
    input: &Path,
    output: &Path,
    input_ext: &str,
    target: &str,
    cancel: &Cancel,
    progress: &dyn Fn(Progress),
) -> Result<(), ConvError> {
    let args = ffmpeg_args(input_ext, target).ok_or(ConvError::Unsupported)?;
    let mut cmd = process::command(ffmpeg);
    cmd.args(["-hide_banner", "-nostdin", "-y", "-i"])
        .arg(input)
        .args(&args)
        .args(["-progress", "pipe:1", "-nostats"])
        .arg(output);
    progress(Progress::stage("media", Some(0.0)));
    let mut duration: Option<f64> = None;
    let result = process::run(cmd, cancel, Some(Duration::from_secs(24 * 3600)), |stream, line| match stream {
        Stream::Stderr => {
            if duration.is_none() {
                duration = parse_duration(line).filter(|d| *d > 0.0);
            }
        }
        Stream::Stdout => {
            if let Some(v) = line.strip_prefix("out_time_us=").or_else(|| line.strip_prefix("out_time_ms=")) {
                if let (Ok(us), Some(d)) = (v.trim().parse::<f64>(), duration) {
                    progress(Progress::stage("media", Some((us / 1_000_000.0 / d).clamp(0.0, 0.99))));
                }
            }
        }
    });
    match result {
        Ok(_) if output.is_file() => Ok(()),
        Ok(out) => Err(ConvError::Tool(out.tail)),
        Err(e) => Err(e.into()),
    }
}

impl From<RunError> for ConvError {
    fn from(e: RunError) -> Self {
        match e {
            RunError::Cancelled => ConvError::Cancelled,
            RunError::Timeout => ConvError::Timeout,
            RunError::Spawn(m) => ConvError::Tool(m),
            RunError::Failed { tail, .. } => ConvError::Tool(tail),
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn durations() {
        assert_eq!(parse_duration("  Duration: 00:01:02.50, start: 0.000000, bitrate: 1 kb/s"), Some(62.5));
        assert_eq!(parse_duration("Duration: N/A, bitrate: N/A"), None);
        assert_eq!(parse_duration("Stream #0:0"), None);
    }

    #[test]
    fn args_by_family() {
        assert!(ffmpeg_args("mkv", "mp4").unwrap().contains(&"libx264".to_string()));
        assert!(ffmpeg_args("mp4", "mp3").unwrap().contains(&"-vn".to_string()));
        assert!(ffmpeg_args("png", "jpg").unwrap().contains(&"-filter_complex".to_string()));
        assert!(ffmpeg_args("wav", "mp4").is_none());
        assert!(ffmpeg_args("png", "mp4").is_none());
        assert!(ffmpeg_args("docx", "pdf").is_none());
    }
}
