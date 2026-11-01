import { useCallback, useRef, useState } from 'react'
import { Check, Copy, Download, Pencil, Trash2, Upload } from 'lucide-react'
import { Modal } from './Modal'
import { ThemeEditor } from './ThemeEditor'
import { Select } from './Select'
import { useI18n } from '../i18n'
import { LANGUAGES, type LanguageCode } from '../i18n/languages'
import { applyTheme, parseTheme, type Colors, type Theme } from '../theme'
import type { Settings } from '../settings'
import type { EnginesStatus } from '../engines/desktop'
import type { MessageKey } from '../i18n/locales/fr'
import { APP_VERSION, REPO_URL } from '../version'
import { AUTHOR, AUTHOR_EMAIL, ExternalLink } from './Credit'

const BUILTIN_NAMES: Record<string, MessageKey> = {
    turquoise: 'themeTurquoise', noir: 'themeNoir', sombre: 'themeSombre', clair: 'themeClair',
}

interface Props {
    open: boolean
    onClose: () => void
    settings: Settings
    update: (patch: Partial<Settings>) => void
    themes: Theme[]
    saveCustom: (themes: Theme[]) => void
    desktop: boolean
    engines: EnginesStatus | null
    onPickOutput: () => void
    onOpenLegal: () => void
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
    return (
        <section className="space-y-2.5">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-muted">{title}</h3>
            {children}
        </section>
    )
}

export function SettingsModal({ open, onClose, settings, update, themes, saveCustom, desktop, engines, onPickOutput, onOpenLegal }: Props) {
    const { t, lang, setLang } = useI18n()
    const [editing, setEditing] = useState<Theme | null>(null)
    const [importError, setImportError] = useState(false)
    const fileInput = useRef<HTMLInputElement>(null)
    const custom = themes.filter((th) => !th.builtin)
    const current = themes.find((th) => th.id === settings.theme) ?? themes[0]
    const colon = lang === 'fr' ? '\u202f: ' : ': '
    const themeName = (th: Theme) => (th.builtin ? t(BUILTIN_NAMES[th.id]) : th.name)

    const preview = useCallback((colors: Colors) => {
        if (editing) applyTheme({ ...editing, colors })
    }, [editing])

    const stopEditing = () => {
        setEditing(null)
        applyTheme(current)
    }

    const close = () => {
        if (editing) stopEditing()
        onClose()
    }

    const startNew = (from: Theme) => {
        setEditing({ id: `custom-${Date.now().toString(36)}`, name: `${themeName(from)} — ${t('newThemeName')}`, builtin: false, colors: { ...from.colors } })
    }

    const save = (name: string, colors: Colors) => {
        if (!editing) return
        const th: Theme = { ...editing, name, colors }
        const exists = custom.some((c) => c.id === th.id)
        saveCustom(exists ? custom.map((c) => (c.id === th.id ? th : c)) : [...custom, th])
        update({ theme: th.id })
        setEditing(null)
        applyTheme(th)
    }

    const remove = (th: Theme) => {
        saveCustom(custom.filter((c) => c.id !== th.id))
        if (settings.theme === th.id) update({ theme: 'turquoise' })
    }

    const exportTheme = (th: Theme) => {
        const blob = new Blob([JSON.stringify({ aracTheme: 1, name: th.name, colors: th.colors }, null, 2)], { type: 'application/json' })
        const a = document.createElement('a')
        a.href = URL.createObjectURL(blob)
        a.download = `${th.name.replace(/[^\p{L}\p{N} _-]/gu, '').trim() || 'theme'}.arac-theme.json`
        a.click()
        setTimeout(() => URL.revokeObjectURL(a.href), 2000)
    }

    const importTheme = async (file: File) => {
        setImportError(false)
        try {
            const th = parseTheme(JSON.parse(await file.text()))
            if (!th) throw new Error('invalid')
            saveCustom([...custom, th])
            update({ theme: th.id })
        } catch {
            setImportError(true)
        }
    }

    const engineLine = (label: string, tool: EnginesStatus['ffmpeg']) => (
        <li className="flex items-center justify-between gap-3 text-sm">
            <span className="text-fg">{label}</span>
            <span className={tool ? 'text-success' : 'text-danger'} title={tool?.path}>
                {tool ? t(tool.bundled ? 'engineBundled' : 'engineSystem') : t('engineMissing')}
            </span>
        </li>
    )

    return (
        <Modal open={open} onClose={close} title={t('settings')} wide>
            <div className="space-y-7">
                <Section title={t('language')}>
                    <div className="[&>span]:flex [&>span]:w-full">
                        <Select
                            value={lang}
                            onChange={(e) => setLang(e.target.value as LanguageCode)}
                            className="w-full ps-3 py-2"
                            data-testid="settings-language"
                        >
                            {LANGUAGES.map((l) => <option key={l.code} value={l.code}>{l.name}</option>)}
                        </Select>
                    </div>
                </Section>

                <Section title={t('theme')}>
                    {editing ? (
                        <ThemeEditor theme={editing} onPreview={preview} onSave={save} onCancel={stopEditing} />
                    ) : (
                        <>
                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2" data-testid="theme-list">
                                {themes.map((th) => {
                                    const active = th.id === settings.theme
                                    return (
                                        <button
                                            key={th.id}
                                            onClick={() => update({ theme: th.id })}
                                            className={`relative rounded-xl border p-2 text-start transition ${active ? 'border-accent ring-2 ring-accent/40' : 'border-line hover:border-accent/50'}`}
                                            style={{ background: th.colors.surface }}
                                            title={themeName(th)}
                                        >
                                            <div className="flex gap-1 mb-1.5">
                                                {[th.colors.bg, th.colors.accent, th.colors.accent2, th.colors.fg].map((c, i) => (
                                                    <span key={i} className="h-4 flex-1 rounded" style={{ background: c, border: `1px solid ${th.colors.line}` }} />
                                                ))}
                                            </div>
                                            <span className="block text-xs font-medium truncate" style={{ color: th.colors.fg }}>{themeName(th)}</span>
                                            {active && <Check size={14} className="absolute top-1 end-1" style={{ color: th.colors.accent }} />}
                                        </button>
                                    )
                                })}
                            </div>
                            <div className="flex flex-wrap gap-2">
                                <button onClick={() => startNew(current)} className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm rounded-lg bg-accent text-onaccent font-medium hover:brightness-110" data-testid="theme-customize">
                                    <Copy size={15} /> {t('customize')}
                                </button>
                                {!current.builtin && (
                                    <>
                                        <button onClick={() => setEditing(current)} className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm rounded-lg border border-line text-fg hover:bg-raised">
                                            <Pencil size={15} /> {t('editTheme')}
                                        </button>
                                        <button onClick={() => exportTheme(current)} className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm rounded-lg border border-line text-fg hover:bg-raised">
                                            <Download size={15} /> {t('exportTheme')}
                                        </button>
                                        <button onClick={() => remove(current)} className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm rounded-lg border border-line text-danger hover:bg-danger/10">
                                            <Trash2 size={15} /> {t('deleteTheme')}
                                        </button>
                                    </>
                                )}
                                <button onClick={() => fileInput.current?.click()} className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm rounded-lg border border-line text-fg hover:bg-raised">
                                    <Upload size={15} /> {t('importTheme')}
                                </button>
                                <input
                                    ref={fileInput}
                                    type="file"
                                    accept=".json,application/json"
                                    className="hidden"
                                    onChange={(e) => {
                                        const f = e.target.files?.[0]
                                        if (f) void importTheme(f)
                                        e.target.value = ''
                                    }}
                                />
                            </div>
                            {importError && <p className="text-sm text-danger">{t('importError')}</p>}
                        </>
                    )}
                </Section>

                {desktop && (
                    <Section title={t('outputTitle')}>
                        <label className="flex items-center gap-2 text-sm text-fg cursor-pointer">
                            <input type="radio" name="out" checked={settings.outputMode === 'beside'} onChange={() => update({ outputMode: 'beside' })} className="accent-[rgb(var(--c-accent))]" />
                            {t('outputBeside')}
                        </label>
                        <label className="flex items-center gap-2 text-sm text-fg cursor-pointer">
                            <input type="radio" name="out" checked={settings.outputMode === 'folder'} onChange={() => (settings.outputDir ? update({ outputMode: 'folder' }) : onPickOutput())} className="accent-[rgb(var(--c-accent))]" />
                            {t('outputFolder')}
                        </label>
                        <div className="flex items-center gap-2 ps-6">
                            <code className="flex-1 min-w-0 truncate rounded bg-raised border border-line px-2 py-1 text-xs text-muted" dir="ltr" title={settings.outputDir ?? ''}>
                                {settings.outputDir ?? '—'}
                            </code>
                            <button onClick={onPickOutput} className="px-3 py-1 text-sm rounded-lg border border-line text-fg hover:bg-raised">{t('chooseFolder')}</button>
                        </div>
                    </Section>
                )}

                {desktop && engines && (
                    <Section title={t('enginesTitle')}>
                        <ul className="space-y-1.5 rounded-xl border border-line bg-raised/50 p-3">
                            {engineLine('ffmpeg', engines.ffmpeg)}
                            {engineLine('7-Zip', engines.sevenzip)}
                            {engineLine('LibreOffice', engines.libreoffice)}
                        </ul>
                    </Section>
                )}

                <Section title={t('aboutTitle')}>
                    <div className="rounded-xl border border-line bg-raised/50 p-4 space-y-1.5 text-sm">
                        <p className="text-fg"><strong className="font-semibold">Araç</strong> — {t('appSubtitle')}</p>
                        <p className="text-muted">{t('version')} {APP_VERSION}</p>
                        <p className="text-fg">{t('madeBy', { name: AUTHOR })}</p>
                        <p className="text-muted">{t('contact')}{colon}<ExternalLink href={`mailto:${AUTHOR_EMAIL}`}>{AUTHOR_EMAIL}</ExternalLink></p>
                        <p className="text-muted">{t('license')}{colon}GNU GPL v3 · <ExternalLink href={REPO_URL}>{t('sourceCode')}</ExternalLink></p>
                        <p className="text-muted text-xs pt-1">{t('thirdParty')}</p>
                        <button onClick={onOpenLegal} className="text-accent hover:underline pt-1" data-testid="settings-legal">{t('legal')}</button>
                    </div>
                </Section>
            </div>
        </Modal>
    )
}
