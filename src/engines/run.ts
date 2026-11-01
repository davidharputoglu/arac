// Aiguillage d'une conversion vers le bon moteur.

import { extOf, stemOf, type Engine } from '../formats/catalog'
import * as desktop from './desktop'
import { CancelSignal, ConversionError, MIME, type Output, type ProgressInfo, type Source } from './types'

export interface ConvertTask {
    id: string
    name: string
    source: Source
    target: string
    engine: Engine
    /** Bureau : dossier de sortie, null = à côté du fichier d'origine. */
    outputDir: string | null
}

async function sourceBytes(source: Source): Promise<Uint8Array> {
    if (source.kind === 'file') return new Uint8Array(await source.file.arrayBuffer())
    return desktop.readFile(source.path)
}

/** Contenu avec le bon type MIME (le décodage d'image en a besoin). */
async function sourceBlob(task: ConvertTask, ext: string): Promise<Blob> {
    if (task.source.kind === 'file') return task.source.file
    const type = ext === 'svg' ? 'image/svg+xml' : ext === 'jpeg' ? 'image/jpeg' : MIME[ext] ?? ''
    return new Blob([(await desktop.readFile(task.source.path)) as BlobPart], { type })
}

async function sourceFile(task: ConvertTask): Promise<File> {
    if (task.source.kind === 'file') return task.source.file
    return new File([(await desktop.readFile(task.source.path)) as BlobPart], task.name)
}

/** Conversions faites dans l'interface (navigateur ou fenêtre du bureau). */
async function runInterface(task: ConvertTask, signal: CancelSignal, progress: (p: ProgressInfo) => void): Promise<Blob> {
    const ext = extOf(task.name)
    const t = task.target
    switch (task.engine) {
        case 'wasm-ffmpeg': {
            const { convertMedia } = await import('./web/ffmpeg')
            return convertMedia(await sourceFile(task), t, signal, progress)
        }
        case 'canvas': {
            progress({ stage: 'working', percent: null })
            const { rasterize } = await import('./web/image')
            return rasterize(await sourceBlob(task, ext), ext === 'svg', t as 'png' | 'jpg' | 'webp')
        }
        case 'pdf-lib': {
            progress({ stage: 'working', percent: null })
            const { imageToPdf } = await import('./web/image')
            return imageToPdf(await sourceBlob(task, ext), ext, stemOf(task.name))
        }
        case 'markdown': {
            progress({ stage: 'working', percent: null })
            const m = await import('./web/markdown')
            const text = new TextDecoder().decode(await sourceBytes(task.source))
            const out = t === 'html' ? await m.markdownToHtml(text, stemOf(task.name)) : await m.markdownToText(text)
            return new Blob([out], { type: `${MIME[t]};charset=utf-8` })
        }
        case 'js-archive': {
            const { convertArchive } = await import('./web/archive')
            progress({ stage: 'reading', percent: null })
            return convertArchive(task.name, await sourceBytes(task.source), t, signal, progress)
        }
        default:
            throw new ConversionError('unsupported')
    }
}

export async function runConversion(task: ConvertTask, signal: CancelSignal, progress: (p: ProgressInfo) => void): Promise<Output> {
    signal.throwIfCancelled()
    const outName = `${stemOf(task.name)}.${task.target}`
    if (task.engine === 'ffmpeg' || task.engine === '7z' || task.engine === 'libreoffice') {
        if (task.source.kind !== 'path') throw new ConversionError('unsupported')
        signal.onCancel(() => desktop.cancelNative(task.id))
        const r = await desktop.nativeConvert(task.id, task.source.path, task.target, task.engine, task.outputDir, progress)
        return { kind: 'path', path: r.output, name: r.output.split(/[\\/]/).pop() ?? outName, size: r.size }
    }
    const blob = await runInterface(task, signal, progress)
    signal.throwIfCancelled()
    if (task.source.kind === 'path') {
        progress({ stage: 'saving', percent: null })
        const r = await desktop.saveOutput(task.source.path, task.target, task.outputDir, new Uint8Array(await blob.arrayBuffer()))
        return { kind: 'path', path: r.output, name: r.output.split(/[\\/]/).pop() ?? outName, size: r.size }
    }
    return { kind: 'blob', blob, name: outName }
}
