export type Source = { kind: 'file'; file: File } | { kind: 'path'; path: string }

export type Stage =
    | 'loadingEngine' | 'media' | 'extract' | 'compress'
    | 'office' | 'officeFirstRun' | 'reading' | 'saving' | 'working' | 'done'

export interface ProgressInfo {
    stage: Stage
    /** De 0 à 1, ou null si l'avancement est inconnu. */
    percent: number | null
}

export type Output =
    | { kind: 'blob'; blob: Blob; name: string }
    | { kind: 'path'; path: string; name: string; size: number }

/** Codes d'erreur traduits par l'interface (errors.*). */
export type ErrorCode =
    | 'cancelled' | 'timeout' | 'unsupported' | 'missingTool' | 'notFound'
    | 'password' | 'empty' | 'tool' | 'engineLoad' | 'decode' | 'tooBig'

export class ConversionError extends Error {
    constructor(public code: ErrorCode, public detail = '') {
        super(detail || code)
    }
}

/** Annulation coopérative entre l'interface et les moteurs. */
export class CancelSignal {
    cancelled = false
    private handlers: (() => void)[] = []
    onCancel(fn: () => void) {
        if (this.cancelled) fn()
        else this.handlers.push(fn)
    }
    cancel() {
        if (this.cancelled) return
        this.cancelled = true
        for (const h of this.handlers.splice(0)) {
            try { h() } catch { /* rien */ }
        }
    }
    throwIfCancelled() {
        if (this.cancelled) throw new ConversionError('cancelled')
    }
}

export const MIME: Record<string, string> = {
    mp4: 'video/mp4', webm: 'video/webm', mkv: 'video/x-matroska', avi: 'video/x-msvideo', mov: 'video/quicktime',
    gif: 'image/gif', mp3: 'audio/mpeg', wav: 'audio/wav', ogg: 'audio/ogg', flac: 'audio/flac', aac: 'audio/aac',
    m4a: 'audio/mp4', opus: 'audio/ogg', jpg: 'image/jpeg', png: 'image/png', webp: 'image/webp', bmp: 'image/bmp',
    tiff: 'image/tiff', ico: 'image/x-icon', pdf: 'application/pdf', html: 'text/html', txt: 'text/plain',
    zip: 'application/zip', cbz: 'application/vnd.comicbook+zip', tar: 'application/x-tar', 'tar.gz': 'application/gzip',
}
