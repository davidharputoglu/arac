//! Familles de formats reconnues côté bureau. La liste des conversions
//! proposées à l'utilisateur vit dans `src/formats/catalog.ts` ; ce module
//! ne fait que valider et choisir les réglages.

#[derive(Clone, Copy, Debug, PartialEq, Eq)]
pub enum Kind {
    Video,
    Audio,
    Image,
    Text,
    Spreadsheet,
    Presentation,
    Pdf,
    Markdown,
    Archive,
    Other,
}

pub const VIDEO: &[&str] = &[
    "mp4", "m4v", "webm", "mkv", "avi", "mov", "flv", "wmv", "mpeg", "mpg", "3gp", "ogv", "ts", "mts", "m2ts", "vob",
];
pub const AUDIO: &[&str] = &["mp3", "wav", "ogg", "oga", "flac", "aac", "m4a", "wma", "opus", "aiff", "aif", "amr", "ac3"];
pub const IMAGE: &[&str] = &["jpg", "jpeg", "png", "gif", "webp", "bmp", "tiff", "tif", "ico"];
pub const TEXT: &[&str] = &["doc", "docx", "odt", "rtf", "txt", "html", "htm"];
pub const SPREADSHEET: &[&str] = &["xls", "xlsx", "ods", "csv"];
pub const PRESENTATION: &[&str] = &["ppt", "pptx", "odp"];
pub const ARCHIVE: &[&str] = &[
    "zip", "7z", "rar", "tar", "gz", "tgz", "tar.gz", "bz2", "tbz2", "tar.bz2", "xz", "txz", "tar.xz", "zst", "tar.zst",
    "cbz", "cbr", "cb7", "iso",
];

pub fn kind_of(ext: &str) -> Kind {
    let e = ext.to_ascii_lowercase();
    let e = e.as_str();
    if VIDEO.contains(&e) {
        Kind::Video
    } else if AUDIO.contains(&e) {
        Kind::Audio
    } else if IMAGE.contains(&e) {
        Kind::Image
    } else if TEXT.contains(&e) {
        Kind::Text
    } else if SPREADSHEET.contains(&e) {
        Kind::Spreadsheet
    } else if PRESENTATION.contains(&e) {
        Kind::Presentation
    } else if e == "pdf" {
        Kind::Pdf
    } else if e == "md" || e == "markdown" {
        Kind::Markdown
    } else if ARCHIVE.contains(&e) {
        Kind::Archive
    } else {
        Kind::Other
    }
}

pub const VIDEO_TARGETS: &[&str] = &["mp4", "webm", "mkv", "avi", "mov", "gif"];
pub const AUDIO_TARGETS: &[&str] = &["mp3", "wav", "ogg", "flac", "aac", "m4a", "opus"];
pub const IMAGE_TARGETS: &[&str] = &["jpg", "png", "webp", "gif", "bmp", "tiff", "ico"];
pub const ARCHIVE_TARGETS: &[&str] = &["zip", "7z", "tar", "tar.gz", "tar.xz", "tar.bz2", "cbz"];
