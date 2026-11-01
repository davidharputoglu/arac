import { useRef, useState, type DragEvent } from 'react'
import { CloudUpload, FilePlus, FolderPlus } from 'lucide-react'
import { useI18n } from '../i18n'

interface DropzoneProps {
    desktop: boolean
    /** Survol par un glisser-déposer natif (bureau). */
    nativeHover: boolean
    compact: boolean
    onFiles: (files: File[]) => void
    onPickFiles: () => void
    onPickFolder: () => void
}

export function Dropzone({ desktop, nativeHover, compact, onFiles, onPickFiles, onPickFolder }: DropzoneProps) {
    const { t } = useI18n()
    const [hover, setHover] = useState(false)
    const input = useRef<HTMLInputElement>(null)
    const active = hover || nativeHover

    const onDrop = (e: DragEvent) => {
        e.preventDefault()
        setHover(false)
        if (!desktop && e.dataTransfer.files.length) onFiles(Array.from(e.dataTransfer.files))
    }
    const open = () => (desktop ? onPickFiles() : input.current?.click())

    return (
        <div
            className={`relative rounded-3xl border-2 border-dashed transition-all duration-200 flex flex-col items-center justify-center text-center cursor-pointer select-none
                ${compact ? 'p-5 sm:p-6' : 'p-8 sm:p-12'}
                ${active
                    ? 'border-accent bg-accent/10 scale-[1.01]'
                    : 'border-line bg-surface/60 hover:bg-surface hover:border-accent/60'}`}
            onDragOver={(e) => { e.preventDefault(); setHover(true) }}
            onDragLeave={(e) => { e.preventDefault(); setHover(false) }}
            onDrop={onDrop}
            onClick={open}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && open()}
            data-testid="dropzone"
        >
            <div className={`rounded-2xl transition-colors ${compact ? 'p-2.5 mb-2' : 'p-4 mb-4'} ${active ? 'bg-accent text-onaccent' : 'bg-raised text-accent'}`}>
                <CloudUpload size={compact ? 28 : 44} strokeWidth={1.5} />
            </div>
            <p className={`${compact ? 'text-base' : 'text-xl'} font-medium text-fg mb-1`}>
                {active ? t('dropRelease') : t('dropTitle')}
            </p>
            <p className="text-sm text-muted max-w-md">
                {desktop ? t('dropDescDesktop') : t('dropDescWeb')}
            </p>
            {desktop && (
                <div className="flex flex-wrap justify-center gap-2 mt-4" onClick={(e) => e.stopPropagation()}>
                    <button onClick={onPickFiles} className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm rounded-lg bg-raised hover:bg-accent/15 text-fg border border-line">
                        <FilePlus size={16} /> {t('addFiles')}
                    </button>
                    <button onClick={onPickFolder} className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm rounded-lg bg-raised hover:bg-accent/15 text-fg border border-line">
                        <FolderPlus size={16} /> {t('addFolder')}
                    </button>
                </div>
            )}
            <input
                ref={input}
                type="file"
                multiple
                className="hidden"
                onChange={(e) => {
                    if (e.target.files?.length) onFiles(Array.from(e.target.files))
                    e.target.value = ''
                }}
            />
        </div>
    )
}
