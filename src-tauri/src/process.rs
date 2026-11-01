//! Lancement des outils externes (ffmpeg, 7-Zip, LibreOffice) avec lecture
//! des sorties ligne par ligne, annulation et arrêt de toute l'arborescence
//! de processus.

use std::io::Read;
use std::process::{Child, Command, Stdio};
use std::sync::atomic::{AtomicBool, Ordering};
use std::sync::mpsc;
use std::thread;
use std::time::{Duration, Instant};

/// Jeton d'annulation partagé entre la commande `cancel` et la conversion.
#[derive(Default)]
pub struct Cancel {
    flag: AtomicBool,
}

impl Cancel {
    pub fn cancel(&self) {
        self.flag.store(true, Ordering::SeqCst);
    }
    pub fn is_cancelled(&self) -> bool {
        self.flag.load(Ordering::SeqCst)
    }
}

#[derive(Clone, Copy, Debug, PartialEq, Eq)]
pub enum Stream {
    Stdout,
    Stderr,
}

#[derive(Debug)]
pub enum RunError {
    Cancelled,
    Spawn(String),
    Timeout,
    Failed { code: Option<i32>, tail: String },
}

/// Les dernières lignes de stderr, utiles pour expliquer un échec.
pub struct RunOutput {
    pub tail: String,
}

/// Prépare une commande : pas de console sous Windows, groupe de processus
/// séparé sous Linux (pour pouvoir tout arrêter d'un coup).
pub fn command(program: &std::path::Path) -> Command {
    let mut cmd = Command::new(program);
    #[cfg(windows)]
    {
        use std::os::windows::process::CommandExt;
        const CREATE_NO_WINDOW: u32 = 0x0800_0000;
        cmd.creation_flags(CREATE_NO_WINDOW);
    }
    #[cfg(unix)]
    {
        use std::os::unix::process::CommandExt;
        cmd.process_group(0);
    }
    cmd
}

fn kill_tree(child: &mut Child) {
    let pid = child.id();
    #[cfg(unix)]
    unsafe {
        libc::kill(-(pid as i32), libc::SIGKILL);
    }
    #[cfg(windows)]
    {
        let _ = command(std::path::Path::new("taskkill"))
            .args(["/PID", &pid.to_string(), "/T", "/F"])
            .stdout(Stdio::null())
            .stderr(Stdio::null())
            .status();
    }
    let _ = child.kill();
    let _ = child.wait();
}

/// Découpe un flux en lignes sur \n, \r et retour arrière (7-Zip et ffmpeg
/// réécrivent leurs lignes de progression avec ces caractères).
fn pump<R: Read + Send + 'static>(mut reader: R, which: Stream, tx: mpsc::Sender<(Stream, String)>) {
    thread::spawn(move || {
        let mut buf = [0u8; 8192];
        let mut line: Vec<u8> = Vec::new();
        loop {
            match reader.read(&mut buf) {
                Ok(0) | Err(_) => break,
                Ok(n) => {
                    for &b in &buf[..n] {
                        if b == b'\n' || b == b'\r' || b == 0x08 {
                            if !line.is_empty() {
                                let s = String::from_utf8_lossy(&line).trim().to_string();
                                if !s.is_empty() && tx.send((which, s)).is_err() {
                                    return;
                                }
                                line.clear();
                            }
                        } else {
                            line.push(b);
                        }
                    }
                }
            }
        }
        if !line.is_empty() {
            let s = String::from_utf8_lossy(&line).trim().to_string();
            if !s.is_empty() {
                let _ = tx.send((which, s));
            }
        }
    });
}

/// Lance la commande et appelle `on_line` pour chaque ligne lue.
/// Retourne une erreur si le code de sortie n'est pas 0, en cas d'annulation
/// ou si `timeout` est dépassé.
pub fn run(
    mut cmd: Command,
    cancel: &Cancel,
    timeout: Option<Duration>,
    mut on_line: impl FnMut(Stream, &str),
) -> Result<RunOutput, RunError> {
    cmd.stdin(Stdio::null()).stdout(Stdio::piped()).stderr(Stdio::piped());
    let mut child = cmd.spawn().map_err(|e| RunError::Spawn(e.to_string()))?;
    let (tx, rx) = mpsc::channel();
    pump(child.stdout.take().expect("stdout"), Stream::Stdout, tx.clone());
    pump(child.stderr.take().expect("stderr"), Stream::Stderr, tx);

    let started = Instant::now();
    let mut tail: Vec<String> = Vec::new();
    let mut exit = None;
    loop {
        match rx.recv_timeout(Duration::from_millis(100)) {
            Ok((which, l)) => {
                if which == Stream::Stderr {
                    tail.push(l.clone());
                    if tail.len() > 40 {
                        tail.remove(0);
                    }
                }
                on_line(which, &l);
            }
            Err(mpsc::RecvTimeoutError::Timeout) => {}
            // Les deux flux sont fermés : le processus a terminé.
            Err(mpsc::RecvTimeoutError::Disconnected) => {
                if exit.is_none() {
                    exit = Some(child.wait().map_err(|e| RunError::Spawn(e.to_string()))?);
                }
                break;
            }
        }
        if cancel.is_cancelled() {
            kill_tree(&mut child);
            return Err(RunError::Cancelled);
        }
        if let Some(t) = timeout {
            if started.elapsed() > t {
                kill_tree(&mut child);
                return Err(RunError::Timeout);
            }
        }
        if exit.is_none() {
            if let Ok(Some(status)) = child.try_wait() {
                exit = Some(status);
            }
        }
    }
    let status = exit.expect("statut de sortie");
    let tail = tail.join("\n");
    if status.success() {
        Ok(RunOutput { tail })
    } else {
        Err(RunError::Failed { code: status.code(), tail })
    }
}
