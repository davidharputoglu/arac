// Génère, à partir des traductions de l'application (src/i18n/locales) :
//   - LEGAL.md                              mentions légales dans les 13 langues
//   - THIRD-PARTY-NOTICES.md                logiciels tiers et leurs licences
//   - src-tauri/windows/license-installer.txt  page de licence de l'installateur Windows
//   - scripts/install.sh                    script d'installation Linux (13 langues)
//
// Lancement :  node --experimental-strip-types scripts/generate-legal.mts

import { readFileSync, writeFileSync, chmodSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { INSTALLER } from './installer-strings.mts'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const CODES = ['fr', 'en', 'es', 'pt', 'it', 'tr', 'az', 'uz', 'kk', 'tk', 'ky', 'tt', 'ug'] as const
const NAMES: Record<string, string> = {
    fr: 'Français', en: 'English', es: 'Español', pt: 'Português', it: 'Italiano', tr: 'Türkçe', az: 'Azərbaycanca',
    uz: 'Oʻzbekcha', kk: 'Қазақша', tk: 'Türkmençe', ky: 'Кыргызча', tt: 'Татарча', ug: 'ئۇيغۇرچە',
}

type Msg = Record<string, string>
const L: Record<string, Msg> = {}
for (const c of CODES) L[c] = (await import(join(root, 'src/i18n/locales', `${c}.ts`))).default
const { THIRD_PARTY } = await import(join(root, 'src/legal/thirdParty.ts'))
const version = readFileSync(join(root, 'src/version.ts'), 'utf8').match(/APP_VERSION = '([^']+)'/)![1]
const license = readFileSync(join(root, 'LICENSE'), 'utf8')
const AUTHOR = 'David HARPUTOGLU'
const EMAIL = 'kasparof57@gmail.com'

// LEGAL.md -------------------------------------------------------------------
let md = `# Araç — ${L.fr.legal} / ${L.en.legal}\n\n`
md += `Araç ${version} — © 2026 ${AUTHOR} (${EMAIL}) — GNU GPL v3+\n\n`
md += CODES.map((c) => `[${NAMES[c]}](#${c})`).join(' · ') + '\n\n'
for (const c of CODES) {
    const m = L[c]
    const rtl = c === 'ug'
    md += `<a id="${c}"></a>\n\n## ${NAMES[c]} — ${m.legal}\n\n`
    if (rtl) md += '<div dir="rtl">\n\n'
    md += `*${m.madeBy.replace('{name}', AUTHOR)} — ${EMAIL}*\n\n`
    md += `### ${m.legalLicenseTitle}\n\n${m.legalLicenseText}\n\n${m.legalLicenseOfficial}\n\n`
    md += `### ${m.legalDisclaimerTitle}\n\n${m.legalDisclaimerText}\n\n**${m.legalBackup}**\n\n`
    md += `### ${m.legalUsageTitle}\n\n${m.legalUsageText}\n\n`
    md += `### ${m.legalPrivacyTitle}\n\n${m.legalPrivacyText}\n\n${m.legalPrivacyWeb}\n\n`
    md += `### ${m.legalThirdPartyTitle}\n\n${m.legalThirdPartyText} [THIRD-PARTY-NOTICES.md](THIRD-PARTY-NOTICES.md). ${m.legalUnrar}\n\n`
    md += `### ${m.legalTrademarksTitle}\n\n${m.legalTrademarksText}\n\n`
    if (rtl) md += '</div>\n\n'
}
writeFileSync(join(root, 'LEGAL.md'), md)

// THIRD-PARTY-NOTICES.md -------------------------------------------------------
let tp = `# Third-party software / Logiciels tiers\n\nAraç ${version} © 2026 ${AUTHOR} is distributed under the GNU GPL v3 or later (see LICENSE).\n`
tp += `It uses the following free software, which remains the property of its authors and is distributed under its own licence.\n\n`
tp += `| Software | Authors | Licence | Used in |\n|---|---|---|---|\n`
for (const p of THIRD_PARTY) tp += `| [${p.name}](${p.url}) | ${p.author} | ${p.license} | ${p.scope === 'both' ? 'desktop + web' : p.scope} |\n`
tp += `
## Binaries shipped with the desktop installers

- **FFmpeg** — static builds from [BtbN/FFmpeg-Builds](https://github.com/BtbN/FFmpeg-Builds) (Windows, Linux x86_64 and ARM64)
  and [John Van Sickle](https://johnvansickle.com/ffmpeg/) (Linux ARM 32-bit). These builds are licensed under the GNU GPL v3.
  Corresponding source code: <https://ffmpeg.org/download.html> and the build scripts of the projects above.
  The licence text is installed next to the program (\`licenses/\` folder).
- **7-Zip** — official builds by Igor Pavlov from <https://www.7-zip.org> (source code available on the same site).
  GNU LGPL 2.1 + BSD 3-clause licence for some parts + unRAR licence restriction:
  *the unRAR code may only be used to extract RAR archives; it must not be used to re-create the RAR compression algorithm.*
- **LibreOffice** (Windows, optional) — official installer from The Document Foundation, <https://www.libreoffice.org>,
  Mozilla Public License 2.0. Installed only if the user answers “Yes” to the question about documents.
  On Linux, LibreOffice comes from the distribution's own packages.

## Web version

- **ffmpeg.wasm** (\`@ffmpeg/core\`, GNU GPL v2+) is served with the web version; its source code is available at
  <https://github.com/ffmpegwasm/ffmpeg.wasm>.

## Trademarks

Windows, Word, Excel and PowerPoint are trademarks of Microsoft Corporation. Linux is a registered trademark of Linus Torvalds.
RAR is a trademark of Alexander Roshal. LibreOffice is a trademark of The Document Foundation. Araç is not affiliated with any of them.
`
writeFileSync(join(root, 'THIRD-PARTY-NOTICES.md'), tp)

// Page de licence de l'installateur Windows ------------------------
let txt = `Araç ${version} — © 2026 ${AUTHOR} — ${EMAIL}\r\n`
txt += `GNU General Public License v3.0 or later\r\n\r\n`
for (const c of CODES) {
    const m = L[c]
    txt += `==== ${NAMES[c]} ====\r\n\r\n${m.legalLicenseText}\r\n\r\n${m.legalLicenseOfficial}\r\n\r\n`
    txt += `${m.legalDisclaimerTitle.toUpperCase()}\r\n${m.legalDisclaimerText}\r\n${m.legalBackup}\r\n\r\n`
    txt += `${m.legalPrivacyTitle.toUpperCase()}\r\n${m.legalPrivacyText}\r\n\r\n`
}
txt += `==== GNU GENERAL PUBLIC LICENSE (official English text) ====\r\n\r\n${license.replace(/\r?\n/g, '\r\n')}`
// Tauri ajoute lui-même le marqueur UTF-8 (BOM) attendu par NSIS.
writeFileSync(join(root, 'src-tauri/windows/license-installer.txt'), txt)

// scripts/install.sh -----------------------------------------------------------------
const q = (s: string) => `'${s.replace(/'/g, `'\\''`)}'`
const LEGAL_KEYS = ['legalLicenseText', 'legalLicenseOfficial', 'legalDisclaimerText', 'legalBackup', 'legalUsageText']
let fn = 'load_strings() {\n    case "$1" in\n'
for (const c of CODES) {
    fn += `        ${c})\n`
    for (const [k, v] of Object.entries(INSTALLER[c])) fn += `            T_${k}=${q(v)}\n`
    for (const k of LEGAL_KEYS) fn += `            T_${k}=${q(L[c][k])}\n`
    fn += '            ;;\n'
}
fn += '        *) return 1 ;;\n    esac\n}\n'
const icon = readFileSync(join(root, 'src-tauri/icons/128x128.png')).toString('base64')
fn += `ICON_PNG_BASE64=${q(icon)}`
const template = readFileSync(join(root, 'scripts/install.template.sh'), 'utf8')
const sh = template.replaceAll('@VERSION@', version).replace('@STRINGS@', fn)
writeFileSync(join(root, 'scripts/install.sh'), sh)
chmodSync(join(root, 'scripts/install.sh'), 0o755)

// Raccourci des menus Linux (.deb, .rpm, AppImage) : nom « Araç » et description traduite.
let desktop = '[Desktop Entry]\nType=Application\nName=Araç\n'
desktop += `Comment=${L.en.appSubtitle}\n` + CODES.map((c) => `Comment[${c}]=${L[c].appSubtitle}`).join('\n') + '\n'
desktop += 'Exec={{exec}}\nStartupWMClass={{exec}}\nIcon={{icon}}\nTerminal=false\nCategories={{categories}}\n'
desktop += 'Keywords=convert;converter;video;audio;image;pdf;document;archive;zip;\n'
desktop += '{{#if mime_type}}\nMimeType={{mime_type}}\n{{/if}}\n'
writeFileSync(join(root, 'src-tauri/linux/arac.desktop'), desktop)

console.log('LEGAL.md, THIRD-PARTY-NOTICES.md, license-installer.txt, install.sh, arac.desktop : OK')
