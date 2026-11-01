//! Araç — partie bureau (Tauri). Les conversions sont faites par des
//! outils natifs : ffmpeg, 7-Zip et LibreOffice.

mod archive;
mod formats;
mod media;
mod naming;
mod office;
mod process;
mod tools;

use naming::{ext_of, split_name};
use process::Cancel;
use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::path::{Path, PathBuf};
use std::sync::{Arc, Mutex};
use tauri::ipc::{Channel, InvokeBody, Request, Response};
use tauri::{Manager, State};

/// Message de progression envoyé à l'interface.
#[derive(Clone, Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct Progress {
    /// media, extract, compress, office, officeFirstRun, done
    pub stage: String,
    /// De 0 à 1, absent si l'outil ne donne pas d'avancement.
    pub percent: Option<f64>,
}

impl Progress {
    pub fn stage(stage: &str, percent: Option<f64>) -> Self {
        Progress { stage: stage.to_string(), percent }
    }
}

/// Erreurs renvoyées à l'interface sous forme de code + détail.
#[derive(Debug)]
pub enum ConvError {
    Cancelled,
    Timeout,
    Unsupported,
    MissingTool(&'static str),
    NotFound,
    Password,
    Empty,
    Tool(String),
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ErrorPayload {
    code: String,
    detail: String,
}

impl From<ConvError> for ErrorPayload {
    fn from(e: ConvError) -> Self {
        let (code, detail) = match e {
            ConvError::Cancelled => ("cancelled", String::new()),
            ConvError::Timeout => ("timeout", String::new()),
            ConvError::Unsupported => ("unsupported", String::new()),
            ConvError::MissingTool(t) => ("missingTool", t.to_string()),
            ConvError::NotFound => ("notFound", String::new()),
            ConvError::Password => ("password", String::new()),
            ConvError::Empty => ("empty", String::new()),
            ConvError::Tool(d) => ("tool", d),
        };
        ErrorPayload { code: code.into(), detail }
    }
}

#[derive(Default)]
struct Jobs(Mutex<HashMap<String, Arc<Cancel>>>);

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
struct EnginesStatus {
    ffmpeg: Option<tools::Tool>,
    sevenzip: Option<tools::Tool>,
    libreoffice: Option<tools::Tool>,
}

#[tauri::command]
async fn engines_status() -> EnginesStatus {
    tauri::async_runtime::spawn_blocking(|| EnginesStatus {
        ffmpeg: tools::ffmpeg(),
        sevenzip: tools::sevenzip(),
        libreoffice: tools::libreoffice(),
    })
    .await
    .unwrap_or(EnginesStatus { ffmpeg: None, sevenzip: None, libreoffice: None })
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
struct PathInfo {
    path: String,
    name: String,
    size: u64,
    is_dir: bool,
}

fn dir_size(p: &Path, budget: &mut u32) -> u64 {
    let mut total = 0;
    if let Ok(rd) = std::fs::read_dir(p) {
        for e in rd.flatten() {
            if *budget == 0 {
                break;
            }
            *budget -= 1;
            match e.metadata() {
                Ok(m) if m.is_dir() => total += dir_size(&e.path(), budget),
                Ok(m) => total += m.len(),
                Err(_) => {}
            }
        }
    }
    total
}

/// Nom et taille des fichiers déposés ou choisis.
#[tauri::command]
fn inspect_paths(paths: Vec<String>) -> Vec<PathInfo> {
    paths
        .into_iter()
        .filter_map(|p| {
            let pb = PathBuf::from(&p);
            let meta = std::fs::metadata(&pb).ok()?;
            let name = pb.file_name()?.to_string_lossy().to_string();
            let size = if meta.is_dir() { dir_size(&pb, &mut 20_000) } else { meta.len() };
            Some(PathInfo { path: p, name, size, is_dir: meta.is_dir() })
        })
        .collect()
}

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
struct ConvertRequest {
    job_id: String,
    input: String,
    /// Extension voulue, en minuscules : mp4, pdf, tar.gz…
    target: String,
    /// ffmpeg, 7z ou libreoffice
    engine: String,
    /// Dossier de sortie ; absent = à côté du fichier d'origine.
    output_dir: Option<String>,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
struct ConvertResult {
    output: String,
    size: u64,
}

fn output_dir_for(input: &Path, output_dir: Option<&str>) -> PathBuf {
    match output_dir {
        Some(d) if !d.trim().is_empty() => PathBuf::from(d),
        _ => input.parent().map(Path::to_path_buf).unwrap_or_else(|| PathBuf::from(".")),
    }
}

fn stem_for(input: &Path) -> String {
    let name = input.file_name().map(|n| n.to_string_lossy().to_string()).unwrap_or_else(|| "fichier".into());
    if input.is_dir() {
        name
    } else {
        split_name(&name).0
    }
}

fn run_conversion(
    req: &ConvertRequest,
    profile_dir: &Path,
    cancel: &Cancel,
    progress: &dyn Fn(Progress),
) -> Result<ConvertResult, ConvError> {
    let input = PathBuf::from(&req.input);
    if !input.exists() {
        return Err(ConvError::NotFound);
    }
    let target = req.target.to_lowercase();
    let out_dir = output_dir_for(&input, req.output_dir.as_deref());
    std::fs::create_dir_all(&out_dir).map_err(|e| ConvError::Tool(e.to_string()))?;
    let stem = stem_for(&input);
    let planned = naming::unique_output(&out_dir, &stem, &target);
    let tmp = naming::temp_sibling(&planned, &req.job_id, &target);
    let _ = std::fs::remove_file(&tmp);

    let result = match req.engine.as_str() {
        "ffmpeg" => {
            let t = tools::ffmpeg().ok_or(ConvError::MissingTool("ffmpeg"))?;
            media::convert(&t.path, &input, &tmp, &ext_of(&input), &target, cancel, progress)
        }
        "7z" => {
            let t = tools::sevenzip().ok_or(ConvError::MissingTool("7z"))?;
            archive::convert(&t.path, &input, &tmp, &target, cancel, progress)
        }
        "libreoffice" => {
            let t = tools::libreoffice().ok_or(ConvError::MissingTool("libreoffice"))?;
            office::convert(&t.path, profile_dir, &input, &tmp, &target, cancel, progress)
        }
        _ => Err(ConvError::Unsupported),
    };
    if let Err(e) = result {
        let _ = std::fs::remove_file(&tmp);
        return Err(e);
    }
    let final_path = naming::finalize(&tmp, &out_dir, &stem, &target).map_err(|e| {
        let _ = std::fs::remove_file(&tmp);
        ConvError::Tool(e.to_string())
    })?;
    let size = std::fs::metadata(&final_path).map(|m| m.len()).unwrap_or(0);
    progress(Progress::stage("done", Some(1.0)));
    Ok(ConvertResult { output: final_path.to_string_lossy().to_string(), size })
}

fn profile_dir(app: &tauri::AppHandle) -> PathBuf {
    app.path()
        .app_local_data_dir()
        .unwrap_or_else(|_| std::env::temp_dir().join("arac"))
        .join("libreoffice-profile")
}

#[tauri::command]
async fn convert(
    app: tauri::AppHandle,
    jobs: State<'_, Jobs>,
    request: ConvertRequest,
    on_progress: Channel<Progress>,
) -> Result<ConvertResult, ErrorPayload> {
    let cancel = Arc::new(Cancel::default());
    jobs.0.lock().unwrap().insert(request.job_id.clone(), cancel.clone());
    let profile = profile_dir(&app);
    let job_id = request.job_id.clone();
    let res = tauri::async_runtime::spawn_blocking(move || {
        let send = |p: Progress| {
            let _ = on_progress.send(p);
        };
        run_conversion(&request, &profile, &cancel, &send)
    })
    .await
    .unwrap_or_else(|e| Err(ConvError::Tool(e.to_string())));
    jobs.0.lock().unwrap().remove(&job_id);
    res.map_err(ErrorPayload::from)
}

#[tauri::command]
fn cancel(jobs: State<'_, Jobs>, job_id: String) {
    if let Some(c) = jobs.0.lock().unwrap().get(&job_id) {
        c.cancel();
    }
}

/// Contenu d'un fichier, pour les conversions faites dans l'interface
/// (Markdown, SVG, images vers PDF).
#[tauri::command]
fn read_file(path: String) -> Result<Response, String> {
    std::fs::read(&path).map(Response::new).map_err(|e| e.to_string())
}

fn header(req: &Request, name: &str) -> Option<String> {
    let raw = req.headers().get(name)?.to_str().ok()?;
    Some(percent_decode(raw))
}

fn percent_decode(s: &str) -> String {
    let b = s.as_bytes();
    let mut out = Vec::with_capacity(b.len());
    let mut i = 0;
    while i < b.len() {
        if b[i] == b'%' && i + 2 < b.len() {
            let hex = |c: u8| (c as char).to_digit(16);
            if let (Some(h), Some(l)) = (hex(b[i + 1]), hex(b[i + 2])) {
                out.push((h * 16 + l) as u8);
                i += 3;
                continue;
            }
        }
        out.push(b[i]);
        i += 1;
    }
    String::from_utf8_lossy(&out).to_string()
}

/// Enregistre le résultat d'une conversion faite dans l'interface.
/// En-têtes : x-input (fichier d'origine), x-target (extension), x-outdir.
#[tauri::command]
fn save_output(request: Request<'_>) -> Result<ConvertResult, String> {
    let InvokeBody::Raw(bytes) = request.body() else {
        return Err("corps attendu en binaire".into());
    };
    let input = PathBuf::from(header(&request, "x-input").ok_or("x-input manquant")?);
    let target = header(&request, "x-target").ok_or("x-target manquant")?.to_lowercase();
    if target.is_empty() || target.contains(['/', '\\']) {
        return Err("extension invalide".into());
    }
    let out_dir = output_dir_for(&input, header(&request, "x-outdir").as_deref());
    std::fs::create_dir_all(&out_dir).map_err(|e| e.to_string())?;
    let stem = stem_for(&input);
    let planned = naming::unique_output(&out_dir, &stem, &target);
    let tmp = naming::temp_sibling(&planned, "ui", &target);
    std::fs::write(&tmp, bytes).map_err(|e| e.to_string())?;
    let final_path = naming::finalize(&tmp, &out_dir, &stem, &target).map_err(|e| {
        let _ = std::fs::remove_file(&tmp);
        e.to_string()
    })?;
    Ok(ConvertResult { output: final_path.to_string_lossy().to_string(), size: bytes.len() as u64 })
}

/// Dossier proposé par défaut pour les fichiers convertis.
#[tauri::command]
fn default_output_dir(app: tauri::AppHandle) -> Option<String> {
    app.path()
        .download_dir()
        .or_else(|_| app.path().home_dir())
        .ok()
        .map(|p| p.to_string_lossy().to_string())
}

/// Montre le fichier dans l'explorateur de fichiers.
#[tauri::command]
fn reveal(path: String) -> Result<(), String> {
    let p = PathBuf::from(&path);
    #[cfg(windows)]
    {
        // explorer.exe ne doit pas recevoir de guillemets échappés par Rust.
        use std::os::windows::process::CommandExt;
        std::process::Command::new("explorer")
            .raw_arg(format!("/select,\"{}\"", p.display()))
            .spawn()
            .map_err(|e| e.to_string())?;
        Ok(())
    }
    #[cfg(not(windows))]
    {
        let dir = if p.is_dir() { p.clone() } else { p.parent().map(Path::to_path_buf).unwrap_or(p.clone()) };
        // Gestionnaires de fichiers compatibles : sélection du fichier.
        let uri = office::file_url(&p);
        let dbus = std::process::Command::new("dbus-send")
            .args([
                "--session",
                "--dest=org.freedesktop.FileManager1",
                "--type=method_call",
                "/org/freedesktop/FileManager1",
                "org.freedesktop.FileManager1.ShowItems",
                &format!("array:string:{uri}"),
                "string:",
            ])
            .status();
        if matches!(dbus, Ok(s) if s.success()) {
            return Ok(());
        }
        std::process::Command::new("xdg-open").arg(dir).spawn().map_err(|e| e.to_string())?;
        Ok(())
    }
}

/// Ouvre un lien (site, e-mail) avec le navigateur ou la messagerie du système.
#[tauri::command]
fn open_url(url: String) -> Result<(), String> {
    if !(url.starts_with("https://") || url.starts_with("mailto:")) || url.chars().any(|c| c.is_control() || c == '"') {
        return Err("adresse refusée".into());
    }
    #[cfg(windows)]
    {
        use std::os::windows::process::CommandExt;
        std::process::Command::new("rundll32")
            .raw_arg(format!("url.dll,FileProtocolHandler \"{url}\""))
            .spawn()
            .map_err(|e| e.to_string())?;
    }
    #[cfg(not(windows))]
    std::process::Command::new("xdg-open").arg(&url).spawn().map_err(|e| e.to_string())?;
    Ok(())
}

/// Langue choisie dans l'installateur (Windows) ou le script .sh (Linux),
/// sinon langue du système.
#[tauri::command]
fn initial_language(app: tauri::AppHandle) -> Option<String> {
    let mut files: Vec<PathBuf> = Vec::new();
    if let Some(d) = tools::exe_dir() {
        files.push(d.join("install-language"));
    }
    if let Ok(d) = app.path().config_dir() {
        files.push(d.join("arac").join("install-language"));
    }
    let installer = files
        .iter()
        .find_map(|f| std::fs::read_to_string(f).ok())
        .map(|s| s.trim().to_lowercase())
        .filter(|s| !s.is_empty());
    let system = sys_locale::get_locale().map(|l| l.to_lowercase());
    Some(format!("{}|{}", installer.unwrap_or_default(), system.unwrap_or_default()))
}

pub fn run() {
    // Évite une fenêtre blanche avec certains pilotes graphiques sous Linux.
    #[cfg(target_os = "linux")]
    if std::env::var_os("WEBKIT_DISABLE_DMABUF_RENDERER").is_none() {
        std::env::set_var("WEBKIT_DISABLE_DMABUF_RENDERER", "1");
    }

    tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
        .manage(Jobs::default())
        .invoke_handler(tauri::generate_handler![
            engines_status,
            inspect_paths,
            convert,
            cancel,
            read_file,
            save_output,
            default_output_dir,
            reveal,
            open_url,
            initial_language
        ])
        .run(tauri::generate_context!())
        .expect("erreur au lancement d'Araç");
}

#[cfg(test)]
mod tests_integration;

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn decode() {
        assert_eq!(percent_decode("C%3A%5CUsers%5Cd%C3%A9"), "C:\\Users\\dé");
        assert_eq!(percent_decode("a%2"), "a%2");
        assert_eq!(percent_decode("100%25"), "100%");
    }
}
