import { useCallback, useEffect, useMemo, useState } from 'react'
import { CircleCheck, CircleHelp, Download, Info, Languages, LoaderCircle, Settings as SettingsIcon, TriangleAlert, Trash2, FolderOutput, Square } from 'lucide-react'
import { Dropzone } from './components/Dropzone'
import { FileRow } from './components/FileRow'
import { HelpModal } from './components/HelpModal'
import { SettingsModal } from './components/SettingsModal'
import { LegalModal } from './components/LegalModal'
import { Select } from './components/Select'
import { AUTHOR, AUTHOR_EMAIL, ExternalLink } from './components/Credit'
import { useJobs } from './hooks/useJobs'
import { useI18n } from './i18n'
import { LANGUAGES, type LanguageCode } from './i18n/languages'
import * as desktop from './engines/desktop'
import type { Platform } from './formats/catalog'
import { saveSettings, type Settings } from './settings'
import { BUILTIN_THEMES, applyTheme, loadCustomThemes, saveCustomThemes, type Theme } from './theme'
import { APP_VERSION, RELEASES_URL, REPO_URL } from './version'
import logo from './assets/logo.png'

const isWindows = typeof navigator !== 'undefined' && /windows/i.test(navigator.userAgent)

/** Page intégrée dans un autre site (iframe) ? */
const embedded = (() => {
    try { return window.self !== window.top } catch { return true }
})()

function Logo() {
    return <img src={logo} alt="" className="w-9 h-9 rounded-[10px] shadow-lg shadow-accent/20" draggable={false} />
}

export default function App({ initialSettings }: { initialSettings: Settings }) {
    const { t, lang, setLang } = useI18n()
    const isDesktop = desktop.isDesktop
    const [settings, setSettings] = useState<Settings>(initialSettings)
    const [customThemes, setCustomThemes] = useState<Theme[]>(loadCustomThemes)
    const [helpOpen, setHelpOpen] = useState(false)
    const [settingsOpen, setSettingsOpen] = useState(false)
    const [legalOpen, setLegalOpen] = useState(false)
    const [engines, setEngines] = useState<desktop.EnginesStatus | null>(null)
    const [nativeHover, setNativeHover] = useState(false)
    const [zipping, setZipping] = useState(false)

    const themes = useMemo(() => [...BUILTIN_THEMES, ...customThemes], [customThemes])
    const activeTheme = themes.find((th) => th.id === settings.theme) ?? BUILTIN_THEMES[0]
    useEffect(() => applyTheme(activeTheme), [activeTheme])

    const update = useCallback((patch: Partial<Settings>) => {
        setSettings((s) => {
            const next = { ...s, ...patch }
            saveSettings(next)
            return next
        })
    }, [])

    // La langue choisie est retenue.
    useEffect(() => {
        if (settings.lang !== lang) update({ lang })
    }, [lang, settings.lang, update])

    const saveCustom = useCallback((list: Theme[]) => {
        setCustomThemes(list)
        saveCustomThemes(list)
    }, [])

    const platform = useMemo<Platform>(() => {
        if (!isDesktop) return { kind: 'web' }
        // Tant que la détection n'est pas finie, on suppose les outils présents.
        if (!engines) return { kind: 'desktop', tools: { ffmpeg: true, sevenzip: true, libreoffice: true } }
        return { kind: 'desktop', tools: { ffmpeg: !!engines.ffmpeg, sevenzip: !!engines.sevenzip, libreoffice: !!engines.libreoffice } }
    }, [isDesktop, engines])

    const outputDir = isDesktop && settings.outputMode === 'folder' ? settings.outputDir : null
    const { jobs, addFiles, addPaths, setTarget, remove, clear, convertAll, retry, cancel, cancelAll } = useJobs(platform, outputDir)

    useEffect(() => {
        if (isDesktop) desktop.enginesStatus().then(setEngines).catch(() => {})
    }, [isDesktop])

    const addNativePaths = useCallback(async (paths: string[]) => {
        if (paths.length) addPaths(await desktop.inspectPaths(paths))
    }, [addPaths])

    // Point d'entrée pour les tests automatiques de l'application de bureau.
    useEffect(() => {
        if (isDesktop) (window as unknown as { __aracAddPaths?: (p: string[]) => Promise<void> }).__aracAddPaths = addNativePaths
    }, [isDesktop, addNativePaths])

    // Glisser-déposer natif de l'application de bureau (chemins des fichiers).
    useEffect(() => {
        if (!isDesktop) return
        let unlisten: (() => void) | undefined
        let alive = true
        import('@tauri-apps/api/webview').then(({ getCurrentWebview }) =>
            getCurrentWebview().onDragDropEvent((e) => {
                const p = e.payload
                if (p.type === 'enter' || p.type === 'over') setNativeHover(true)
                else if (p.type === 'leave') setNativeHover(false)
                else if (p.type === 'drop') {
                    setNativeHover(false)
                    void addNativePaths(p.paths)
                }
            }),
        ).then((u) => (alive ? (unlisten = u) : u()))
        return () => { alive = false; unlisten?.() }
    }, [isDesktop, addNativePaths])

    // Empêche le navigateur d'ouvrir un fichier lâché à côté de la zone.
    useEffect(() => {
        const stop = (e: DragEvent) => e.preventDefault()
        window.addEventListener('dragover', stop)
        window.addEventListener('drop', stop)
        return () => { window.removeEventListener('dragover', stop); window.removeEventListener('drop', stop) }
    }, [])

    // Page intégrée : on donne sa hauteur à la page qui l'accueille (embed.js).
    useEffect(() => {
        if (!embedded) return
        const send = () => window.parent.postMessage({ arac: 'height', value: document.documentElement.scrollHeight }, '*')
        const ro = new ResizeObserver(send)
        ro.observe(document.body)
        send()
        return () => ro.disconnect()
    }, [])

    const pickOutput = async () => {
        const dir = await desktop.pickFolder()
        if (dir) update({ outputDir: dir, outputMode: 'folder' })
    }

    const downloadAll = async () => {
        const done = jobs.filter((j) => j.status === 'done' && j.output?.kind === 'blob')
        if (!done.length) return
        setZipping(true)
        try {
            const { zip } = await import('fflate')
            const files: Record<string, Uint8Array> = {}
            for (const j of done) {
                if (j.output?.kind !== 'blob') continue
                let name = j.output.name
                for (let n = 1; files[name]; n++) name = j.output.name.replace(/(\.[^.]+)?$/, ` (${n})$1`)
                files[name] = new Uint8Array(await j.output.blob.arrayBuffer())
            }
            const data = await new Promise<Uint8Array>((res, rej) => zip(files, { level: 0 }, (e, d) => (e ? rej(e) : res(d))))
            const a = document.createElement('a')
            a.href = URL.createObjectURL(new Blob([data as BlobPart], { type: 'application/zip' }))
            a.download = 'arac.zip'
            a.click()
            setTimeout(() => URL.revokeObjectURL(a.href), 5000)
        } finally {
            setZipping(false)
        }
    }

    const busy = jobs.some((j) => j.status === 'running' || j.status === 'queued')
    const convertible = jobs.filter((j) => j.target && j.options.some((o) => o.target === j.target && o.engine) && ['ready', 'error', 'cancelled'].includes(j.status)).length
    const finished = jobs.filter((j) => j.status === 'done').length
    const doneBlobs = jobs.filter((j) => j.status === 'done' && j.output?.kind === 'blob').length
    const missing = engines ? [!engines.ffmpeg && 'ffmpeg', !engines.sevenzip && '7-Zip'].filter(Boolean).join(', ') : ''
    const hasFiles = jobs.length > 0

    return (
        <div className={`${embedded ? '' : 'min-h-screen'} bg-bg text-fg flex flex-col`}>
            {/* En-tête */}
            <header className="sticky top-0 z-20 h-14 flex items-center gap-3 px-4 sm:px-6 border-b border-line bg-surface/90 backdrop-blur">
                <Logo />
                <div className="min-w-0">
                    <h1 className="text-lg font-black tracking-tight leading-none text-accent">Araç</h1>
                    <p className="text-[10px] uppercase tracking-[0.18em] text-muted font-semibold truncate">{t('appSubtitle')}</p>
                </div>
                <div className="ms-auto flex items-center gap-1 sm:gap-2">
                    <label className="relative flex items-center" title={t('language')}>
                        <Languages size={16} className="absolute start-2 z-10 text-muted pointer-events-none" />
                        <Select
                            value={lang}
                            onChange={(e) => setLang(e.target.value as LanguageCode)}
                            aria-label={t('language')}
                            className="ps-7 py-1.5 text-sm max-w-[10.5rem]"
                            data-testid="language-select"
                        >
                            {LANGUAGES.map((l) => <option key={l.code} value={l.code}>{l.name}</option>)}
                        </Select>
                    </label>
                    {!isDesktop && (
                        <ExternalLink href={RELEASES_URL} className="hidden md:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-accent/40 text-accent text-sm font-medium hover:bg-accent/10">
                            <Download size={15} /> {t('downloadApp')}
                        </ExternalLink>
                    )}
                    <button onClick={() => setHelpOpen(true)} title={t('help')} aria-label={t('help')} className="p-2 rounded-lg text-muted hover:text-fg hover:bg-raised">
                        <CircleHelp size={20} />
                    </button>
                    <button onClick={() => setSettingsOpen(true)} title={t('settings')} aria-label={t('settings')} className="p-2 rounded-lg text-muted hover:text-fg hover:bg-raised" data-testid="open-settings">
                        <SettingsIcon size={20} />
                    </button>
                </div>
            </header>

            <main className="flex-1 w-full max-w-5xl mx-auto px-4 sm:px-6 py-6 sm:py-8 flex flex-col gap-5">
                {!hasFiles && (
                    <div className="text-center pt-2 sm:pt-6">
                        <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-accent to-accent2 pb-1">
                            {t('heroTitle')}
                        </h2>
                        <p className="mt-3 text-muted max-w-2xl mx-auto">{isDesktop ? t('heroDescDesktop') : t('heroDescWeb')}</p>
                    </div>
                )}

                {isDesktop && engines && !engines.libreoffice && (
                    <div className="flex gap-3 items-start rounded-xl border border-warn/40 bg-warn/10 p-3 text-sm text-fg" data-testid="notice-office">
                        <TriangleAlert size={18} className="text-warn shrink-0 mt-0.5" />
                        <p>{isWindows ? t('noticeNoOfficeWindows') : t('noticeNoOfficeLinux')}</p>
                    </div>
                )}
                {missing && (
                    <div className="flex gap-3 items-start rounded-xl border border-danger/40 bg-danger/10 p-3 text-sm text-fg">
                        <TriangleAlert size={18} className="text-danger shrink-0 mt-0.5" />
                        <p>{t('noticeMissingTools', { tools: missing })}</p>
                    </div>
                )}

                <Dropzone
                    desktop={isDesktop}
                    nativeHover={nativeHover}
                    compact={hasFiles}
                    onFiles={addFiles}
                    onPickFiles={async () => addNativePaths(await desktop.pickFiles())}
                    onPickFolder={async () => {
                        const d = await desktop.pickFolder()
                        if (d) await addNativePaths([d])
                    }}
                />

                {!isDesktop && !hasFiles && (
                    <p className="flex gap-2 items-start justify-center text-xs text-muted max-w-2xl mx-auto text-center">
                        <Info size={14} className="shrink-0 mt-0.5" /> {t('noticeWeb')}
                    </p>
                )}

                {hasFiles && (
                    <section className="rounded-2xl border border-line overflow-hidden" data-testid="file-list">
                        <div className="flex items-center justify-between px-4 py-2.5 bg-raised/60 border-b border-line">
                            <h3 className="text-sm font-semibold text-fg">
                                {t('filesTitle')} <span className="text-muted font-normal">({jobs.length})</span>
                            </h3>
                            <button onClick={clear} disabled={busy} className="inline-flex items-center gap-1.5 text-xs text-muted hover:text-danger disabled:opacity-40">
                                <Trash2 size={14} /> {t('clearAll')}
                            </button>
                        </div>
                        <div className="divide-y divide-line">
                            {jobs.map((job) => (
                                <FileRow
                                    key={job.id}
                                    job={job}
                                    onTarget={(tg) => setTarget(job.id, tg)}
                                    onRemove={() => remove(job.id)}
                                    onCancel={() => cancel(job.id)}
                                    onRetry={() => retry(job.id)}
                                    onReveal={(p) => void desktop.reveal(p)}
                                />
                            ))}
                        </div>
                    </section>
                )}
            </main>

            {/* Barre d'actions */}
            {hasFiles && (
                <div className="sticky bottom-0 z-20 border-t border-line bg-surface/95 backdrop-blur">
                    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-3 flex flex-wrap items-center gap-3">
                        {isDesktop ? (
                            <button onClick={() => setSettingsOpen(true)} className="inline-flex items-center gap-2 min-w-0 text-sm text-muted hover:text-fg" title={t('change')}>
                                <FolderOutput size={16} className="shrink-0 text-accent" />
                                <span className="truncate" dir="auto">
                                    {outputDir ? t('outputInfoFolder', { path: outputDir }) : t('outputInfoBeside')}
                                </span>
                            </button>
                        ) : doneBlobs > 1 ? (
                            <button onClick={downloadAll} disabled={zipping} className="inline-flex items-center gap-2 px-3 py-2 rounded-lg border border-line text-sm text-fg hover:bg-raised disabled:opacity-50" data-testid="download-all">
                                {zipping ? <LoaderCircle size={16} className="animate-spin" /> : <Download size={16} />} {t('downloadAll')}
                            </button>
                        ) : <span />}
                        <div className="ms-auto flex items-center gap-3">
                            {finished > 0 && (
                                <span className="inline-flex items-center gap-1.5 text-sm text-muted tabular-nums" title={t('statusDone')}>
                                    <CircleCheck size={16} className="text-success" /> {finished}/{jobs.length}
                                </span>
                            )}
                            {busy && (
                                <button onClick={cancelAll} className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border border-line text-fg hover:bg-raised">
                                    <Square size={15} /> {t('cancelAll')}
                                </button>
                            )}
                            <button
                                onClick={convertAll}
                                disabled={convertible === 0}
                                className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-accent to-accent2 text-onaccent font-semibold shadow-lg shadow-accent/20 hover:brightness-110 active:scale-[0.98] transition disabled:opacity-40 disabled:cursor-not-allowed"
                                data-testid="convert-all"
                            >
                                {busy && convertible === 0 ? t('convertingBtn') : `${t('convertAll')}${convertible ? ` (${convertible})` : ''}`}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            <footer className="border-t border-line bg-surface/80 text-xs text-muted">
                <div className="max-w-5xl mx-auto px-4 sm:px-6 py-3 flex flex-wrap items-center justify-center sm:justify-between gap-x-4 gap-y-1">
                    <p>
                        {t('madeBy', { name: AUTHOR })} · <ExternalLink href={`mailto:${AUTHOR_EMAIL}`}>{AUTHOR_EMAIL}</ExternalLink>
                    </p>
                    <p className="flex items-center gap-3">
                        <span className="font-mono">v{APP_VERSION}</span>
                        <button onClick={() => setLegalOpen(true)} className="hover:text-fg hover:underline" data-testid="open-legal">{t('legal')}</button>
                        <span>GPL v3</span>
                        <ExternalLink href={REPO_URL}>{t('sourceCode')}</ExternalLink>
                    </p>
                </div>
            </footer>

            <HelpModal open={helpOpen} onClose={() => setHelpOpen(false)} desktop={isDesktop} />
            <LegalModal open={legalOpen} onClose={() => setLegalOpen(false)} desktop={isDesktop} />
            <SettingsModal
                open={settingsOpen}
                onClose={() => setSettingsOpen(false)}
                settings={settings}
                update={update}
                themes={themes}
                saveCustom={saveCustom}
                desktop={isDesktop}
                engines={engines}
                onPickOutput={pickOutput}
                onOpenLegal={() => { setSettingsOpen(false); setLegalOpen(true) }}
            />
        </div>
    )
}
