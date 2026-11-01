import { useEffect, type ReactNode } from 'react'
import { X } from 'lucide-react'
import { useI18n } from '../i18n'

interface ModalProps {
    open: boolean
    onClose: () => void
    title: string
    children: ReactNode
    wide?: boolean
}

export function Modal({ open, onClose, title, children, wide }: ModalProps) {
    const { t } = useI18n()
    useEffect(() => {
        if (!open) return
        const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
        window.addEventListener('keydown', onKey)
        return () => window.removeEventListener('keydown', onKey)
    }, [open, onClose])
    if (!open) return null
    return (
        <div
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
            onClick={onClose}
            role="presentation"
        >
            <div
                role="dialog"
                aria-modal="true"
                aria-label={title}
                className={`bg-surface border border-line text-fg w-full ${wide ? 'max-w-2xl' : 'max-w-lg'} max-h-[88vh] flex flex-col rounded-2xl shadow-2xl overflow-hidden text-start`}
                onClick={(e) => e.stopPropagation()}
            >
                <div className="flex items-center justify-between px-5 py-4 border-b border-line">
                    <h2 className="text-lg font-semibold text-fg">{title}</h2>
                    <button
                        onClick={onClose}
                        title={t('close')}
                        aria-label={t('close')}
                        className="p-1.5 rounded-lg text-muted hover:text-fg hover:bg-raised transition-colors"
                    >
                        <X size={20} />
                    </button>
                </div>
                <div className="p-5 overflow-y-auto">{children}</div>
            </div>
        </div>
    )
}
