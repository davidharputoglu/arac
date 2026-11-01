// Markdown → HTML (page complète) ou texte brut.

import { marked } from 'marked'

const STYLE = `body{font-family:system-ui,-apple-system,"Segoe UI",Roboto,sans-serif;max-width:46rem;margin:2rem auto;padding:0 1rem;line-height:1.6;color:#1e293b}
pre,code{font-family:ui-monospace,Consolas,monospace;background:#f1f5f9;border-radius:4px}pre{padding:.75rem;overflow:auto}code{padding:.1rem .25rem}
table{border-collapse:collapse}th,td{border:1px solid #cbd5e1;padding:.3rem .6rem}img{max-width:100%}blockquote{border-left:4px solid #cbd5e1;margin:0;padding-left:1rem;color:#475569}`

const escape = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;')

export async function markdownToHtml(md: string, title: string): Promise<string> {
    const body = await marked.parse(md, { gfm: true })
    return `<!DOCTYPE html>\n<html>\n<head>\n<meta charset="utf-8">\n<meta name="viewport" content="width=device-width, initial-scale=1">\n<title>${escape(title)}</title>\n<style>${STYLE}</style>\n</head>\n<body>\n${body}</body>\n</html>\n`
}

const BLOCKS = new Set(['P', 'DIV', 'H1', 'H2', 'H3', 'H4', 'H5', 'H6', 'LI', 'TR', 'PRE', 'BLOCKQUOTE', 'HR', 'TABLE', 'UL', 'OL'])

export async function markdownToText(md: string): Promise<string> {
    const html = await marked.parse(md, { gfm: true })
    const doc = new DOMParser().parseFromString(html, 'text/html')
    let out = ''
    const walk = (n: Node) => {
        if (n.nodeType === Node.TEXT_NODE) { out += n.textContent ?? ''; return }
        if (!(n instanceof Element)) return
        if (n.tagName === 'BR') { out += '\n'; return }
        if (n.tagName === 'LI') out += '• '
        if (n.tagName === 'TD' || n.tagName === 'TH') out += '\t'
        n.childNodes.forEach(walk)
        if (BLOCKS.has(n.tagName)) out += '\n'
    }
    doc.body.childNodes.forEach(walk)
    return out.replace(/\n{3,}/g, '\n\n').trim() + '\n'
}
