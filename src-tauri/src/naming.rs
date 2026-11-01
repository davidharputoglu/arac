//! Noms des fichiers produits : jamais d'écrasement, extensions doubles
//! (.tar.gz…) reconnues, fichier temporaire à côté de la destination.

use std::path::{Path, PathBuf};

const COMPOUND: [&str; 5] = ["tar.gz", "tar.xz", "tar.bz2", "tar.zst", "tar.lz"];

/// Sépare un nom de fichier en (base, extension en minuscules).
pub fn split_name(name: &str) -> (String, String) {
    let lower = name.to_lowercase();
    for c in COMPOUND {
        let suffix = format!(".{c}");
        if lower.ends_with(&suffix) && name.len() > suffix.len() {
            return (name[..name.len() - suffix.len()].to_string(), c.to_string());
        }
    }
    match name.rfind('.') {
        Some(i) if i > 0 => (name[..i].to_string(), lower[i + 1..].to_string()),
        _ => (name.to_string(), String::new()),
    }
}

/// Extension (en minuscules) d'un chemin.
pub fn ext_of(path: &Path) -> String {
    path.file_name().map(|n| split_name(&n.to_string_lossy()).1).unwrap_or_default()
}

/// Premier nom libre parmi « base.ext », « base (1).ext », « base (2).ext »…
pub fn unique_output(dir: &Path, stem: &str, ext: &str) -> PathBuf {
    let make = |n: u32| {
        let base = if n == 0 { stem.to_string() } else { format!("{stem} ({n})") };
        if ext.is_empty() {
            dir.join(base)
        } else {
            dir.join(format!("{base}.{ext}"))
        }
    };
    let mut n = 0;
    loop {
        let p = make(n);
        if !p.exists() {
            return p;
        }
        n += 1;
    }
}

/// Fichier temporaire caché, dans le même dossier que la destination
/// (le renommage final est alors instantané).
pub fn temp_sibling(final_path: &Path, job_id: &str, ext: &str) -> PathBuf {
    let dir = final_path.parent().unwrap_or(Path::new("."));
    let safe: String = job_id.chars().filter(|c| c.is_ascii_alphanumeric() || *c == '-').take(40).collect();
    dir.join(format!(".arac-{safe}.{ext}"))
}

/// Déplace le fichier temporaire vers un nom libre et retourne ce nom.
pub fn finalize(tmp: &Path, dir: &Path, stem: &str, ext: &str) -> std::io::Result<PathBuf> {
    let dest = unique_output(dir, stem, ext);
    std::fs::rename(tmp, &dest)?;
    Ok(dest)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn split_simple_and_compound() {
        assert_eq!(split_name("film.MP4"), ("film".into(), "mp4".into()));
        assert_eq!(split_name("sauvegarde.tar.gz"), ("sauvegarde".into(), "tar.gz".into()));
        assert_eq!(split_name("a.b.c.tar.XZ"), ("a.b.c".into(), "tar.xz".into()));
        assert_eq!(split_name("Makefile"), ("Makefile".into(), "".into()));
        assert_eq!(split_name(".bashrc"), (".bashrc".into(), "".into()));
        assert_eq!(split_name("photo.2024.jpeg"), ("photo.2024".into(), "jpeg".into()));
    }

    #[test]
    fn unique_never_overwrites() {
        let d = tempfile::tempdir().unwrap();
        let p0 = unique_output(d.path(), "doc", "pdf");
        assert_eq!(p0.file_name().unwrap(), "doc.pdf");
        std::fs::write(&p0, b"x").unwrap();
        let p1 = unique_output(d.path(), "doc", "pdf");
        assert_eq!(p1.file_name().unwrap(), "doc (1).pdf");
        std::fs::write(&p1, b"x").unwrap();
        assert_eq!(unique_output(d.path(), "doc", "pdf").file_name().unwrap(), "doc (2).pdf");
    }

    #[test]
    fn temp_name_is_hidden_and_safe() {
        let t = temp_sibling(Path::new("/x/y/out.tar.gz"), "job/../1", "tar.gz");
        assert_eq!(t, Path::new("/x/y/.arac-job1.tar.gz"));
    }
}
