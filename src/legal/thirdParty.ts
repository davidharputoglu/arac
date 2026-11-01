// Logiciels tiers utilisés par Araç (noms et licences : non traduits).
export interface ThirdParty {
    name: string
    author: string
    license: string
    url: string
    /** Où le logiciel est utilisé. */
    scope: 'desktop' | 'web' | 'both'
}

export const THIRD_PARTY: ThirdParty[] = [
    { name: 'FFmpeg', author: 'FFmpeg developers', license: 'GNU GPL v3 (builds incluant x264, x265…) / LGPL 2.1+', url: 'https://ffmpeg.org', scope: 'desktop' },
    { name: '7-Zip', author: 'Igor Pavlov', license: 'GNU LGPL 2.1 + BSD 3-clause + unRAR restriction', url: 'https://www.7-zip.org', scope: 'desktop' },
    { name: 'LibreOffice', author: 'The Document Foundation', license: 'MPL 2.0', url: 'https://www.libreoffice.org', scope: 'desktop' },
    { name: 'ffmpeg.wasm (@ffmpeg/ffmpeg, @ffmpeg/core)', author: 'Jerome Wu & contributors', license: 'MIT / GNU GPL v2+', url: 'https://github.com/ffmpegwasm/ffmpeg.wasm', scope: 'web' },
    { name: 'Tauri', author: 'Tauri Programme within The Commons Conservancy', license: 'MIT / Apache 2.0', url: 'https://tauri.app', scope: 'desktop' },
    { name: 'WebView2 (Windows) / WebKitGTK (Linux)', author: 'Microsoft / WebKitGTK team', license: 'Microsoft Software License / GNU LGPL 2.1', url: 'https://webkitgtk.org', scope: 'desktop' },
    { name: 'React', author: 'Meta Platforms, Inc. and affiliates', license: 'MIT', url: 'https://react.dev', scope: 'both' },
    { name: 'Lucide', author: 'Lucide contributors', license: 'ISC', url: 'https://lucide.dev', scope: 'both' },
    { name: 'Tailwind CSS', author: 'Tailwind Labs, Inc.', license: 'MIT', url: 'https://tailwindcss.com', scope: 'both' },
    { name: 'fflate', author: 'Arjun Barrett', license: 'MIT', url: 'https://github.com/101arrowz/fflate', scope: 'both' },
    { name: 'pdf-lib', author: 'Andrew Dillon', license: 'MIT', url: 'https://pdf-lib.js.org', scope: 'both' },
    { name: 'marked', author: 'Christopher Jeffrey & MarkedJS', license: 'MIT', url: 'https://marked.js.org', scope: 'both' },
    { name: 'pulldown-cmark', author: 'Raph Levien & contributors', license: 'MIT', url: 'https://github.com/pulldown-cmark/pulldown-cmark', scope: 'desktop' },
]
