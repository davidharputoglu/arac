// Liste des fichiers à convertir et file d'attente (une conversion à la fois).

import { useCallback, useEffect, useRef, useState } from 'react'
import { defaultTarget, familyOf, targetsFor, type Platform, type TargetOption } from '../formats/catalog'
import { runConversion } from '../engines/run'
import { CancelSignal, ConversionError, type ErrorCode, type Output, type ProgressInfo, type Source } from '../engines/types'
import type { PathInfo } from '../engines/desktop'

export type JobStatus = 'ready' | 'queued' | 'running' | 'done' | 'error' | 'cancelled'

export interface Job {
    id: string
    name: string
    size: number
    isDir: boolean
    source: Source
    options: TargetOption[]
    target: string | null
    status: JobStatus
    progress: ProgressInfo | null
    output?: Output
    /** Adresse de téléchargement (version web). */
    url?: string
    error?: { code: ErrorCode; detail: string }
}

let counter = 0
const newId = () => `job-${Date.now().toString(36)}-${(counter++).toString(36)}`

function withOptions(job: Job, platform: Platform): Job {
    const options = targetsFor(job.name, job.isDir, job.size, platform)
    const keep = job.target && options.some((o) => o.target === job.target && o.engine)
    return { ...job, options, target: keep ? job.target : defaultTarget(options) }
}

export function useJobs(platform: Platform, outputDir: string | null) {
    const [jobs, setJobs] = useState<Job[]>([])
    const signals = useRef(new Map<string, CancelSignal>())
    const running = useRef(false)
    const platformRef = useRef(platform)
    const outputRef = useRef(outputDir)
    outputRef.current = outputDir

    // Les outils détectés peuvent arriver après l'ajout des fichiers.
    useEffect(() => {
        platformRef.current = platform
        setJobs((js) => js.map((j) => (j.status === 'running' || j.status === 'queued' ? j : withOptions(j, platform))))
    }, [platform])

    const add = useCallback((items: { name: string; size: number; isDir: boolean; source: Source }[]) => {
        setJobs((js) => {
            const known = new Set(js.map((j) => (j.source.kind === 'path' ? j.source.path : '')))
            const fresh = items
                .filter((i) => i.source.kind !== 'path' || !known.has(i.source.path))
                .map((i) => withOptions({ ...i, id: newId(), options: [], target: null, status: 'ready', progress: null }, platformRef.current))
            return [...js, ...fresh]
        })
    }, [])

    const addFiles = useCallback((files: File[]) => {
        add(files.map((file) => ({ name: file.name, size: file.size, isDir: false, source: { kind: 'file', file } })))
    }, [add])

    const addPaths = useCallback((paths: PathInfo[]) => {
        add(paths.map((p) => ({ name: p.name, size: p.size, isDir: p.isDir, source: { kind: 'path', path: p.path } })))
    }, [add])

    const patch = useCallback((id: string, f: (j: Job) => Job) => {
        setJobs((js) => js.map((j) => (j.id === id ? f(j) : j)))
    }, [])

    const release = (j: Job) => {
        if (j.url) URL.revokeObjectURL(j.url)
    }

    const setTarget = useCallback((id: string, target: string) => {
        patch(id, (j) => {
            if (j.status === 'running' || j.status === 'queued') return { ...j, target }
            if (j.status !== 'ready') release(j)
            return { ...j, target, status: 'ready', output: undefined, url: undefined, error: undefined, progress: null }
        })
    }, [patch])

    const remove = useCallback((id: string) => {
        signals.current.get(id)?.cancel()
        setJobs((js) => {
            const j = js.find((x) => x.id === id)
            if (j) release(j)
            return js.filter((x) => x.id !== id)
        })
    }, [])

    const clear = useCallback(() => {
        signals.current.forEach((s) => s.cancel())
        setJobs((js) => {
            js.forEach(release)
            return []
        })
    }, [])

    const convertAll = useCallback(() => {
        setJobs((js) => js.map((j) => {
            const usable = j.target && j.options.some((o) => o.target === j.target && o.engine)
            return usable && (j.status === 'ready' || j.status === 'error' || j.status === 'cancelled')
                ? { ...j, status: 'queued', error: undefined, progress: null }
                : j
        }))
    }, [])

    const retry = useCallback((id: string) => {
        patch(id, (j) => ({ ...j, status: 'queued', error: undefined, progress: null }))
    }, [patch])

    const cancel = useCallback((id: string) => {
        const s = signals.current.get(id)
        if (s) s.cancel()
        else patch(id, (j) => (j.status === 'queued' ? { ...j, status: 'ready' } : j))
    }, [patch])

    const cancelAll = useCallback(() => {
        setJobs((js) => js.map((j) => (j.status === 'queued' ? { ...j, status: 'ready' } : j)))
        signals.current.forEach((s) => s.cancel())
    }, [])

    // Lance la conversion suivante dès que la précédente est finie.
    useEffect(() => {
        if (running.current) return
        const next = jobs.find((j) => j.status === 'queued')
        if (!next || !next.target) return
        const option = next.options.find((o) => o.target === next.target)
        if (!option?.engine) {
            patch(next.id, (j) => ({ ...j, status: 'error', error: { code: 'unsupported', detail: '' } }))
            return
        }
        running.current = true
        const signal = new CancelSignal()
        signals.current.set(next.id, signal)
        patch(next.id, (j) => ({ ...j, status: 'running', progress: { stage: 'working', percent: null } }))
        let last = 0
        const onProgress = (p: ProgressInfo) => {
            // Limite le nombre de rafraîchissements de l'écran.
            const now = performance.now()
            if (p.percent !== null && now - last < 100 && p.percent < 0.99) return
            last = now
            patch(next.id, (j) => (j.status === 'running' ? { ...j, progress: p } : j))
        }
        runConversion(
            { id: next.id, name: next.name, source: next.source, target: next.target, engine: option.engine, outputDir: outputRef.current },
            signal,
            onProgress,
        )
            .then((output) => {
                const url = output.kind === 'blob' ? URL.createObjectURL(output.blob) : undefined
                patch(next.id, (j) => ({ ...j, status: 'done', output, url, progress: null }))
            })
            .catch((e: unknown) => {
                const err = e instanceof ConversionError ? e : new ConversionError('tool', String(e))
                patch(next.id, (j) => ({
                    ...j,
                    status: err.code === 'cancelled' ? 'cancelled' : 'error',
                    error: { code: err.code, detail: err.detail },
                    progress: null,
                }))
            })
            .finally(() => {
                signals.current.delete(next.id)
                running.current = false
                // Relance l'effet pour le fichier suivant.
                setJobs((js) => [...js])
            })
    }, [jobs, patch])

    return { jobs, addFiles, addPaths, setTarget, remove, clear, convertAll, retry, cancel, cancelAll }
}

export { familyOf }
