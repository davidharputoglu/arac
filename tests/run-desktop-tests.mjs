// Test de bout en bout de l'application de bureau réelle (Linux), via
// tauri-driver (WebDriver). Prérequis :
//   cargo install tauri-driver ; paquet webkit2gtk-driver ; ffmpeg, 7z, LibreOffice
//   npx tauri build --debug --no-bundle
//   xvfb-run tauri-driver --port 4444 &   puis   node tests/run-desktop-tests.mjs

import { copyFileSync, cpSync, existsSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = resolve(fileURLToPath(new URL('..', import.meta.url)))
const app = join(root, 'src-tauri', 'target', 'debug', 'arac')
const fixtures = join(root, 'tests', 'fixtures')
const WD = process.env.WEBDRIVER_URL ?? 'http://127.0.0.1:4444'

async function wd(method, path, body) {
    const r = await fetch(WD + path, { method, headers: { 'Content-Type': 'application/json' }, body: body ? JSON.stringify(body) : undefined })
    const j = await r.json()
    if (j.value && j.value.error) throw new Error(`${path}: ${j.value.error} ${j.value.message}`)
    return j.value
}

let failures = 0
const check = (ok, label) => {
    console.log(`${ok ? 'PASS' : 'FAIL'} ${label}`)
    if (!ok) failures++
}

// Fichiers de test dans un dossier avec espaces et accents.
const work = mkdtempSync(join(tmpdir(), 'arac-e2e-'))
const dir = join(work, 'Mes fichiers éè')
mkdirSync(dir)
for (const f of readdirSync(fixtures)) copyFileSync(join(fixtures, f), join(dir, f))
const folder = join(dir, 'Dossier à compresser')
mkdirSync(join(folder, 'sous'), { recursive: true })
writeFileSync(join(folder, 'a.txt'), 'a')
writeFileSync(join(folder, 'sous', 'b.txt'), 'b')
writeFileSync(join(dir, 'tableau.csv'), 'nom,prix\nbéton,12.5\n')

const session = await wd('POST', '/session', { capabilities: { alwaysMatch: { 'tauri:options': { application: app } } } })
const sid = session.sessionId
const run = (script, args = []) => wd('POST', `/session/${sid}/execute/sync`, { script, args })
const runAsync = (script, args = []) => wd('POST', `/session/${sid}/execute/async`, { script, args })
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))
const shot = async (name) => writeFileSync(join(work, name), Buffer.from(await wd('GET', `/session/${sid}/screenshot`), 'base64'))

try {
    for (let i = 0; i < 100 && !(await run('return !!window.__aracAddPaths')); i++) await sleep(200)
    check(await run('return !!window.__TAURI_INTERNALS__'), 'Application de bureau démarrée')
    await run(`document.querySelector('[data-testid=language-select]').value; return 1`)

    const CASES = [
        ['clip.mp4', 'webm'], ['clip.mp4', 'mp3'], ['son.wav', 'flac'], ['transparente.png', 'jpg'],
        ['transparente.png', 'pdf'], ['logo.svg', 'png'], ['notes.md', 'html'], ['notes.md', 'pdf'],
        ['rapport.docx', 'pdf'], ['rapport.docx', 'odt'], ['tableau.csv', 'xlsx'], ['paquet.zip', '7z'],
        ['paquet.tar.gz', 'zip'], ['Dossier à compresser', 'zip'], ['lettre.txt', 'docx'],
    ]
    // Un même fichier n'est ajouté qu'une fois : on fait deux passes.
    const passes = [[], []]
    const seen = new Set()
    for (const c of CASES) (seen.has(c[0]) ? passes[1] : passes[0]).push(c) && seen.add(c[0])

    for (const [n, pass] of passes.entries()) {
        await run(`document.querySelectorAll('[data-testid=file-row]').length && document.evaluate("//button[contains(., 'Tout retirer') or contains(., 'Remove all')]", document, null, 9).singleNodeValue?.click(); return 1`)
        await sleep(300)
        const paths = pass.map(([f]) => join(dir, f))
        await runAsync('const done = arguments[arguments.length - 1]; window.__aracAddPaths(arguments[0]).then(() => done(1), (e) => done(String(e)))', [paths])
        await sleep(500)
        const count = await run(`return document.querySelectorAll('[data-testid=file-row]').length`)
        check(count === pass.length, `passe ${n + 1} : ${count} fichiers ajoutés par chemin`)
        for (let i = 0; i < pass.length; i++) {
            const ok = await run(`
                const sel = document.querySelectorAll('[data-testid=file-row] select')[arguments[0]]
                if (!sel) return 'no select'
                const opt = [...sel.options].find((o) => o.value === arguments[1])
                if (!opt || opt.disabled) return 'option ' + arguments[1] + ' indisponible'
                Object.getOwnPropertyDescriptor(HTMLSelectElement.prototype, 'value').set.call(sel, arguments[1])
                sel.dispatchEvent(new Event('change', { bubbles: true }))
                return true`, [i, pass[i][1]])
            if (ok !== true) check(false, `${pass[i][0]} → ${pass[i][1]} : ${ok}`)
        }
        if (n === 0) await shot('bureau-avant.png')
        await run(`document.querySelector('[data-testid=convert-all]').click(); return 1`)
        let statuses = []
        for (let i = 0; i < 600; i++) {
            statuses = await run(`return [...document.querySelectorAll('[data-testid=file-row]')].map((r) => r.dataset.status)`)
            if (statuses.every((s) => s === 'done' || s === 'error' || s === 'cancelled')) break
            if (i === 3 && n === 0) await shot('bureau-pendant.png')
            await sleep(500)
        }
        const texts = await run(`return [...document.querySelectorAll('[data-testid=file-row]')].map((r) => r.innerText.replace(/\\n+/g, ' | '))`)
        for (let i = 0; i < pass.length; i++) {
            const [src, target] = pass[i]
            const stem = src.replace(/\.(tar\.gz|[^.]+)$/, '')
            const out = join(dir, `${src === 'Dossier à compresser' ? src : stem}.${target}`)
            check(statuses[i] === 'done' && existsSync(out) && readFileSync(out).length > 0, `${src} → ${target}${statuses[i] !== 'done' ? ' : ' + texts[i] : ''}`)
        }
        if (n === 0) await shot('bureau-apres.png')
    }

    // Contrôles de contenu.
    const jpg = readFileSync(join(dir, 'transparente.jpg'))
    check(jpg[0] === 0xff && jpg[1] === 0xd8, 'JPEG valide')
    check(readFileSync(join(dir, 'transparente.pdf')).subarray(0, 4).toString() === '%PDF', 'Image → PDF (dans l’interface, enregistré par Rust)')
    check(readFileSync(join(dir, 'logo.png')).subarray(1, 4).toString() === 'PNG', 'SVG → PNG')
    check(readFileSync(join(dir, 'notes.html'), 'utf8').includes('<h1'), 'Markdown → HTML')
    check(readdirSync(dir).every((f) => !f.startsWith('.arac-')), 'Aucun fichier temporaire restant')

    // Reconversion : jamais d'écrasement.
    await run(`document.evaluate("//button[contains(., 'Tout retirer') or contains(., 'Remove all')]", document, null, 9).singleNodeValue?.click(); return 1`)
    await runAsync('const done = arguments[arguments.length - 1]; window.__aracAddPaths(arguments[0]).then(() => done(1))', [[join(dir, 'son.wav')]])
    await sleep(300)
    await run(`const s = document.querySelector('[data-testid=file-row] select'); Object.getOwnPropertyDescriptor(HTMLSelectElement.prototype, 'value').set.call(s, 'flac'); s.dispatchEvent(new Event('change', { bubbles: true })); document.querySelector('[data-testid=convert-all]').click(); return 1`)
    for (let i = 0; i < 60 && (await run(`return document.querySelector('[data-testid=file-row]').dataset.status`)) !== 'done'; i++) await sleep(300)
    check(existsSync(join(dir, 'son (1).flac')), 'Deuxième conversion : « son (1).flac », original conservé')

    // Paramètres : moteurs détectés.
    await run(`document.querySelector('[data-testid=open-settings]').click(); return 1`)
    await sleep(400)
    const settingsText = await run(`return document.querySelector('[role=dialog]').innerText`)
    check(/ffmpeg/.test(settingsText) && /LibreOffice/.test(settingsText) && /7-Zip/.test(settingsText), 'Paramètres : moteurs de conversion listés')
    await shot('bureau-parametres.png')
} finally {
    await wd('DELETE', `/session/${sid}`).catch(() => {})
}
console.log(`\nCaptures et fichiers : ${work}`)
console.log(failures ? `${failures} échec(s)` : 'Tout est OK')
process.exit(failures ? 1 : 0)
