// Appels vers la partie Rust de l'application de bureau (Tauri).

import { Channel, invoke } from '@tauri-apps/api/core'
import { ConversionError, type ErrorCode, type ProgressInfo, type Stage } from './types'

export const isDesktop = typeof window !== 'undefined' && '__TAURI_INTERNALS__' in window

export interface ToolInfo { path: string; bundled: boolean }
export interface EnginesStatus { ffmpeg: ToolInfo | null; sevenzip: ToolInfo | null; libreoffice: ToolInfo | null }
export interface PathInfo { path: string; name: string; size: number; isDir: boolean }
export interface SavedFile { output: string; size: number }

export const enginesStatus = () => invoke<EnginesStatus>('engines_status')
export const inspectPaths = (paths: string[]) => invoke<PathInfo[]>('inspect_paths', { paths })
export const defaultOutputDir = () => invoke<string | null>('default_output_dir')
export const reveal = (path: string) => invoke<void>('reveal', { path })
export const initialLanguage = () => invoke<string | null>('initial_language')
export const openUrl = (url: string) => invoke<void>('open_url', { url }).catch(() => {})

function toError(e: unknown): ConversionError {
    if (e instanceof ConversionError) return e
    if (e && typeof e === 'object' && 'code' in e) {
        const o = e as { code: string; detail?: string }
        return new ConversionError(o.code as ErrorCode, o.detail ?? '')
    }
    return new ConversionError('tool', String(e))
}

/** Conversion par un outil natif (ffmpeg, 7-Zip, LibreOffice). */
export async function nativeConvert(
    jobId: string,
    input: string,
    target: string,
    engine: 'ffmpeg' | '7z' | 'libreoffice',
    outputDir: string | null,
    progress: (p: ProgressInfo) => void,
): Promise<SavedFile> {
    const channel = new Channel<{ stage: Stage; percent: number | null }>()
    channel.onmessage = (m) => progress({ stage: m.stage, percent: m.percent ?? null })
    try {
        return await invoke<SavedFile>('convert', {
            request: { jobId, input, target, engine, outputDir },
            onProgress: channel,
        })
    } catch (e) {
        throw toError(e)
    }
}

export const cancelNative = (jobId: string) => invoke<void>('cancel', { jobId }).catch(() => {})

/** Contenu d'un fichier du disque (conversions faites dans l'interface). */
export async function readFile(path: string): Promise<Uint8Array> {
    try {
        const buf = await invoke<ArrayBuffer>('read_file', { path })
        return new Uint8Array(buf)
    } catch (e) {
        throw new ConversionError('notFound', String(e))
    }
}

/** Enregistre un résultat à côté de l'original ou dans le dossier choisi. */
export async function saveOutput(input: string, target: string, outputDir: string | null, data: Uint8Array): Promise<SavedFile> {
    try {
        return await invoke<SavedFile>('save_output', data, {
            headers: {
                'x-input': encodeURIComponent(input),
                'x-target': target,
                'x-outdir': encodeURIComponent(outputDir ?? ''),
            },
        })
    } catch (e) {
        throw new ConversionError('tool', String(e))
    }
}

/** Sélecteurs de fichiers et de dossier natifs. */
export async function pickFiles(): Promise<string[]> {
    const { open } = await import('@tauri-apps/plugin-dialog')
    const r = await open({ multiple: true, directory: false })
    return Array.isArray(r) ? r : r ? [r] : []
}

export async function pickFolder(): Promise<string | null> {
    const { open } = await import('@tauri-apps/plugin-dialog')
    const r = await open({ multiple: false, directory: true })
    return typeof r === 'string' ? r : null
}
