# Third-party software / Logiciels tiers

Araç 0.1 © 2026 David HARPUTOGLU is distributed under the GNU GPL v3 or later (see LICENSE).
It uses the following free software, which remains the property of its authors and is distributed under its own licence.

| Software | Authors | Licence | Used in |
|---|---|---|---|
| [FFmpeg](https://ffmpeg.org) | FFmpeg developers | GNU GPL v3 (builds incluant x264, x265…) / LGPL 2.1+ | desktop |
| [7-Zip](https://www.7-zip.org) | Igor Pavlov | GNU LGPL 2.1 + BSD 3-clause + unRAR restriction | desktop |
| [LibreOffice](https://www.libreoffice.org) | The Document Foundation | MPL 2.0 | desktop |
| [ffmpeg.wasm (@ffmpeg/ffmpeg, @ffmpeg/core)](https://github.com/ffmpegwasm/ffmpeg.wasm) | Jerome Wu & contributors | MIT / GNU GPL v2+ | web |
| [Tauri](https://tauri.app) | Tauri Programme within The Commons Conservancy | MIT / Apache 2.0 | desktop |
| [WebView2 (Windows) / WebKitGTK (Linux)](https://webkitgtk.org) | Microsoft / WebKitGTK team | Microsoft Software License / GNU LGPL 2.1 | desktop |
| [React](https://react.dev) | Meta Platforms, Inc. and affiliates | MIT | desktop + web |
| [Lucide](https://lucide.dev) | Lucide contributors | ISC | desktop + web |
| [Tailwind CSS](https://tailwindcss.com) | Tailwind Labs, Inc. | MIT | desktop + web |
| [fflate](https://github.com/101arrowz/fflate) | Arjun Barrett | MIT | desktop + web |
| [pdf-lib](https://pdf-lib.js.org) | Andrew Dillon | MIT | desktop + web |
| [marked](https://marked.js.org) | Christopher Jeffrey & MarkedJS | MIT | desktop + web |
| [pulldown-cmark](https://github.com/pulldown-cmark/pulldown-cmark) | Raph Levien & contributors | MIT | desktop |

## Binaries shipped with the desktop installers

- **FFmpeg** — static builds from [BtbN/FFmpeg-Builds](https://github.com/BtbN/FFmpeg-Builds) (Windows, Linux x86_64 and ARM64)
  and [John Van Sickle](https://johnvansickle.com/ffmpeg/) (Linux ARM 32-bit). These builds are licensed under the GNU GPL v3.
  Corresponding source code: <https://ffmpeg.org/download.html> and the build scripts of the projects above.
  The licence text is installed next to the program (`licenses/` folder).
- **7-Zip** — official builds by Igor Pavlov from <https://www.7-zip.org> (source code available on the same site).
  GNU LGPL 2.1 + BSD 3-clause licence for some parts + unRAR licence restriction:
  *the unRAR code may only be used to extract RAR archives; it must not be used to re-create the RAR compression algorithm.*
- **LibreOffice** (Windows, optional) — official installer from The Document Foundation, <https://www.libreoffice.org>,
  Mozilla Public License 2.0. Installed only if the user answers “Yes” to the question about documents.
  On Linux, LibreOffice comes from the distribution's own packages.

## Web version

- **ffmpeg.wasm** (`@ffmpeg/core`, GNU GPL v2+) is served with the web version; its source code is available at
  <https://github.com/ffmpegwasm/ffmpeg.wasm>.

## Trademarks

Windows, Word, Excel and PowerPoint are trademarks of Microsoft Corporation. Linux is a registered trademark of Linus Torvalds.
RAR is a trademark of Alexander Roshal. LibreOffice is a trademark of The Document Foundation. Araç is not affiliated with any of them.
