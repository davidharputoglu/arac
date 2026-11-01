// Tests de bout en bout de la version web (navigateur réel).
//
//   npm run build:web
//   npm test                      (sert dist-web/ et lance Chromium avec Playwright)
//
// Prérequis : `npm i -D playwright && npx playwright install chromium`.

import { createServer } from 'node:http'
import { readFile, stat } from 'node:fs/promises'
import { extname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

import { createRequire } from 'node:module'

// Playwright du projet, sinon celui installé globalement (NODE_PATH).
const { chromium } = await import('playwright').catch(() => createRequire(import.meta.url)('playwright'))
const root = resolve(fileURLToPath(new URL('..', import.meta.url)))
const dist = join(root, 'dist-web')
const fixtures = join(root, 'tests', 'fixtures')

const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.wasm': 'application/wasm', '.png': 'image/png', '.json': 'application/json' }
const server = createServer(async (req, res) => {
    let p = decodeURIComponent(new URL(req.url, 'http://x').pathname)
    if (p.endsWith('/')) p += 'index.html'
    const file = join(dist, p)
    try {
        await stat(file)
        res.writeHead(200, { 'Content-Type': TYPES[extname(file)] ?? 'application/octet-stream' })
        res.end(await readFile(file))
    } catch {
        res.writeHead(404).end()
    }
}).listen(0)
const base = `http://localhost:${server.address().port}/`

// Signature (premiers octets) attendue pour chaque format produit.
const MAGIC = {
    mp3: (b) => b.startsWith('ID3') || b.charCodeAt(0) === 0xff,
    ogg: (b) => b.startsWith('OggS'), opus: (b) => b.startsWith('OggS'),
    flac: (b) => b.startsWith('fLaC'),
    aac: (b) => b.charCodeAt(0) === 0xff && (b.charCodeAt(1) & 0xf0) === 0xf0,
    m4a: (b) => b.slice(4, 8) === 'ftyp', mp4: (b) => b.slice(4, 8) === 'ftyp', mov: (b) => b.slice(4, 8) === 'ftyp',
    webm: (b) => b.startsWith('\x1a\x45\xdf\xa3'), mkv: (b) => b.startsWith('\x1a\x45\xdf\xa3'),
    avi: (b) => b.startsWith('RIFF') && b.slice(8, 12) === 'AVI ',
    wav: (b) => b.startsWith('RIFF') && b.slice(8, 12) === 'WAVE',
    gif: (b) => b.startsWith('GIF8'),
    jpg: (b) => b.startsWith('\xff\xd8\xff'),
    png: (b) => b.startsWith('\x89PNG'),
    webp: (b) => b.startsWith('RIFF') && b.slice(8, 12) === 'WEBP',
    bmp: (b) => b.startsWith('BM'),
    tiff: (b) => b.startsWith('II*\x00') || b.startsWith('MM\x00*'),
    ico: (b) => b.startsWith('\x00\x00\x01\x00'),
    pdf: (b) => b.startsWith('%PDF'),
    zip: (b) => b.startsWith('PK\x03\x04'), cbz: (b) => b.startsWith('PK\x03\x04'),
    tar: (b) => b.slice(257, 262) === 'ustar',
    'tar.gz': (b) => b.startsWith('\x1f\x8b'),
    html: (b) => b.startsWith('<!DOCTYPE html>'),
    txt: (b) => b.length > 0,
}

const CASES = [
    ['son.wav', ['mp3', 'ogg', 'flac', 'aac', 'm4a', 'opus']],
    ['clip.mp4', ['webm', 'mkv', 'avi', 'mov', 'gif', 'mp3', 'wav']],
    ['transparente.png', ['jpg', 'webp', 'gif', 'bmp', 'tiff', 'ico', 'pdf']],
    ['photo.jpg', ['png', 'pdf']],
    ['logo.svg', ['png', 'jpg', 'webp', 'pdf']],
    ['notes.md', ['html', 'txt']],
    ['paquet.zip', ['tar', 'tar.gz', 'cbz']],
    ['paquet.tar.gz', ['zip']],
    ['lettre.txt', ['zip', 'tar.gz']],
]

let failures = 0
const check = (ok, label) => {
    console.log(`${ok ? 'PASS' : 'FAIL'} ${label}`)
    if (!ok) failures++
}

const browser = await chromium.launch()
const page = await browser.newPage({ viewport: { width: 1280, height: 900 }, locale: 'fr-FR' })
const errors = []
page.on('pageerror', (e) => errors.push(e.message))
await page.goto(base)

// 1. Toutes les conversions web, en une seule file d'attente.
const files = []
for (const [name, targets] of CASES) {
    const buffer = await readFile(join(fixtures, name))
    for (const t of targets) files.push({ name: `${t.replace('.', '_')}__${name}`, mimeType: '', buffer, target: t })
}
await page.setInputFiles('input[type=file]', files.map(({ name, mimeType, buffer }) => ({ name, mimeType, buffer })))
await page.waitForFunction((n) => document.querySelectorAll('[data-testid=file-row]').length === n, files.length, { timeout: 10_000 }).catch(() => {})
const selects = await page.$$('[data-testid=file-row] select')
if (selects.length !== files.length) console.log(await page.$$eval('[data-testid=file-row]', (rs) => rs.map((r) => r.innerText.split('\n')[0]).join(', ')))
check(selects.length === files.length, `${files.length} fichiers ajoutés`)
for (let i = 0; i < files.length; i++) await selects[i].selectOption(files[i].target)
await page.click('[data-testid=convert-all]')
await page.waitForFunction(
    (n) => document.querySelectorAll('[data-status=done],[data-status=error]').length === n,
    files.length, { timeout: 300_000 },
)
const rows = await page.$$('[data-testid=file-row]')
for (let i = 0; i < files.length; i++) {
    const row = rows[i]
    const label = `${files[i].name.split('__')[1]} → ${files[i].target}`
    const status = await row.getAttribute('data-status')
    if (status !== 'done') {
        check(false, `${label} (${status} : ${await row.innerText()})`)
        continue
    }
    const href = await row.$eval('[data-testid=download]', (a) => a.href)
    const head = await page.evaluate(async (u) => {
        const b = new Uint8Array(await (await fetch(u)).arrayBuffer())
        return { head: String.fromCharCode(...b.slice(0, 300)), size: b.length }
    }, href)
    check(MAGIC[files[i].target](head.head) && head.size > 0, `${label} (${head.size} octets)`)
}

// 2. Contenu : Markdown → texte, tar.gz → zip contient bien les fichiers.
const txtRow = rows[files.findIndex((f) => f.name === 'txt__notes.md')]
const txt = await page.evaluate(async (u) => (await fetch(u)).text(), await txtRow.$eval('[data-testid=download]', (a) => a.href))
check(txt.includes('Titre') && txt.includes('• un') && !txt.includes('**'), 'Markdown → texte lisible')
const zipRow = rows[files.findIndex((f) => f.name === 'zip__paquet.tar.gz')]
const zipText = await page.evaluate(async (u) => new TextDecoder('latin1').decode(await (await fetch(u)).arrayBuffer()), await zipRow.$eval('[data-testid=download]', (a) => a.href))
check(zipText.includes('a.txt') && zipText.includes('sous/b.txt'), 'tar.gz → zip garde les fichiers et sous-dossiers')

// 3. Documents bureautiques : proposés mais réservés à l'application de bureau.
await page.click('text=Tout retirer')
await page.setInputFiles('input[type=file]', join(fixtures, 'rapport.docx'))
const opts = await page.$$eval('[data-testid=file-row] select option', (os) => os.map((o) => ({ v: o.value, d: o.disabled, t: o.textContent })))
const docs = opts.filter((o) => !['zip', 'tar.gz', '7z'].includes(o.v))
check(docs.length >= 6 && docs.every((o) => o.d && /bureau/.test(o.t)), 'Word : formats grisés « application de bureau » sur le web')
check(opts.find((o) => o.v === 'zip')?.d === false, 'Word : compression ZIP possible sur le web')

// 4. Les 13 langues : aucun texte manquant, arabe de droite à gauche pour l'ouïghour.
for (const code of ['fr', 'en', 'es', 'pt', 'it', 'tr', 'az', 'uz', 'kk', 'tk', 'ky', 'tt', 'ug']) {
    await page.selectOption('[data-testid=language-select]', code)
    const info = await page.evaluate(() => ({ lang: document.documentElement.lang, dir: document.documentElement.dir, text: document.body.innerText }))
    check(info.lang === code && info.dir === (code === 'ug' ? 'rtl' : 'ltr') && !/\b(hero|drop|err|stage|tok|legal)[A-Z]\w+/.test(info.text), `langue ${code}`)
}
await page.selectOption('[data-testid=language-select]', 'fr')

// 5. Thèmes : changement, création d'un thème personnel, conservation après rechargement.
await page.click('[data-testid=open-settings]')
await page.click('[data-testid=theme-list] button:nth-child(2)')
check(await page.evaluate(() => document.documentElement.dataset.theme) === 'noir', 'Thème Noir appliqué')
await page.click('[data-testid=theme-customize]')
await page.fill('[data-testid=theme-editor] input:not([type=color])', 'Thème test')
await page.$eval('[data-testid=theme-editor] input[type=color]', (el) => {
    const set = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set
    set.call(el, '#ffffff')
    el.dispatchEvent(new Event('input', { bubbles: true }))
})
const warn = await page.$eval('[data-testid=theme-editor]', (el) => el.innerText)
check(/Peu lisible/.test(warn), 'Avertissement de lisibilité (fond blanc + texte clair)')
await page.click('[data-testid=theme-editor] >> text=Enregistrer')
await page.reload()
const after = await page.evaluate(() => ({ theme: document.documentElement.dataset.theme, bg: getComputedStyle(document.documentElement).getPropertyValue('--c-bg').trim() }))
check(after.theme.startsWith('custom-') && after.bg === '255 255 255', 'Thème personnel enregistré et rechargé')

// 6. Mentions légales et licence complète.
await page.click('[data-testid=open-legal]')
await page.click('text=Lire le texte complet de la licence (anglais)')
await page.waitForSelector('[data-testid=license-text]')
const lic = await page.$eval('[data-testid=license-text]', (el) => el.textContent)
check(lic.includes('GNU GENERAL PUBLIC LICENSE') && lic.includes('Version 3, 29 June 2007'), 'Texte complet de la GPLv3')
check(/SANS AUCUNE GARANTIE/.test(await page.$eval('[data-testid=legal]', (el) => el.innerText)), 'Avertissement d’absence de garantie')

check(errors.length === 0, `aucune erreur JavaScript ${errors.join(' | ')}`)
await browser.close()
server.close()
console.log(failures ? `\n${failures} échec(s)` : '\nTout est OK')
process.exit(failures ? 1 : 0)
