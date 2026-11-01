<p align="center"><img src="src-tauri/icons/128x128.png" width="96" alt="Araç"></p>

<h1 align="center">Araç</h1>
<p align="center"><b>Convertisseur universel de fichiers</b> — Windows · Linux · Web<br>
Version 0.1 · GNU GPL v3 · <a href="LEGAL.md">Mentions légales (13 langues)</a></p>

Araç convertit vidéos, sons, images, documents et archives **sur votre appareil** : aucun fichier n'est envoyé sur Internet.

| | Application de bureau | Version web |
|---|---|---|
| Vidéo (MP4, WEBM, MKV, AVI, MOV, GIF…) | ✅ ffmpeg natif, gros fichiers | ✅ ffmpeg WebAssembly (≤ 1,5 Go) |
| Audio (MP3, WAV, OGG, FLAC, AAC, M4A, OPUS…) | ✅ | ✅ |
| Images (JPG, PNG, WEBP, GIF, BMP, TIFF, ICO, SVG → …) | ✅ | ✅ |
| Images → PDF | ✅ | ✅ |
| Documents (Word, Excel, PowerPoint, ODT, RTF, PDF, Markdown…) | ✅ avec LibreOffice | Markdown → HTML/TXT |
| Archives (ZIP, 7Z, TAR, TAR.GZ/XZ/BZ2, CBZ ; lecture RAR, ISO…) | ✅ 7-Zip | ZIP, TAR, TAR.GZ, CBZ |
| Compression d'un fichier ou d'un dossier | ✅ | ✅ (fichiers) |

Interface en **13 langues** : français, anglais, espagnol, portugais, italien, turc, azéri, ouzbek, kazakh, turkmène, kirghiz, tatar, ouïghour.
Thèmes **Turquoise** (par défaut), **Noir**, **Sombre**, **Clair**, et thèmes personnels (création, enregistrement, export/import).

## Installer

Les fichiers sont sur la page [Releases](https://github.com/davidharputoglu/arac/releases/latest).

### Windows (10 et 11, x64 ou ARM64)
`Arac_0.1_windows_x64-setup.exe` (ou `_arm64-setup.exe`). L'installateur demande :
1. la langue ;
2. le dossier d'installation ;
3. s'il faut aussi **convertir des documents** — si oui, il installe LibreOffice (inclus dans l'installateur, rien à télécharger).

### Linux (x86_64, ARM64, ARM 32 bits)
Le plus simple :
```bash
bash Arac_0.1_install.sh
```
Le script reconnaît la distribution et le processeur, puis propose :
- Debian, Ubuntu, Mint… → paquet **.deb** ou **AppImage** ;
- Fedora, openSUSE, RHEL… → paquet **.rpm** ou **AppImage** ;
- autres distributions → **AppImage**.

Il demande aussi la langue, le dossier de l'AppImage et s'il faut installer LibreOffice pour les documents.
Les fichiers `.deb`, `.rpm` et `.AppImage` peuvent aussi être installés directement.

### Version web, intégrée dans une page
1. Décompressez `Arac_0.1_web.zip` sur votre hébergement, par exemple dans `https://votre-site.fr/arac/`.
2. Collez dans votre page, à l'endroit voulu :
```html
<div id="arac"></div>
<script src="https://votre-site.fr/arac/embed.js" data-target="#arac" defer></script>
```
Options : `data-lang="fr"` (langue imposée), `data-theme="clair"`, `data-height="700"`.
La page peut aussi s'ouvrir seule (`https://votre-site.fr/arac/`). Tout se passe dans le navigateur du visiteur.

## Construire depuis le code source

Prérequis : [Node.js 20+](https://nodejs.org), [Rust](https://rustup.rs) et, sous Linux, les
[dépendances de Tauri](https://v2.tauri.app/start/prerequisites/).

```bash
npm install
npm run tauri dev        # application de bureau en développement (utilise ffmpeg/7-Zip/LibreOffice du système s'ils existent)
npm run dev              # interface dans le navigateur : http://localhost:1420
npm run build:web        # version web → dist-web/
```

Installateurs :
```powershell
# Windows (PowerShell)
powershell -ExecutionPolicy Bypass -File scripts\prepare-windows.ps1
npx tauri build --bundles nsis --config src-tauri/release-windows.json
```
```bash
# Linux
scripts/ci-build-linux.sh x86_64     # ou aarch64 / armhf → dossier out/
```
Sur GitHub, l'étiquette `v0.1` lance `.github/workflows/release.yml`, qui fabrique **tous** les fichiers
(Windows x64/ARM64, Linux x86_64/ARM64/armhf, web, script, code source) dans une publication en brouillon.

Tests :
```bash
cargo test --manifest-path src-tauri/Cargo.toml      # conversions réelles (ffmpeg, 7-Zip, LibreOffice)
npm run build:web && npm test                        # version web de bout en bout (Playwright)
node tests/run-desktop-tests.mjs                     # application de bureau réelle (tauri-driver, Linux)
```

La **version affichée** (« 0.1 ») est définie dans `src/version.ts` et `src-tauri/windows/hooks.nsh` ;
`package.json`, `Cargo.toml` et `tauri.conf.json` portent `0.1.0` (format imposé par ces outils).

## Organisation

| Dossier | Contenu |
|---|---|
| `src/` | Interface (React, TypeScript, Tailwind) |
| `src/formats/catalog.ts` | Quelles conversions sont proposées, et par quel moteur |
| `src/engines/` | Moteurs : bureau (appels Rust) et web (ffmpeg.wasm, canvas, pdf-lib, fflate, marked) |
| `src/i18n/locales/` | Les 13 langues (le français est la référence) |
| `src-tauri/src/` | Partie bureau (Rust) : ffmpeg, 7-Zip, LibreOffice, annulation, noms de fichiers |
| `src-tauri/windows/` | Installateur Windows : question LibreOffice, langues, page de licence |
| `scripts/` | Préparation des outils, script d'installation Linux, textes légaux générés |
| `tests/` | Tests de bout en bout (web et bureau) |

`LEGAL.md`, `THIRD-PARTY-NOTICES.md`, `scripts/install.sh` et la page de licence de l'installateur sont
**générés** à partir des traductions : `node --experimental-strip-types scripts/generate-legal.mts`.

## Licence

Araç est un logiciel libre sous **GNU GPL v3 ou ultérieure** ([LICENSE](LICENSE)).
Il est fourni sans aucune garantie : voir [LEGAL.md](LEGAL.md). Logiciels tiers : [THIRD-PARTY-NOTICES.md](THIRD-PARTY-NOTICES.md).

Créé par **David HARPUTOGLU**, aidé par IA — contact : kasparof57@gmail.com

---

### English summary

Araç is a free (GPL v3) file converter for Windows, Linux and the web: video, audio, images, documents and
archives, converted locally — nothing is uploaded. Download the installers from
[Releases](https://github.com/davidharputoglu/arac/releases/latest); on Linux run `bash Arac_0.1_install.sh`.
The interface is available in 13 languages. Created by David HARPUTOGLU, assisted by AI — kasparof57@gmail.com.
