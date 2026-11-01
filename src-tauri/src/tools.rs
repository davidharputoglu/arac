//! Recherche des outils de conversion : d'abord ceux fournis avec Araç
//! (à côté de l'exécutable), puis ceux installés sur le système.

use serde::Serialize;
use std::env;
use std::path::{Path, PathBuf};

#[derive(Clone, Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct Tool {
    pub path: PathBuf,
    /// Vrai si l'outil est celui fourni avec Araç.
    pub bundled: bool,
}

pub fn exe_dir() -> Option<PathBuf> {
    env::current_exe().ok()?.parent().map(Path::to_path_buf)
}

fn existing(p: PathBuf) -> Option<PathBuf> {
    if p.is_file() {
        Some(p)
    } else {
        None
    }
}

fn sidecar(name: &str) -> Option<Tool> {
    let dir = exe_dir()?;
    existing(dir.join(format!("{name}{}", env::consts::EXE_SUFFIX))).map(|path| Tool { path, bundled: true })
}

fn from_env(var: &str) -> Option<Tool> {
    let v = env::var_os(var)?;
    existing(PathBuf::from(v)).map(|path| Tool { path, bundled: false })
}

/// Cherche un programme dans le PATH.
pub fn which(name: &str) -> Option<PathBuf> {
    let paths = env::var_os("PATH")?;
    for dir in env::split_paths(&paths) {
        if cfg!(windows) {
            for ext in ["exe", "com", "bat", "cmd"] {
                if let Some(p) = existing(dir.join(format!("{name}.{ext}"))) {
                    return Some(p);
                }
            }
        }
        if let Some(p) = existing(dir.join(name)) {
            return Some(p);
        }
    }
    None
}

fn system(names: &[&str]) -> Option<Tool> {
    names.iter().find_map(|n| which(n)).map(|path| Tool { path, bundled: false })
}

pub fn ffmpeg() -> Option<Tool> {
    from_env("ARAC_FFMPEG").or_else(|| sidecar("arac-ffmpeg")).or_else(|| system(&["ffmpeg"]))
}

pub fn sevenzip() -> Option<Tool> {
    from_env("ARAC_7Z")
        .or_else(|| sidecar("arac-7z"))
        .or_else(|| system(&["7zz", "7z", "7za"]))
}

/// LibreOffice : copie installée avec Araç, puis installation du système.
pub fn libreoffice() -> Option<Tool> {
    if let Some(t) = from_env("ARAC_SOFFICE") {
        return Some(t);
    }
    if let Some(dir) = exe_dir() {
        if let Some(p) = soffice_in(&dir.join("libreoffice").join("program")) {
            return Some(Tool { path: p, bundled: true });
        }
    }
    let mut candidates: Vec<PathBuf> = Vec::new();
    if cfg!(windows) {
        for var in ["ProgramFiles", "ProgramW6432", "ProgramFiles(x86)"] {
            if let Some(pf) = env::var_os(var) {
                candidates.push(PathBuf::from(pf).join("LibreOffice").join("program"));
            }
        }
    } else {
        candidates.push(PathBuf::from("/usr/lib/libreoffice/program"));
        candidates.push(PathBuf::from("/usr/lib64/libreoffice/program"));
        candidates.push(PathBuf::from("/usr/local/lib/libreoffice/program"));
        candidates.push(PathBuf::from("/opt/libreoffice/program"));
        // Versions officielles installées dans /opt/libreofficeX.Y
        if let Ok(rd) = std::fs::read_dir("/opt") {
            let mut v: Vec<PathBuf> = rd
                .flatten()
                .map(|e| e.path())
                .filter(|p| p.file_name().map_or(false, |n| n.to_string_lossy().starts_with("libreoffice")))
                .map(|p| p.join("program"))
                .collect();
            v.sort();
            v.reverse();
            candidates.extend(v);
        }
    }
    for dir in candidates {
        if let Some(p) = soffice_in(&dir) {
            return Some(Tool { path: p, bundled: false });
        }
    }
    if let Some(t) = system(&["soffice", "libreoffice"]) {
        return Some(t);
    }
    if !cfg!(windows) {
        let mut flatpaks = vec![PathBuf::from("/var/lib/flatpak/exports/bin/org.libreoffice.LibreOffice")];
        if let Some(home) = env::var_os("HOME") {
            flatpaks.push(PathBuf::from(home).join(".local/share/flatpak/exports/bin/org.libreoffice.LibreOffice"));
        }
        flatpaks.push(PathBuf::from("/snap/bin/libreoffice"));
        for p in flatpaks {
            if p.exists() {
                return Some(Tool { path: p, bundled: false });
            }
        }
    }
    None
}

fn soffice_in(program_dir: &Path) -> Option<PathBuf> {
    if cfg!(windows) {
        // soffice.com attend la fin de la conversion et écrit dans la console.
        existing(program_dir.join("soffice.com")).or_else(|| existing(program_dir.join("soffice.exe")))
    } else {
        existing(program_dir.join("soffice"))
    }
}
