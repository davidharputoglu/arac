//! Documents avec LibreOffice en mode sans fenêtre.

use crate::formats::{kind_of, Kind};
use crate::naming::{ext_of, split_name};
use crate::process::{self, Cancel};
use crate::{ConvError, Progress};
use std::ffi::OsString;
use std::path::{Path, PathBuf};
use std::sync::Mutex;
use std::time::Duration;

/// LibreOffice ne supporte pas deux conversions en même temps sur un même profil.
static LOCK: Mutex<()> = Mutex::new(());

pub struct Plan {
    pub convert_to: String,
    pub infilter: Option<String>,
}

/// Choisit le filtre d'export (et d'import si besoin) selon la conversion.
pub fn plan(input_ext: &str, target: &str) -> Option<Plan> {
    let kind = kind_of(input_ext);
    let writer = ["pdf", "docx", "doc", "odt", "rtf", "txt", "html"];
    let calc = ["xlsx", "xls", "ods", "csv", "pdf", "html"];
    let impress = ["pptx", "ppt", "odp", "pdf"];
    let ok = match kind {
        Kind::Text | Kind::Markdown => writer.contains(&target),
        Kind::Spreadsheet => calc.contains(&target),
        Kind::Presentation => impress.contains(&target),
        Kind::Pdf => ["docx", "odt", "txt"].contains(&target),
        // Les images vers PDF passent par Draw quand la voie rapide n'existe pas.
        Kind::Image => target == "pdf",
        _ => false,
    };
    if !ok || input_ext == target {
        return None;
    }
    let convert_to = match target {
        "txt" => "txt:Text (encoded):UTF8".to_string(),
        "csv" => "csv:Text - txt - csv (StarCalc):44,34,76,1".to_string(),
        "html" if kind == Kind::Spreadsheet => "html:HTML (StarCalc)".to_string(),
        "html" => "html:HTML (StarWriter)".to_string(),
        "docx" => "docx:MS Word 2007 XML".to_string(),
        "doc" => "doc:MS Word 97".to_string(),
        "xlsx" => "xlsx:Calc MS Excel 2007 XML".to_string(),
        "xls" => "xls:MS Excel 97".to_string(),
        "pptx" => "pptx:Impress MS PowerPoint 2007 XML".to_string(),
        "ppt" => "ppt:MS PowerPoint 97".to_string(),
        other => other.to_string(),
    };
    let infilter = match (kind, input_ext) {
        (Kind::Pdf, _) => Some("writer_pdf_import".to_string()),
        (Kind::Text, "html" | "htm") | (Kind::Markdown, _) => Some("HTML (StarWriter)".to_string()),
        (Kind::Spreadsheet, "csv") => Some("CSV:44,34,76,1".to_string()),
        _ => None,
    };
    Some(Plan { convert_to, infilter })
}

/// Chemin → URL file:/// attendue par -env:UserInstallation.
pub fn file_url(path: &Path) -> String {
    let raw = path.to_string_lossy().replace('\\', "/");
    let mut out = String::new();
    for b in raw.bytes() {
        let c = b as char;
        if c.is_ascii_alphanumeric() || "-._~/:".contains(c) {
            out.push(c);
        } else {
            out.push_str(&format!("%{b:02X}"));
        }
    }
    if out.starts_with('/') {
        format!("file://{out}")
    } else {
        format!("file:///{out}")
    }
}

/// Markdown → page HTML complète (UTF-8) que LibreOffice sait ouvrir.
pub fn markdown_to_html(md: &str, title: &str) -> String {
    use pulldown_cmark::{html, Options, Parser};
    let mut opts = Options::empty();
    opts.insert(Options::ENABLE_TABLES);
    opts.insert(Options::ENABLE_STRIKETHROUGH);
    opts.insert(Options::ENABLE_TASKLISTS);
    let mut body = String::new();
    html::push_html(&mut body, Parser::new_ext(md, opts));
    let title = title.replace('&', "&amp;").replace('<', "&lt;");
    format!(
        "<!DOCTYPE html>\n<html><head><meta charset=\"utf-8\"><title>{title}</title></head>\n<body>\n{body}</body></html>\n"
    )
}

pub fn convert(
    soffice: &Path,
    profile_dir: &Path,
    input: &Path,
    output: &Path,
    target: &str,
    cancel: &Cancel,
    progress: &dyn Fn(Progress),
) -> Result<(), ConvError> {
    let input_ext = ext_of(input);
    let plan = plan(&input_ext, target).ok_or(ConvError::Unsupported)?;
    let work = tempfile::Builder::new().prefix("arac-office-").tempdir().map_err(|e| ConvError::Tool(e.to_string()))?;
    let stem = input.file_name().map(|n| split_name(&n.to_string_lossy()).0).unwrap_or_else(|| "document".into());

    // Le Markdown est d'abord transformé en HTML.
    let source: PathBuf = if kind_of(&input_ext) == Kind::Markdown {
        let md = std::fs::read_to_string(input).map_err(|e| ConvError::Tool(e.to_string()))?;
        let html_path = work.path().join(format!("{stem}.html"));
        std::fs::write(&html_path, markdown_to_html(&md, &stem)).map_err(|e| ConvError::Tool(e.to_string()))?;
        html_path
    } else {
        input.to_path_buf()
    };
    let outdir = work.path().join("out");
    std::fs::create_dir_all(&outdir).map_err(|e| ConvError::Tool(e.to_string()))?;

    let first_run = !profile_dir.join("user").exists();
    let _guard = LOCK.lock().unwrap_or_else(|p| p.into_inner());
    progress(Progress::stage(if first_run { "officeFirstRun" } else { "office" }, None));

    let mut cmd = process::command(soffice);
    let mut args: Vec<OsString> = ["--headless", "--invisible", "--nologo", "--norestore", "--nodefault", "--nolockcheck"]
        .iter()
        .map(OsString::from)
        .collect();
    args.push(OsString::from(format!("-env:UserInstallation={}", file_url(profile_dir))));
    if let Some(f) = &plan.infilter {
        args.push(OsString::from(format!("--infilter={f}")));
    }
    args.push("--convert-to".into());
    args.push(plan.convert_to.clone().into());
    args.push("--outdir".into());
    args.push(outdir.as_os_str().to_owned());
    args.push(source.as_os_str().to_owned());
    cmd.args(&args);
    // La toute première exécution crée le profil : on laisse plus de temps.
    let timeout = Duration::from_secs(if first_run { 600 } else { 300 });
    let result = process::run(cmd, cancel, Some(timeout), |_, _| {});

    // LibreOffice répond parfois 0 sans rien produire : on vérifie le fichier.
    let produced = std::fs::read_dir(&outdir)
        .ok()
        .and_then(|rd| rd.flatten().map(|e| e.path()).find(|p| p.is_file()));
    match (result, produced) {
        (Ok(_), Some(p)) | (Err(process::RunError::Failed { .. }), Some(p)) => {
            if std::fs::rename(&p, output).is_err() {
                std::fs::copy(&p, output).map_err(|e| ConvError::Tool(e.to_string()))?;
            }
            Ok(())
        }
        (Ok(out), None) => Err(ConvError::Tool(if out.tail.is_empty() {
            "LibreOffice n'a produit aucun fichier".into()
        } else {
            out.tail
        })),
        (Err(e), _) => Err(e.into()),
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn plans() {
        assert_eq!(plan("docx", "pdf").unwrap().convert_to, "pdf");
        assert!(plan("docx", "docx").is_none());
        assert_eq!(plan("pdf", "docx").unwrap().infilter.as_deref(), Some("writer_pdf_import"));
        assert!(plan("pdf", "xlsx").is_none());
        assert!(plan("xlsx", "csv").unwrap().convert_to.starts_with("csv:"));
        assert!(plan("pptx", "docx").is_none());
        assert_eq!(plan("md", "odt").unwrap().infilter.as_deref(), Some("HTML (StarWriter)"));
    }

    #[test]
    fn urls() {
        assert_eq!(file_url(Path::new("/home/a b/p")), "file:///home/a%20b/p");
        assert_eq!(
            file_url(Path::new(r"C:\Users\Dénis\AppData")),
            "file:///C:/Users/D%C3%A9nis/AppData"
        );
    }

    #[test]
    fn markdown() {
        let h = markdown_to_html("# Titre\n\n| a | b |\n|---|---|\n| 1 | 2 |\n", "x");
        assert!(h.contains("<h1>Titre</h1>"));
        assert!(h.contains("<table>"));
        assert!(h.contains("charset=\"utf-8\""));
    }
}
