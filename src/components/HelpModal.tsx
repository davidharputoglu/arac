import { ShieldCheck } from 'lucide-react'
import { Modal } from './Modal'
import { useI18n } from '../i18n'
import { SUMMARY, label } from '../formats/catalog'
import type { MessageKey } from '../i18n/locales/fr'

const GROUPS: [keyof typeof SUMMARY, MessageKey][] = [
    ['video', 'groupVideo'], ['audio', 'groupAudio'], ['image', 'groupImage'], ['document', 'groupDocument'], ['archive', 'groupArchive'],
]

export function HelpModal({ open, onClose, desktop }: { open: boolean; onClose: () => void; desktop: boolean }) {
    const { t } = useI18n()
    return (
        <Modal open={open} onClose={onClose} title={t('help')} wide>
            <div className="space-y-6 text-sm">
                <section>
                    <h3 className="font-semibold text-fg mb-2">{t('helpHowTitle')}</h3>
                    <ol className="space-y-2">
                        {(['helpStep1', 'helpStep2', 'helpStep3'] as const).map((k, i) => (
                            <li key={k} className="flex gap-3">
                                <span className="h-6 w-6 shrink-0 rounded-full bg-accent text-onaccent text-xs font-bold flex items-center justify-center">{i + 1}</span>
                                <span className="text-fg/90 pt-0.5">{t(k)}</span>
                            </li>
                        ))}
                    </ol>
                </section>
                <section className="rounded-xl border border-accent/30 bg-accent/10 p-4">
                    <h3 className="flex items-center gap-2 font-semibold text-accent mb-1"><ShieldCheck size={18} /> {t('helpPrivacyTitle')}</h3>
                    <p className="text-fg/90">{desktop ? t('helpPrivacyDesktop') : t('helpPrivacyWeb')}</p>
                </section>
                <section>
                    <h3 className="font-semibold text-fg mb-2">{t('helpFormatsTitle')}</h3>
                    <div className="space-y-2">
                        {GROUPS.map(([g, key]) => (
                            <div key={g} className="flex flex-wrap items-baseline gap-1.5">
                                <span className="w-24 shrink-0 text-muted">{t(key)}</span>
                                {SUMMARY[g].map((e) => (
                                    <span key={e} className="rounded bg-raised border border-line px-1.5 py-0.5 text-[11px] font-mono text-fg/80">{label(e)}</span>
                                ))}
                            </div>
                        ))}
                    </div>
                    <p className="text-muted mt-3">{t('helpFormatsNote')}</p>
                    {!desktop && <p className="text-muted mt-2">{t('noticeWeb')}</p>}
                </section>
            </div>
        </Modal>
    )
}
