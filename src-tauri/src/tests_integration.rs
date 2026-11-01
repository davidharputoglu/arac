//! Conversions réelles avec les outils présents sur la machine de test.
//! Chaque test est ignoré (avec un message) si l'outil manque.

use super::*;
use std::process::Command;
use std::sync::atomic::{AtomicUsize, Ordering};

static N: AtomicUsize = AtomicUsize::new(0);

fn req(input: &Path, target: &str, engine: &str, out: &Path) -> ConvertRequest {
    ConvertRequest {
        job_id: format!("t{}", N.fetch_add(1, Ordering::SeqCst)),
        input: input.to_string_lossy().to_string(),
        target: target.into(),
        engine: engine.into(),
        output_dir: Some(out.to_string_lossy().to_string()),
    }
}

fn convert_ok(input: &Path, target: &str, engine: &str, out: &Path, profile: &Path) -> PathBuf {
    let cancel = Cancel::default();
    let last = std::sync::Mutex::new(None);
    let r = run_conversion(&req(input, target, engine, out), profile, &cancel, &|p: Progress| {
        *last.lock().unwrap() = Some(p.stage.clone());
    })
    .unwrap_or_else(|e| panic!("{} -> {target} : {:?}", input.display(), e));
    assert_eq!(last.lock().unwrap().as_deref(), Some("done"));
    let p = PathBuf::from(r.output);
    assert!(p.is_file(), "{} absent", p.display());
    assert!(r.size > 0, "{} vide", p.display());
    // Aucun fichier temporaire ne doit rester.
    for e in std::fs::read_dir(out).unwrap().flatten() {
        assert!(!e.file_name().to_string_lossy().starts_with(".arac-"), "temporaire oublié");
    }
    p
}

fn ffmpeg_gen(args: &[&str], out: &Path) {
    let ff = tools::ffmpeg().unwrap().path;
    let ok = Command::new(ff).args(["-loglevel", "error", "-y"]).args(args).arg(out).status().unwrap();
    assert!(ok.success());
}

fn probe(p: &Path) -> String {
    let ff = tools::ffmpeg().unwrap().path;
    let o = Command::new(ff).args(["-hide_banner", "-i"]).arg(p).output().unwrap();
    String::from_utf8_lossy(&o.stderr).to_string()
}

#[test]
fn media_conversions() {
    if tools::ffmpeg().is_none() {
        eprintln!("ffmpeg absent : test ignoré");
        return;
    }
    let d = tempfile::tempdir().unwrap();
    let src = d.path().join("src");
    let out = d.path().join("sortie avec espaces");
    std::fs::create_dir_all(&src).unwrap();
    let video = src.join("clip vidéo.mp4");
    ffmpeg_gen(
        &["-f", "lavfi", "-i", "testsrc=size=321x241:rate=10", "-f", "lavfi", "-i", "sine=duration=2", "-t", "2",
          "-pix_fmt", "yuv444p", "-c:v", "libx264", "-c:a", "aac", "-shortest"],
        &video,
    );
    let audio = src.join("son.wav");
    ffmpeg_gen(&["-f", "lavfi", "-i", "sine=frequency=440:duration=2"], &audio);
    let image = src.join("transparente.png");
    ffmpeg_gen(&["-f", "lavfi", "-i", "color=c=red@0.3:s=300x300,format=rgba", "-frames:v", "1"], &image);

    let profile = d.path().join("profil");
    for t in formats::VIDEO_TARGETS {
        let p = convert_ok(&video, t, "ffmpeg", &out, &profile);
        if *t != "gif" {
            assert!(probe(&p).contains("Audio:"), "{t} sans audio");
        }
    }
    for t in ["mp3", "m4a", "wav"] {
        convert_ok(&video, t, "ffmpeg", &out, &profile);
    }
    for t in formats::AUDIO_TARGETS {
        if *t != "wav" {
            convert_ok(&audio, t, "ffmpeg", &out, &profile);
        }
    }
    for t in formats::IMAGE_TARGETS {
        if *t != "png" {
            convert_ok(&image, t, "ffmpeg", &out, &profile);
        }
    }
    // Le JPEG d'une image transparente doit être posé sur du blanc (pas du noir).
    let jpg = out.join("transparente.jpg");
    let ff = tools::ffmpeg().unwrap().path;
    let px = Command::new(ff)
        .args(["-loglevel", "error", "-i"])
        .arg(&jpg)
        .args(["-vf", "crop=1:1:150:150", "-f", "rawvideo", "-pix_fmt", "rgb24", "-"])
        .output()
        .unwrap()
        .stdout;
    assert!(px[1] > 150 && px[2] > 150, "fond non blanc : {px:?}");
    // Deuxième conversion identique : nouveau nom, pas d'écrasement.
    let again = convert_ok(&audio, "mp3", "ffmpeg", &out, &profile);
    assert!(again.file_name().unwrap().to_string_lossy().contains("(1)"));
}

#[test]
fn cancel_stops_ffmpeg() {
    if tools::ffmpeg().is_none() {
        return;
    }
    let d = tempfile::tempdir().unwrap();
    let long = d.path().join("long.mkv");
    ffmpeg_gen(&["-f", "lavfi", "-i", "testsrc=size=1280x720:rate=30", "-t", "60", "-c:v", "libx264", "-preset", "ultrafast"], &long);
    let cancel = Arc::new(Cancel::default());
    let c2 = cancel.clone();
    std::thread::spawn(move || {
        std::thread::sleep(std::time::Duration::from_millis(800));
        c2.cancel();
    });
    let t0 = std::time::Instant::now();
    let r = run_conversion(&req(&long, "webm", "ffmpeg", d.path()), d.path(), &cancel, &|_| {});
    assert!(matches!(r, Err(ConvError::Cancelled)));
    assert!(t0.elapsed().as_secs() < 10);
    let left: Vec<_> = std::fs::read_dir(d.path()).unwrap().flatten().map(|e| e.file_name()).collect();
    assert!(left.iter().all(|n| !n.to_string_lossy().starts_with(".arac-")), "{left:?}");
    assert!(!d.path().join("long.webm").exists());
}

#[test]
fn archive_conversions() {
    let Some(sz) = tools::sevenzip() else {
        eprintln!("7-Zip absent : test ignoré");
        return;
    };
    let d = tempfile::tempdir().unwrap();
    let folder = d.path().join("Mon dossier");
    std::fs::create_dir_all(folder.join("sous dossier")).unwrap();
    std::fs::write(folder.join("a.txt"), "bonjour é").unwrap();
    std::fs::write(folder.join(".cache"), "caché").unwrap();
    std::fs::write(folder.join("sous dossier/b.txt"), "b").unwrap();
    let out = d.path().join("out");
    let profile = d.path().join("p");
    // Dossier → chaque format d'archive, puis chaque archive → chaque format.
    let mut archives = Vec::new();
    for t in formats::ARCHIVE_TARGETS {
        archives.push(convert_ok(&folder, t, "7z", &out, &profile));
    }
    let out2 = d.path().join("out2");
    for a in &archives {
        for t in ["zip", "7z", "tar.gz"] {
            let p = convert_ok(a, t, "7z", &out2, &profile);
            // Contrôle du contenu : on ré-extrait et on cherche les fichiers.
            let x = tempfile::tempdir().unwrap();
            let mut c = Command::new(&sz.path);
            c.args(["x", "-y", "-bso0", "-bsp0"]).arg(format!("-o{}", x.path().display())).arg(&p);
            assert!(c.status().unwrap().success());
            let mut found = String::new();
            for e in walk(x.path()) {
                found.push_str(&e.to_string_lossy());
                found.push('\n');
            }
            if t == "tar.gz" {
                // tar.gz → contient un .tar qu'on ne re-déplie pas ici.
                assert!(found.contains(".tar"), "{found}");
            } else {
                assert!(found.contains("a.txt") && found.contains("b.txt") && found.contains(".cache"), "{}: {found}", p.display());
            }
        }
    }
    // Un simple fichier compressé.
    convert_ok(&folder.join("a.txt"), "zip", "7z", &out, &profile);
}

#[test]
fn encrypted_archive_reports_password() {
    let Some(sz) = tools::sevenzip() else { return };
    let d = tempfile::tempdir().unwrap();
    std::fs::write(d.path().join("secret.txt"), "x").unwrap();
    let arc = d.path().join("secret.7z");
    let ok = Command::new(&sz.path)
        .current_dir(d.path())
        .args(["a", "-bso0", "-psecret", "-mhe=on"])
        .arg(&arc)
        .arg("secret.txt")
        .status()
        .unwrap();
    assert!(ok.success());
    let r = run_conversion(&req(&arc, "zip", "7z", d.path()), d.path(), &Cancel::default(), &|_| {});
    assert!(matches!(r, Err(ConvError::Password)), "{:?}", r.err());
}

fn walk(p: &Path) -> Vec<PathBuf> {
    let mut v = Vec::new();
    for e in std::fs::read_dir(p).unwrap().flatten() {
        let path = e.path();
        v.push(path.clone());
        if path.is_dir() {
            v.extend(walk(&path));
        }
    }
    v
}

#[test]
fn document_conversions() {
    if tools::libreoffice().is_none() {
        eprintln!("LibreOffice absent : test ignoré");
        return;
    }
    let d = tempfile::tempdir().unwrap();
    let src = d.path().join("src");
    std::fs::create_dir_all(&src).unwrap();
    let out = d.path().join("out");
    let profile = d.path().join("profil LO");
    let txt = src.join("lettre.txt");
    std::fs::write(&txt, "Bonjour Noël, ça va ? Ğ ş ı İ\nDeuxième ligne").unwrap();
    let md = src.join("notes.md");
    std::fs::write(&md, "# Titre\n\nTexte **gras** et liste :\n\n- un\n- deux\n").unwrap();
    let csv = src.join("tableau.csv");
    std::fs::write(&csv, "nom,prix\nbéton,12.5\nbrique,3\n").unwrap();

    let docx = convert_ok(&txt, "docx", "libreoffice", &out, &profile);
    for t in ["pdf", "odt", "rtf", "html", "doc"] {
        convert_ok(&docx, t, "libreoffice", &out, &profile);
    }
    let back = convert_ok(&docx, "txt", "libreoffice", &out, &profile);
    let s = std::fs::read_to_string(back).unwrap();
    assert!(s.contains("Noël") && s.contains("Ğ ş ı İ"), "{s}");
    for t in ["pdf", "docx", "odt", "html"] {
        convert_ok(&md, t, "libreoffice", &out, &profile);
    }
    let xlsx = convert_ok(&csv, "xlsx", "libreoffice", &out, &profile);
    for t in ["ods", "pdf", "xls"] {
        convert_ok(&xlsx, t, "libreoffice", &out, &profile);
    }
    let csv2 = convert_ok(&xlsx, "csv", "libreoffice", &out, &profile);
    assert!(std::fs::read_to_string(csv2).unwrap().contains("béton"));
    // PDF → Word.
    let pdf = out.join("lettre.pdf");
    assert!(pdf.exists());
    convert_ok(&pdf, "docx", "libreoffice", &out, &profile);
    // Image → PDF (par Draw).
    if tools::ffmpeg().is_some() {
        let png = src.join("plan.png");
        ffmpeg_gen(&["-f", "lavfi", "-i", "testsrc=size=200x100", "-frames:v", "1"], &png);
        convert_ok(&png, "pdf", "libreoffice", &out, &profile);
    }
    // Présentation, si python-pptx est disponible pour en fabriquer une.
    let pptx = src.join("diapos.pptx");
    let made = Command::new("python3")
        .args([
            "-c",
            "import sys,pptx;p=pptx.Presentation();s=p.slides.add_slide(p.slide_layouts[0]);s.shapes.title.text='Bonjour';p.save(sys.argv[1])",
        ])
        .arg(&pptx)
        .status()
        .map(|s| s.success())
        .unwrap_or(false);
    if made {
        for t in ["pdf", "odp", "ppt"] {
            convert_ok(&pptx, t, "libreoffice", &out, &profile);
        }
    } else {
        eprintln!("python-pptx absent : présentations non testées");
    }
}
