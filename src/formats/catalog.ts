// Catalogue des conversions : pour chaque fichier, quels formats proposer et
// quel moteur s'en charge, selon qu'on est dans l'application de bureau ou
// dans un navigateur. C'est la seule source de vérité de l'interface.

export type Family =
    | 'video' | 'audio' | 'image' | 'svg'
    | 'text' | 'spreadsheet' | 'presentation' | 'pdf' | 'markdown'
    | 'archive' | 'folder' | 'other'

export type Group = 'video' | 'audio' | 'image' | 'document' | 'archive'

/** Moteurs natifs (bureau) et moteurs qui tournent dans l'interface. */
export type Engine = 'ffmpeg' | '7z' | 'libreoffice' | 'wasm-ffmpeg' | 'canvas' | 'pdf-lib' | 'markdown' | 'js-archive'

export type Unavailable = 'desktopOnly' | 'needsLibreOffice' | 'missingTool' | 'tooBig'

export interface TargetOption {
    target: string
    group: Group
    engine: Engine | null
    reason?: Unavailable
}

export type Platform =
    | { kind: 'web' }
    | { kind: 'desktop'; tools: { ffmpeg: boolean; sevenzip: boolean; libreoffice: boolean } }

const VIDEO = ['mp4', 'm4v', 'webm', 'mkv', 'avi', 'mov', 'flv', 'wmv', 'mpeg', 'mpg', '3gp', 'ogv', 'ts', 'mts', 'm2ts', 'vob']
const AUDIO = ['mp3', 'wav', 'ogg', 'oga', 'flac', 'aac', 'm4a', 'wma', 'opus', 'aiff', 'aif', 'amr', 'ac3']
const IMAGE = ['jpg', 'jpeg', 'png', 'gif', 'webp', 'bmp', 'tiff', 'tif', 'ico']
const TEXT = ['doc', 'docx', 'odt', 'rtf', 'txt', 'html', 'htm']
const SPREADSHEET = ['xls', 'xlsx', 'ods', 'csv']
const PRESENTATION = ['ppt', 'pptx', 'odp']
const ARCHIVE = ['zip', '7z', 'rar', 'tar', 'gz', 'tgz', 'tar.gz', 'bz2', 'tbz2', 'tar.bz2', 'xz', 'txz', 'tar.xz', 'zst', 'tar.zst', 'cbz', 'cbr', 'cb7', 'iso']

export const VIDEO_TARGETS = ['mp4', 'webm', 'mkv', 'avi', 'mov', 'gif']
export const AUDIO_TARGETS = ['mp3', 'wav', 'ogg', 'flac', 'aac', 'm4a', 'opus']
export const IMAGE_TARGETS = ['jpg', 'png', 'webp', 'gif', 'bmp', 'tiff', 'ico']
export const ARCHIVE_TARGETS = ['zip', '7z', 'tar', 'tar.gz', 'tar.xz', 'tar.bz2', 'cbz']
const WRITER_TARGETS = ['pdf', 'docx', 'doc', 'odt', 'rtf', 'txt', 'html']
const CALC_TARGETS = ['xlsx', 'xls', 'ods', 'csv', 'pdf', 'html']
const IMPRESS_TARGETS = ['pptx', 'ppt', 'odp', 'pdf']

/** Formats que le navigateur sait décoder seul (voie rapide par <canvas>). */
const BROWSER_IMAGES = ['jpg', 'jpeg', 'png', 'webp', 'gif', 'bmp']
/** Archives que la version web sait ouvrir et produire. */
const WEB_ARCHIVE_IN = ['zip', 'cbz', 'tar', 'tar.gz', 'tgz']
const WEB_ARCHIVE_OUT = ['zip', 'cbz', 'tar', 'tar.gz']

/** Au-delà, le navigateur risque de manquer de mémoire. */
export const WEB_MAX_MEDIA = 1.5 * 1024 ** 3
export const WEB_MAX_ARCHIVE = 1024 ** 3

const ALIASES: Record<string, string> = { jpeg: 'jpg', tif: 'tiff', htm: 'html', tgz: 'tar.gz', txz: 'tar.xz', tbz2: 'tar.bz2', oga: 'ogg', aif: 'aiff' }
const canonical = (ext: string) => ALIASES[ext] ?? ext

const COMPOUND = ['tar.gz', 'tar.xz', 'tar.bz2', 'tar.zst', 'tar.lz']

/** Extension en minuscules, en reconnaissant .tar.gz et consorts. */
export function extOf(name: string): string {
    const lower = name.toLowerCase()
    for (const c of COMPOUND) if (lower.endsWith('.' + c) && lower.length > c.length + 1) return c
    const i = lower.lastIndexOf('.')
    return i > 0 ? lower.slice(i + 1) : ''
}

/** Nom sans extension (même règle que extOf). */
export function stemOf(name: string): string {
    const ext = extOf(name)
    return ext ? name.slice(0, name.length - ext.length - 1) : name
}

export function familyOf(name: string, isDir = false): Family {
    if (isDir) return 'folder'
    const e = extOf(name)
    if (VIDEO.includes(e)) return 'video'
    if (AUDIO.includes(e)) return 'audio'
    if (IMAGE.includes(e)) return 'image'
    if (e === 'svg') return 'svg'
    if (TEXT.includes(e)) return 'text'
    if (SPREADSHEET.includes(e)) return 'spreadsheet'
    if (PRESENTATION.includes(e)) return 'presentation'
    if (e === 'pdf') return 'pdf'
    if (e === 'md' || e === 'markdown') return 'markdown'
    if (ARCHIVE.includes(e)) return 'archive'
    return 'other'
}

/** Groupe affiché dans la liste des formats. */
export function groupOf(target: string): Group {
    if (VIDEO_TARGETS.includes(target)) return target === 'gif' ? 'image' : 'video'
    if (AUDIO_TARGETS.includes(target)) return 'audio'
    if (IMAGE_TARGETS.includes(target)) return 'image'
    if (ARCHIVE_TARGETS.includes(target)) return 'archive'
    return 'document'
}

type Rule = { targets: string[]; desktop: Engine | null; web: Engine | null; webIf?: (src: string, target: string) => boolean }

/** Tout fichier peut aussi être compressé dans une archive. */
const COMPRESS: Rule = { targets: ['zip', '7z', 'tar.gz'], desktop: '7z', web: 'js-archive', webIf: (_s, t) => t !== '7z' }

function rulesFor(family: Family, src: string): Rule[] {
    if (family !== 'archive' && family !== 'folder' && family !== 'other') return [...baseRules(family, src), COMPRESS]
    return baseRules(family, src)
}

function baseRules(family: Family, src: string): Rule[] {
    switch (family) {
        case 'video':
            return [
                { targets: VIDEO_TARGETS, desktop: 'ffmpeg', web: 'wasm-ffmpeg' },
                { targets: ['mp3', 'm4a', 'wav', 'ogg', 'flac'], desktop: 'ffmpeg', web: 'wasm-ffmpeg' },
            ]
        case 'audio':
            return [{ targets: AUDIO_TARGETS, desktop: 'ffmpeg', web: 'wasm-ffmpeg' }]
        case 'image': {
            const fastPath = BROWSER_IMAGES.includes(src)
            return [
                // Voie rapide du navigateur quand c'est possible, sinon ffmpeg.
                { targets: ['jpg', 'png', 'webp'], desktop: 'ffmpeg', web: fastPath ? 'canvas' : 'wasm-ffmpeg' },
                { targets: ['gif', 'bmp', 'tiff', 'ico'], desktop: 'ffmpeg', web: 'wasm-ffmpeg' },
                { targets: ['pdf'], desktop: fastPath ? 'pdf-lib' : 'libreoffice', web: fastPath ? 'pdf-lib' : null },
            ]
        }
        case 'svg':
            return [
                { targets: ['png', 'jpg', 'webp'], desktop: 'canvas', web: 'canvas' },
                { targets: ['pdf'], desktop: 'pdf-lib', web: 'pdf-lib' },
            ]
        case 'markdown':
            return [
                { targets: ['html', 'txt'], desktop: 'markdown', web: 'markdown' },
                { targets: ['pdf', 'docx', 'odt'], desktop: 'libreoffice', web: null },
            ]
        case 'text':
            return [{ targets: WRITER_TARGETS, desktop: 'libreoffice', web: null }]
        case 'spreadsheet':
            return [{ targets: CALC_TARGETS, desktop: 'libreoffice', web: null }]
        case 'presentation':
            return [{ targets: IMPRESS_TARGETS, desktop: 'libreoffice', web: null }]
        case 'pdf':
            return [{ targets: ['docx', 'odt', 'txt'], desktop: 'libreoffice', web: null }]
        case 'archive':
            return [{
                targets: ARCHIVE_TARGETS, desktop: '7z', web: 'js-archive',
                webIf: (s, t) => WEB_ARCHIVE_IN.includes(s) && WEB_ARCHIVE_OUT.includes(t),
            }]
        case 'folder':
            return [{ targets: ['zip', '7z', 'tar.gz', 'tar.xz', 'tar'], desktop: '7z', web: null }]
        case 'other':
            return [COMPRESS]
    }
}

const NATIVE_TOOL: Partial<Record<Engine, 'ffmpeg' | 'sevenzip' | 'libreoffice'>> = {
    ffmpeg: 'ffmpeg', '7z': 'sevenzip', libreoffice: 'libreoffice',
}

/** Formats proposés pour un fichier, avec la raison quand c'est impossible ici. */
export function targetsFor(name: string, isDir: boolean, size: number, platform: Platform): TargetOption[] {
    const family = familyOf(name, isDir)
    const src = canonical(extOf(name))
    const seen = new Set<string>()
    const out: TargetOption[] = []
    for (const rule of rulesFor(family, src)) {
        for (const target of rule.targets) {
            if (target === src || seen.has(target)) continue
            // Un ZIP renommé en CBZ (ou l'inverse) reste utile ; le reste non.
            seen.add(target)
            const group = groupOf(target)
            if (platform.kind === 'desktop') {
                const engine = rule.desktop
                const tool = engine ? NATIVE_TOOL[engine] : undefined
                if (!engine) out.push({ target, group, engine: null, reason: 'missingTool' })
                else if (tool && !platform.tools[tool]) {
                    out.push({ target, group, engine: null, reason: tool === 'libreoffice' ? 'needsLibreOffice' : 'missingTool' })
                } else out.push({ target, group, engine })
            } else {
                let engine = rule.web
                if (engine && rule.webIf && !rule.webIf(src, target)) engine = null
                if (!engine) out.push({ target, group, engine: null, reason: 'desktopOnly' })
                else if (engine === 'wasm-ffmpeg' && size > WEB_MAX_MEDIA) out.push({ target, group, engine: null, reason: 'tooBig' })
                else if (engine === 'js-archive' && size > WEB_MAX_ARCHIVE) out.push({ target, group, engine: null, reason: 'tooBig' })
                else out.push({ target, group, engine })
            }
        }
    }
    return out
}

/** Premier format utilisable (ou null s'il n'y en a aucun). */
export function defaultTarget(options: TargetOption[]): string | null {
    return options.find((o) => o.engine)?.target ?? null
}

/** Libellé affiché : « TAR.GZ », « JPG »… */
export const label = (target: string) => target.toUpperCase()

/** Résumé des formats pour l'aide. */
export const SUMMARY = {
    video: VIDEO, audio: AUDIO, image: [...IMAGE, 'svg'],
    document: [...TEXT, 'md', ...SPREADSHEET, ...PRESENTATION, 'pdf'],
    archive: ARCHIVE,
}
