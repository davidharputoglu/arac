// Lecture et écriture d'archives TAR (format ustar, noms longs GNU et PAX).

export interface TarEntry {
    path: string
    data: Uint8Array
    dir: boolean
    mode?: number
    mtime?: number
}

const enc = new TextEncoder()
const dec = new TextDecoder()

function readString(b: Uint8Array, off: number, len: number): string {
    let end = off
    while (end < off + len && b[end] !== 0) end++
    return dec.decode(b.subarray(off, end))
}

function readOctal(b: Uint8Array, off: number, len: number): number {
    // Base 256 (bit de poids fort) pour les très gros fichiers.
    if (b[off] & 0x80) {
        let v = 0
        for (let i = off + 1; i < off + len; i++) v = v * 256 + b[i]
        return v
    }
    const s = readString(b, off, len).trim()
    return s ? parseInt(s, 8) : 0
}

function parsePax(data: Uint8Array): Record<string, string> {
    const out: Record<string, string> = {}
    const text = dec.decode(data)
    let i = 0
    while (i < text.length) {
        const sp = text.indexOf(' ', i)
        if (sp < 0) break
        const len = parseInt(text.slice(i, sp), 10)
        if (!len) break
        const rec = text.slice(sp + 1, i + len - 1)
        const eq = rec.indexOf('=')
        if (eq > 0) out[rec.slice(0, eq)] = rec.slice(eq + 1)
        i += len
    }
    return out
}

export function readTar(buf: Uint8Array): TarEntry[] {
    const entries: TarEntry[] = []
    let off = 0
    let longName: string | null = null
    let pax: Record<string, string> = {}
    while (off + 512 <= buf.length) {
        const h = buf.subarray(off, off + 512)
        if (h.every((x) => x === 0)) break
        const size = readOctal(h, 124, 12)
        const type = String.fromCharCode(h[156] || 48)
        const dataStart = off + 512
        const data = buf.subarray(dataStart, dataStart + size)
        off = dataStart + Math.ceil(size / 512) * 512
        if (type === 'L') { longName = readString(data, 0, data.length); continue }
        if (type === 'x') { pax = parsePax(data); continue }
        if (type === 'g') continue
        let name = readString(h, 0, 100)
        const magic = readString(h, 257, 6)
        if (magic.startsWith('ustar')) {
            const prefix = readString(h, 345, 155)
            if (prefix) name = prefix + '/' + name
        }
        if (longName) name = longName
        if (pax.path) name = pax.path
        longName = null
        pax = {}
        if (type === '5') entries.push({ path: name.replace(/\/?$/, '/'), data: new Uint8Array(0), dir: true })
        else if (type === '0' || type === '\0' || type === '7') {
            entries.push({ path: name, data: data.slice(), dir: false, mode: readOctal(h, 100, 8), mtime: readOctal(h, 136, 12) })
        }
        // Liens et fichiers spéciaux ignorés.
    }
    return entries
}

function writeString(b: Uint8Array, off: number, len: number, s: string) {
    b.set(enc.encode(s).subarray(0, len), off)
}

function writeOctal(b: Uint8Array, off: number, len: number, v: number) {
    writeString(b, off, len, v.toString(8).padStart(len - 1, '0') + '\0')
}

function header(name: string, size: number, type: string, mode: number, mtime: number): Uint8Array {
    const h = new Uint8Array(512)
    writeString(h, 0, 100, name)
    writeOctal(h, 100, 8, mode)
    writeOctal(h, 108, 8, 0)
    writeOctal(h, 116, 8, 0)
    writeOctal(h, 124, 12, size)
    writeOctal(h, 136, 12, mtime)
    h.fill(32, 148, 156) // somme de contrôle calculée avec des espaces
    h[156] = type.charCodeAt(0)
    writeString(h, 257, 6, 'ustar\0')
    writeString(h, 263, 2, '00')
    let sum = 0
    for (const x of h) sum += x
    writeString(h, 148, 8, sum.toString(8).padStart(6, '0') + '\0 ')
    return h
}

export function writeTar(entries: TarEntry[]): Uint8Array {
    const parts: Uint8Array[] = []
    const now = Math.floor(Date.now() / 1000)
    const pad = (n: number) => new Uint8Array((512 - (n % 512)) % 512)
    for (const e of entries) {
        const name = e.dir ? e.path.replace(/\/?$/, '/') : e.path
        const mtime = e.mtime ?? now
        const bytes = enc.encode(name)
        if (bytes.length > 99) {
            // Nom long : en-tête GNU « L » suivi du nom complet.
            const data = new Uint8Array(bytes.length + 1)
            data.set(bytes)
            parts.push(header('././@LongLink', data.length, 'L', 0o644, 0), data, pad(data.length))
        }
        const size = e.dir ? 0 : e.data.length
        parts.push(header(name, size, e.dir ? '5' : '0', e.mode ?? (e.dir ? 0o755 : 0o644), mtime))
        if (!e.dir) parts.push(e.data, pad(size))
    }
    parts.push(new Uint8Array(1024))
    let total = 0
    for (const p of parts) total += p.length
    const out = new Uint8Array(total)
    let off = 0
    for (const p of parts) { out.set(p, off); off += p.length }
    return out
}
