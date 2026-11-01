import { useState } from 'react'
import {
    CircleCheck, Download, File, FileArchive, FileAudio, FileImage, FileSpreadsheet, FileText, FileVideo,
    Folder, FolderOpen, LoaderCircle, Presentation, RotateCcw, Square, TriangleAlert, X,
} from 'lucide-react'
import { familyOf, label, type Group, type TargetOption } from '../formats/catalog'
import type { Job } from '../hooks/useJobs'
import { useI18n } from '../i18n'
import type { MessageKey } from '../i18n/locales/fr'
import type { Stage } from '../engines/types'
import { Select } from './Select'

/** Taille lisible dans la langue de l'interface (« 1,2 Mo », « 1.2 MB »…). */
export function formatSize(bytes: number, lang: string): string {
    // Les très petits fichiers sont aussi affichés en Ko (« 0,3 ko »).
    const units = ['kilobyte', 'megabyte', 'gigabyte', 'terabyte']
    let v = bytes / 1024
    let i = 0
    while (v >= 1024 && i < units.length - 1) { v /= 1024; i++ }
    try {
        return new Intl.NumberFormat(lang, { style: 'unit', unit: units[i], unitDisplay: 'short', maximumFractionDigits: v < 10 ? 1 : 0 }).format(v)
    } catch {
        return `${v.toFixed(v < 10 ? 1 : 0)} ${['KB', 'MB', 'GB', 'TB'][i]}`
    }
}

const ICONS = {
    video: FileVideo, audio: FileAudio, image: FileImage, svg: FileImage, text: FileText, markdown: FileText,
    pdf: FileText, spreadsheet: FileSpreadsheet, presentation: Presentation, archive: FileArchive, folder: Folder, other: File,
}

const GROUP_KEYS: Record<Group, MessageKey> = {
    video: 'groupVideo', audio: 'groupAudio', image: 'groupImage', document: 'groupDocument', archive: 'groupArchive',
}

const REASON_KEYS = {
    desktopOnly: 'reasonDesktopOnly', needsLibreOffice: 'reasonNeedsLibreOffice', missingTool: 'reasonMissingTool', tooBig: 'reasonTooBig',
} as const satisfies Record<string, MessageKey>

const STAGE_KEYS: Record<Stage, MessageKey> = {
    loadingEngine: 'stageLoadingEngine', media: 'stageMedia', extract: 'stageExtract', compress: 'stageCompress',
    office: 'stageOffice', officeFirstRun: 'stageOfficeFirstRun', reading: 'stageReading', saving: 'stageSaving',
    working: 'stageWorking', done: 'statusDone',
}

export const ERROR_KEYS: Record<string, MessageKey> = {
    cancelled: 'errCancelled', timeout: 'errTimeout', unsupported: 'errUnsupported', missingTool: 'errMissingTool',
    notFound: 'errNotFound', password: 'errPassword', empty: 'errEmpty', tool: 'errTool', engineLoad: 'errEngineLoad',
    decode: 'errDecode', tooBig: 'errTooBig',
}

function TargetSelect({ job, onChange, disabled }: { job: Job; onChange: (t: string) => void; disabled: boolean }) {
    const { t } = useI18n()
    if (!job.options.length || !job.target) {
        return <span className="text-xs text-muted italic">{t('noTarget')}</span>
    }
    const groups = new Map<Group, TargetOption[]>()
    for (const o of job.options) groups.set(o.group, [...(groups.get(o.group) ?? []), o])
    return (
        <Select
            aria-label={t('convertTo')}
            title={t('convertTo')}
            value={job.target}
            disabled={disabled}
            onChange={(e) => onChange(e.target.value)}
            className="text-sm ps-3 py-2 min-w-[7.5rem] max-w-[15rem]"
        >
            {[...groups.entries()].map(([g, opts]) => (
                <optgroup key={g} label={t(GROUP_KEYS[g])}>
                    {opts.map((o) => (
                        <option key={o.target} value={o.target} disabled={!o.engine}>
                            {label(o.target)}{o.reason ? ` — ${t(REASON_KEYS[o.reason])}` : ''}
                        </option>
                    ))}
                </optgroup>
            ))}
        </Select>
    )
}

interface RowProps {
    job: Job
    onTarget: (t: string) => void
    onRemove: () => void
    onCancel: () => void
    onRetry: () => void
    onReveal: (path: string) => void
}

export function FileRow({ job, onTarget, onRemove, onCancel, onRetry, onReveal }: RowProps) {
    const { t, lang } = useI18n()
    const [showDetail, setShowDetail] = useState(false)
    const Icon = ICONS[familyOf(job.name, job.isDir)]
    const busy = job.status === 'running' || job.status === 'queued'
    const pct = job.progress?.percent
    const iconBtn = 'p-2 rounded-lg transition-colors'

    return (
        <div
            className="p-3 sm:p-4 bg-surface"
            data-testid="file-row"
            data-status={job.status}
        >
            <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                <div className="flex items-center gap-3 min-w-0 flex-1">
                    <div className="w-10 h-10 shrink-0 rounded-xl bg-raised flex items-center justify-center text-accent">
                        <Icon size={20} />
                    </div>
                    <div className="min-w-0 flex-1 text-start">
                        <h4 className="font-medium text-fg truncate" title={job.name} dir="auto">{job.name}</h4>
                        <p className="text-xs text-muted">
                            {job.isDir ? `${t('folder')} · ` : ''}{formatSize(job.size, lang)}
                            {job.status === 'queued' && ` · ${t('statusQueued')}`}
                            {job.status === 'cancelled' && ` · ${t('statusCancelled')}`}
                        </p>
                    </div>
                </div>

                <div className="flex items-center gap-2 justify-end">
                    <span className="text-xs text-muted hidden md:inline">{t('convertTo')}</span>
                    <TargetSelect job={job} onChange={onTarget} disabled={busy} />
                    {job.status === 'running' || job.status === 'queued' ? (
                        <button onClick={onCancel} title={t('cancel')} aria-label={t('cancel')} className={`${iconBtn} text-muted hover:text-danger hover:bg-danger/10`}>
                            <Square size={18} />
                        </button>
                    ) : (
                        <button onClick={onRemove} title={t('remove')} aria-label={t('remove')} className={`${iconBtn} text-muted hover:text-danger hover:bg-danger/10`}>
                            <X size={18} />
                        </button>
                    )}
                </div>
            </div>

            {job.status === 'running' && (
                <div className="mt-3" data-testid="progress">
                    <div className="flex items-center gap-2 text-xs text-muted mb-1.5">
                        <LoaderCircle size={14} className="animate-spin text-accent" />
                        <span>{t(STAGE_KEYS[job.progress?.stage ?? 'working'])}</span>
                        {typeof pct === 'number' && <span className="ms-auto tabular-nums">{Math.round(pct * 100)} %</span>}
                    </div>
                    <div className="w-full bg-raised rounded-full h-1.5 overflow-hidden">
                        {typeof pct === 'number' ? (
                            <div className="bg-gradient-to-r from-accent to-accent2 h-1.5 rounded-full transition-all duration-300" style={{ width: `${Math.max(2, pct * 100)}%` }} />
                        ) : (
                            <div className="h-1.5 w-1/3 rounded-full bg-gradient-to-r from-accent to-accent2 animate-[arac-indeterminate_1.2s_ease-in-out_infinite]" />
                        )}
                    </div>
                </div>
            )}

            {job.status === 'done' && job.output && (
                <div className="mt-3 flex flex-wrap items-center gap-2 text-sm" data-testid="result">
                    <CircleCheck size={18} className="text-success shrink-0" />
                    <span className="text-fg/90 truncate min-w-0 flex-1" dir="auto" title={job.output.kind === 'path' ? job.output.path : job.output.name}>
                        {job.output.kind === 'path' ? t('savedIn', { path: job.output.path }) : job.output.name}
                        <span className="text-muted"> · {formatSize(job.output.kind === 'path' ? job.output.size : job.output.blob.size, lang)}</span>
                    </span>
                    {job.output.kind === 'blob' && job.url ? (
                        <a href={job.url} download={job.output.name} className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-accent/15 text-accent hover:bg-accent/25 font-medium" data-testid="download">
                            <Download size={16} /> {t('download')}
                        </a>
                    ) : job.output.kind === 'path' ? (
                        <button onClick={() => onReveal((job.output as { path: string }).path)} className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-accent/15 text-accent hover:bg-accent/25 font-medium">
                            <FolderOpen size={16} /> {t('showInFolder')}
                        </button>
                    ) : null}
                </div>
            )}

            {job.status === 'error' && job.error && (
                <div className="mt-3 flex flex-wrap items-center gap-2 p-2.5 rounded-xl bg-danger/10 border border-danger/30 text-danger text-sm" data-testid="error" data-code={job.error.code}>
                    <TriangleAlert size={18} className="shrink-0" />
                    <span className="flex-1 min-w-0">{t(ERROR_KEYS[job.error.code] ?? 'errTool', { tool: job.error.detail })}</span>
                    {job.error.detail && job.error.code !== 'missingTool' && (
                        <button onClick={() => setShowDetail((v) => !v)} className="text-xs underline opacity-80 hover:opacity-100">{t('details')}</button>
                    )}
                    <button onClick={onRetry} className="inline-flex items-center gap-1 px-2 py-1 rounded-lg hover:bg-danger/15 text-xs font-medium">
                        <RotateCcw size={14} /> {t('retry')}
                    </button>
                    {showDetail && (
                        <pre className="w-full mt-1 p-2 rounded-lg bg-bg/70 text-[11px] leading-snug text-muted whitespace-pre-wrap break-all max-h-40 overflow-auto" dir="ltr">
                            {job.error.detail}
                        </pre>
                    )}
                </div>
            )}
        </div>
    )
}
