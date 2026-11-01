// Images dans l'interface : SVG et formats lus par le navigateur vers
// PNG / JPG / WEBP (canvas), et images vers PDF (pdf-lib).

import { ConversionError } from '../types'

const SVG_MAX = 1024

/** Taille d'affichage d'un SVG : width/height en px, sinon viewBox agrandi. */
export function svgSize(text: string): { w: number; h: number } {
    const tag = text.match(/<svg\b[^>]*>/i)?.[0] ?? ''
    const attr = (n: string) => tag.match(new RegExp(`\\s${n}\\s*=\\s*["']([^"']+)["']`, 'i'))?.[1]
    const px = (v?: string) => (v && /^\s*[\d.]+\s*(px)?\s*$/.test(v) ? parseFloat(v) : NaN)
    let w = px(attr('width'))
    let h = px(attr('height'))
    const vb = attr('viewBox')?.trim().split(/[\s,]+/).map(Number)
    if ((!w || !h) && vb && vb.length === 4 && vb[2] > 0 && vb[3] > 0) {
        const scale = SVG_MAX / Math.max(vb[2], vb[3])
        w = w || (h ? (h * vb[2]) / vb[3] : vb[2] * scale)
        h = h || (w * vb[3]) / vb[2]
    }
    if (!w || !h) return { w: SVG_MAX, h: SVG_MAX }
    return { w: Math.round(w), h: Math.round(h) }
}

async function loadSvg(blob: Blob): Promise<CanvasImageSource & { width: number; height: number }> {
    const text = await blob.text()
    const { w, h } = svgSize(text)
    // On impose la taille pour que le navigateur dessine à la bonne échelle.
    const sized = text.replace(/<svg\b([^>]*)>/i, (_m, attrs: string) => {
        const cleaned = attrs.replace(/\s(width|height)\s*=\s*["'][^"']*["']/gi, '')
        return `<svg${cleaned} width="${w}" height="${h}">`
    })
    const url = URL.createObjectURL(new Blob([sized], { type: 'image/svg+xml' }))
    try {
        const img = new Image()
        img.decoding = 'async'
        img.src = url
        await img.decode()
        return Object.assign(img, { width: w, height: h })
    } catch {
        throw new ConversionError('decode')
    } finally {
        setTimeout(() => URL.revokeObjectURL(url), 1000)
    }
}

async function decode(blob: Blob, isSvg: boolean) {
    if (isSvg) return loadSvg(blob)
    try {
        return await createImageBitmap(blob)
    } catch {
        throw new ConversionError('decode')
    }
}

const TYPES: Record<string, string> = { png: 'image/png', jpg: 'image/jpeg', webp: 'image/webp' }

export async function rasterize(blob: Blob, isSvg: boolean, target: 'png' | 'jpg' | 'webp'): Promise<Blob> {
    const img = await decode(blob, isSvg)
    const canvas = document.createElement('canvas')
    canvas.width = img.width
    canvas.height = img.height
    const ctx = canvas.getContext('2d')
    if (!ctx) throw new ConversionError('tool', 'canvas')
    if (target === 'jpg') {
        // Pas de transparence en JPEG : fond blanc.
        ctx.fillStyle = '#ffffff'
        ctx.fillRect(0, 0, canvas.width, canvas.height)
    }
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height)
    if ('close' in img && typeof img.close === 'function') img.close()
    const out = await new Promise<Blob | null>((r) => canvas.toBlob(r, TYPES[target], 0.92))
    if (!out || out.type !== TYPES[target]) throw new ConversionError('unsupported', target)
    return out
}

/** Une image = une page, à sa taille réelle (96 ppp). */
export async function imageToPdf(blob: Blob, ext: string, title: string): Promise<Blob> {
    const { PDFDocument } = await import('pdf-lib')
    const doc = await PDFDocument.create()
    doc.setTitle(title)
    doc.setProducer('Araç')
    let bytes = new Uint8Array(await blob.arrayBuffer())
    let kind = ext === 'jpg' || ext === 'jpeg' ? 'jpg' : ext === 'png' ? 'png' : 'other'
    if (kind === 'other') {
        bytes = new Uint8Array(await (await rasterize(blob, ext === 'svg', 'png')).arrayBuffer())
        kind = 'png'
    }
    let img
    try {
        img = kind === 'jpg' ? await doc.embedJpg(bytes) : await doc.embedPng(bytes)
    } catch {
        // JPEG progressif ou PNG exotique : on repasse par le navigateur.
        const png = new Uint8Array(await (await rasterize(blob, false, 'png')).arrayBuffer())
        img = await doc.embedPng(png)
    }
    const w = img.width * 0.75
    const h = img.height * 0.75
    const page = doc.addPage([w, h])
    page.drawImage(img, { x: 0, y: 0, width: w, height: h })
    const out = await doc.save()
    return new Blob([out as BlobPart], { type: 'application/pdf' })
}
