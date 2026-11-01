//! Archives avec 7-Zip : extraction dans un dossier temporaire puis
//! recompression dans le format choisi. Un fichier ou un dossier quelconque
//! peut aussi être compressé directement.

use crate::formats::{kind_of, Kind, ARCHIVE_TARGETS};
use crate::naming::ext_of;
use crate::process::{self, Cancel, RunError, Stream};
use crate::{ConvError, Progress};
use std::ffi::OsString;
use std::path::{Path, PathBuf};
use std::time::Duration;

/// Mot de passe factice : une archive non chiffrée s'ouvre normalement, une
/// archive chiffrée échoue tout de suite au lieu d'attendre une saisie.
const NO_PASSWORD: &str = "-parac-no-password";
const TIMEOUT: Option<Duration> = Some(Duration::from_secs(12 * 3600));

/// Lit « 45% » au début d'une ligne de progression de 7-Zip.
pub fn parse_percent(line: &str) -> Option<f64> {
    let t = line.trim_start();
    let end = t.find('%')?;
    t[..end].trim().parse::<f64>().ok().map(|p| (p / 100.0).clamp(0.0, 1.0))
}

fn run_7z(
    sevenzip: &Path,
    args: Vec<OsString>,
    cwd: Option<&Path>,
    cancel: &Cancel,
    progress: &dyn Fn(Progress),
    stage: &'static str,
    from: f64,
    span: f64,
) -> Result<(), ConvError> {
    let mut cmd = process::command(sevenzip);
    cmd.args(&args);
    if let Some(d) = cwd {
        cmd.current_dir(d);
    }
    progress(Progress::stage(stage, Some(from)));
    let mut errors: Vec<String> = Vec::new();
    let r = process::run(cmd, cancel, TIMEOUT, |stream, line| {
        if stream == Stream::Stdout {
            if let Some(p) = parse_percent(line) {
                progress(Progress::stage(stage, Some(from + p * span)));
            }
        }
        if line.contains("Wrong password") || line.contains("Can not open encrypted archive") {
            errors.push("password".into());
        }
    });
    match r {
        Ok(_) => Ok(()),
        Err(_) if !errors.is_empty() => Err(ConvError::Password),
        Err(RunError::Failed { tail, .. }) if tail.contains("Wrong password") => Err(ConvError::Password),
        Err(e) => Err(e.into()),
    }
}

fn os(v: &[&str]) -> Vec<OsString> {
    v.iter().map(OsString::from).collect()
}

/// Extrait `input` dans `dest`. Les .tar.gz, .tgz… sont dépliés deux fois.
fn extract(sevenzip: &Path, input: &Path, dest: &Path, cancel: &Cancel, progress: &dyn Fn(Progress)) -> Result<(), ConvError> {
    let first = dest.join("1");
    std::fs::create_dir_all(&first).map_err(io)?;
    let mut args = os(&["x", "-y", "-bsp1", "-bso0", NO_PASSWORD]);
    args.push(OsString::from(format!("-o{}", first.display())));
    args.push(input.as_os_str().to_owned());
    run_7z(sevenzip, args, None, cancel, progress, "extract", 0.0, 0.45)?;

    // Un seul fichier .tar à l'intérieur : c'était une archive tar compressée.
    let entries: Vec<PathBuf> = std::fs::read_dir(&first).map_err(io)?.flatten().map(|e| e.path()).collect();
    let content = dest.join("content");
    if entries.len() == 1 && entries[0].is_file() && ext_of(&entries[0]) == "tar" {
        std::fs::create_dir_all(&content).map_err(io)?;
        let mut args = os(&["x", "-y", "-bsp1", "-bso0"]);
        args.push(OsString::from(format!("-o{}", content.display())));
        args.push(entries[0].as_os_str().to_owned());
        run_7z(sevenzip, args, None, cancel, progress, "extract", 0.45, 0.05)?;
        let _ = std::fs::remove_dir_all(&first);
    } else {
        std::fs::rename(&first, &content).map_err(io)?;
    }
    Ok(())
}

fn io(e: std::io::Error) -> ConvError {
    ConvError::Tool(e.to_string())
}

/// Compresse `items` (relatifs à `cwd`) dans `output` au format `target`.
fn pack(
    sevenzip: &Path,
    cwd: &Path,
    items: Vec<OsString>,
    output: &Path,
    target: &str,
    work: &Path,
    cancel: &Cancel,
    progress: &dyn Fn(Progress),
    from: f64,
) -> Result<(), ConvError> {
    let span = 1.0 - from;
    let _ = std::fs::remove_file(output);
    let simple = |kind: &str, level: &str| -> Vec<OsString> {
        let mut a = os(&["a", "-y", "-bsp1", "-bso0", kind, level]);
        a.push(output.as_os_str().to_owned());
        a
    };
    match target {
        "zip" | "cbz" | "7z" | "tar" => {
            let mut args = match target {
                "7z" => simple("-t7z", "-mx=7"),
                "tar" => simple("-ttar", "-mx=0"),
                _ => simple("-tzip", "-mx=5"),
            };
            args.extend(items);
            run_7z(sevenzip, args, Some(cwd), cancel, progress, "compress", from, span)
        }
        "tar.gz" | "tar.xz" | "tar.bz2" => {
            let tar = work.join("archive.tar");
            let _ = std::fs::remove_file(&tar);
            let mut args = os(&["a", "-y", "-bsp1", "-bso0", "-ttar"]);
            args.push(tar.as_os_str().to_owned());
            args.extend(items);
            run_7z(sevenzip, args, Some(cwd), cancel, progress, "compress", from, span * 0.3)?;
            let kind = match target {
                "tar.gz" => "-tgzip",
                "tar.xz" => "-txz",
                _ => "-tbzip2",
            };
            let mut args = simple(kind, "-mx=6");
            args.push(tar.as_os_str().to_owned());
            run_7z(sevenzip, args, Some(work), cancel, progress, "compress", from + span * 0.3, span * 0.7)
        }
        _ => Err(ConvError::Unsupported),
    }
}

/// Tous les éléments d'un dossier (y compris les fichiers cachés).
fn children(dir: &Path) -> Result<Vec<OsString>, ConvError> {
    let mut v: Vec<OsString> = std::fs::read_dir(dir).map_err(io)?.flatten().map(|e| e.file_name()).collect();
    v.sort();
    Ok(v)
}

pub fn convert(
    sevenzip: &Path,
    input: &Path,
    output: &Path,
    target: &str,
    cancel: &Cancel,
    progress: &dyn Fn(Progress),
) -> Result<(), ConvError> {
    if !ARCHIVE_TARGETS.contains(&target) {
        return Err(ConvError::Unsupported);
    }
    let work = tempfile::Builder::new().prefix("arac-").tempdir().map_err(io)?;
    let is_archive = input.is_file() && kind_of(&ext_of(input)) == Kind::Archive;
    if is_archive {
        extract(sevenzip, input, work.path(), cancel, progress)?;
        let content = work.path().join("content");
        let items = children(&content)?;
        if items.is_empty() {
            return Err(ConvError::Empty);
        }
        pack(sevenzip, &content, items, output, target, work.path(), cancel, progress, 0.5)?;
    } else {
        // Fichier ou dossier quelconque : on le compresse tel quel.
        let parent = input.parent().ok_or(ConvError::Unsupported)?;
        let name = input.file_name().ok_or(ConvError::Unsupported)?.to_owned();
        pack(sevenzip, parent, vec![name], output, target, work.path(), cancel, progress, 0.0)?;
    }
    if output.is_file() {
        Ok(())
    } else {
        Err(ConvError::Tool("7-Zip n'a produit aucun fichier".into()))
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn percents() {
        assert_eq!(parse_percent(" 45% 3 - photo.jpg"), Some(0.45));
        assert_eq!(parse_percent("100%"), Some(1.0));
        assert_eq!(parse_percent("Everything is Ok"), None);
    }
}
