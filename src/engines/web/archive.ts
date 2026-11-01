// Archives dans le navigateur : ZIP, CBZ, TAR et TAR.GZ (fflate + tar.ts).

import { gunzip, gzip, unzip, zip, type Zippable } from 'fflate'
import { readTar, writeTar, type TarEntry } from './tar'
import { extOf } from '../../formats/catalog'
import { CancelSignal, ConversionError, type ProgressInfo } from '../types'

const p = <T>(fn: (cb: (err: Error | null, data: T) => void) => void) =>
    new Promise<T>((resolve, reject) => fn((err, data) => (err ? reject(err) : resolve(data))))

async function readEntries(name: string, data: Uint8Array): Promise<TarEntry[]> {
    const ext = extOf(name)
    if (ext === 'zip' || ext === 'cbz') {
        const files = await p<Record<string, Uint8Array>>((cb) => unzip(data, cb))
        return Object.entries(files).map(([path, d]) => ({ path, data: d, dir: path.endsWith('/') }))
    }
    if (ext === 'tar') return readTar(data)
    if (ext === 'tar.gz' || ext === 'tgz') return readTar(await p<Uint8Array>((cb) => gunzip(data, cb)))
    // Fichier quelconque : il devient l'unique élément de l'archive.
    return [{ path: name, data, dir: false }]
}

export async function convertArchive(
    name: string,
    data: Uint8Array,
    target: string,
    signal: CancelSignal,
    progress: (p: ProgressInfo) => void,
): Promise<Blob> {
    progress({ stage: 'extract', percent: null })
    let entries: TarEntry[]
    try {
        entries = await readEntries(name, data)
    } catch (e) {
        const msg = String(e)
        throw new ConversionError(/encrypt|password/i.test(msg) ? 'password' : 'decode', msg)
    }
    signal.throwIfCancelled()
    if (!entries.some((e) => !e.dir)) throw new ConversionError('empty')
    progress({ stage: 'compress', percent: null })
    if (target === 'zip' || target === 'cbz') {
        const tree: Zippable = {}
        for (const e of entries) {
            if (e.dir) tree[e.path.replace(/\/?$/, '/')] = new Uint8Array(0)
            else tree[e.path] = [e.data, { level: target === 'cbz' ? 0 : 6 }]
        }
        const out = await p<Uint8Array>((cb) => zip(tree, { level: 6 }, cb))
        return new Blob([out as BlobPart], { type: target === 'cbz' ? 'application/vnd.comicbook+zip' : 'application/zip' })
    }
    const tar = writeTar(entries)
    if (target === 'tar') return new Blob([tar as BlobPart], { type: 'application/x-tar' })
    if (target === 'tar.gz') {
        const gz = await p<Uint8Array>((cb) => gzip(tar, { level: 6 }, cb))
        return new Blob([gz as BlobPart], { type: 'application/gzip' })
    }
    throw new ConversionError('unsupported')
}
