// ffmpeg compilé en WebAssembly, pour la version web.
// Les réglages sont plus légers que sur le bureau (le navigateur n'a qu'un
// seul cœur de calcul) ; le VP9 fait planter le moteur, on utilise le VP8.

import type { FFmpeg, FFFSType } from '@ffmpeg/ffmpeg'
import { familyOf } from '../../formats/catalog'
import { CancelSignal, ConversionError, MIME, type ProgressInfo } from '../types'

let instance: FFmpeg | null = null
let loading: Promise<FFmpeg> | null = null

async function getFFmpeg(progress: (p: ProgressInfo) => void): Promise<FFmpeg> {
    if (instance?.loaded) return instance
    if (!loading) {
        loading = (async () => {
            progress({ stage: 'loadingEngine', percent: null })
            const { FFmpeg } = await import('@ffmpeg/ffmpeg')
            const ff = new FFmpeg()
            const base = new URL('ffmpeg/', document.baseURI).href
            await ff.load({ coreURL: base + 'ffmpeg-core.js', wasmURL: base + 'ffmpeg-core.wasm' })
            instance = ff
            return ff
        })()
        loading.catch(() => { loading = null })
    }
    try {
        return await loading
    } catch (e) {
        throw new ConversionError('engineLoad', String(e))
    }
}

/** Après une annulation ou un plantage, on repart d'un moteur neuf. */
function reset() {
    try { instance?.terminate() } catch { /* déjà arrêté */ }
    instance = null
    loading = null
}

const EVEN = 'scale=trunc(iw/2)*2:trunc(ih/2)*2'

export function webArgs(srcName: string, target: string): string[] {
    const family = familyOf(srcName)
    if (family === 'image') {
        const a = ['-frames:v', '1', '-update', '1']
        switch (target) {
            case 'jpg':
                return [...a, '-filter_complex', '[0:v]format=rgba,split[a][b];[a]format=yuv444p,drawbox=c=white:t=fill[bg];[bg][b]overlay=format=auto,format=yuvj444p', '-q:v', '2']
            case 'webp': return [...a, '-c:v', 'libwebp', '-quality', '90']
            case 'gif': return [...a, '-filter_complex', '[0:v]split[a][b];[a]palettegen=reserve_transparent=1[p];[b][p]paletteuse=alpha_threshold=128']
            case 'ico': return [...a, '-vf', "scale='min(256,iw)':'min(256,ih)':force_original_aspect_ratio=decrease"]
            default: return a
        }
    }
    const audio: Record<string, string[]> = {
        mp3: ['-c:a', 'libmp3lame', '-q:a', '2'],
        wav: ['-c:a', 'pcm_s16le'],
        ogg: ['-c:a', 'libvorbis', '-q:a', '5'],
        flac: ['-c:a', 'flac'],
        aac: ['-c:a', 'aac', '-b:a', '192k'],
        m4a: ['-c:a', 'aac', '-b:a', '192k'],
        opus: ['-c:a', 'libopus', '-b:a', '128k'],
    }
    if (audio[target]) return ['-vn', '-sn', ...audio[target]]
    const h264 = ['-c:v', 'libx264', '-preset', 'veryfast', '-crf', '23', '-pix_fmt', 'yuv420p', '-vf', EVEN]
    switch (target) {
        case 'mp4':
        case 'mov': return [...h264, '-c:a', 'aac', '-b:a', '160k', '-movflags', '+faststart', '-sn']
        case 'mkv': return [...h264, '-c:a', 'aac', '-b:a', '160k', '-sn']
        case 'webm': return ['-c:v', 'libvpx', '-deadline', 'realtime', '-cpu-used', '8', '-b:v', '2M', '-crf', '10', '-c:a', 'libopus', '-b:a', '128k', '-sn']
        case 'avi': return ['-c:v', 'mpeg4', '-q:v', '5', '-vtag', 'xvid', '-c:a', 'libmp3lame', '-q:a', '4', '-sn']
        case 'gif': return ['-an', '-sn', '-vf', "fps=10,scale='min(480,iw)':-1:flags=lanczos,split[a][b];[a]palettegen[p];[b][p]paletteuse", '-loop', '0']
    }
    throw new ConversionError('unsupported')
}

export async function convertMedia(
    file: File,
    target: string,
    signal: CancelSignal,
    progress: (p: ProgressInfo) => void,
): Promise<Blob> {
    const args = webArgs(file.name, target)
    const ff = await getFFmpeg(progress)
    signal.throwIfCancelled()
    const id = Math.random().toString(36).slice(2, 8)
    const dot = file.name.lastIndexOf('.')
    const input = `in-${id}${dot > 0 ? file.name.slice(dot).toLowerCase() : ''}`
    const output = `out-${id}.${target}`
    let mounted = false
    const onProgress = ({ progress: p }: { progress: number }) => {
        if (p >= 0 && p <= 1) progress({ stage: 'media', percent: Math.min(p, 0.99) })
    }
    signal.onCancel(reset)
    try {
        progress({ stage: 'reading', percent: null })
        // Le fichier est lu directement depuis le disque quand c'est possible
        // (pas de copie en mémoire), sinon copié.
        let inputPath = input
        try {
            await ff.createDir(`/m-${id}`)
            await ff.mount('WORKERFS' as FFFSType, { files: [new File([file], input)] }, `/m-${id}`)
            inputPath = `/m-${id}/${input}`
            mounted = true
        } catch {
            const { fetchFile } = await import('@ffmpeg/util')
            await ff.writeFile(input, await fetchFile(file))
        }
        signal.throwIfCancelled()
        progress({ stage: 'media', percent: 0 })
        ff.on('progress', onProgress)
        const code = await ff.exec(['-hide_banner', '-y', '-i', inputPath, ...args, output])
        signal.throwIfCancelled()
        let data: Uint8Array
        try {
            data = (await ff.readFile(output)) as Uint8Array
        } catch {
            throw new ConversionError('tool', `ffmpeg: ${code}`)
        }
        if (!data.length) throw new ConversionError('tool', `ffmpeg: ${code}`)
        return new Blob([data as BlobPart], { type: MIME[target] ?? 'application/octet-stream' })
    } catch (e) {
        if (signal.cancelled) throw new ConversionError('cancelled')
        if (e instanceof ConversionError) throw e
        // Le moteur a planté (mémoire…) : on le recharge la prochaine fois.
        reset()
        throw new ConversionError('tool', String(e))
    } finally {
        if (instance === ff) {
            ff.off('progress', onProgress)
            await ff.deleteFile(output).catch(() => {})
            if (mounted) {
                await ff.unmount(`/m-${id}`).catch(() => {})
                await ff.deleteDir(`/m-${id}`).catch(() => {})
            } else await ff.deleteFile(input).catch(() => {})
        }
    }
}
