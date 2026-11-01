import { useState } from 'react'
import { Modal } from './Modal'
import { ExternalLink, AUTHOR } from './Credit'
import { useI18n } from '../i18n'
import { THIRD_PARTY } from '../legal/thirdParty'
import { REPO_URL } from '../version'

function Block({ title, children }: { title: string; children: React.ReactNode }) {
    return (
        <section className="space-y-1.5">
            <h3 className="font-semibold text-fg">{title}</h3>
            {children}
        </section>
    )
}

export function LegalModal({ open, onClose, desktop }: { open: boolean; onClose: () => void; desktop: boolean }) {
    const { t } = useI18n()
    const [license, setLicense] = useState<string | null>(null)
    const [showLicense, setShowLicense] = useState(false)

    const toggleLicense = async () => {
        if (!license) {
            // Texte complet chargé seulement si on le demande (35 Ko).
            const mod = await import('../../LICENSE?raw')
            setLicense(mod.default)
        }
        setShowLicense((v) => !v)
    }

    const tools = THIRD_PARTY.filter((p) => p.scope === 'both' || p.scope === (desktop ? 'desktop' : 'web'))

    return (
        <Modal open={open} onClose={onClose} title={t('legal')} wide>
            <div className="space-y-6 text-sm text-fg/90 leading-relaxed" data-testid="legal">
                <p className="text-muted">Araç © 2026 {AUTHOR} — {t('madeBy', { name: AUTHOR })}</p>

                <Block title={t('legalLicenseTitle')}>
                    <p>{t('legalLicenseText')}</p>
                    <p className="text-muted">{t('legalLicenseOfficial')}</p>
                    <div className="flex flex-wrap gap-3 pt-1">
                        <button onClick={toggleLicense} className="text-accent hover:underline">
                            {showLicense ? t('hideLicense') : t('showLicense')}
                        </button>
                        <ExternalLink href={REPO_URL}>{t('sourceCode')}</ExternalLink>
                    </div>
                    {showLicense && license && (
                        <pre className="mt-2 max-h-72 overflow-auto rounded-lg border border-line bg-bg/70 p-3 text-[11px] leading-snug text-muted whitespace-pre-wrap" dir="ltr" data-testid="license-text">
                            {license}
                        </pre>
                    )}
                </Block>

                <Block title={t('legalDisclaimerTitle')}>
                    <p>{t('legalDisclaimerText')}</p>
                    <p className="rounded-lg border border-warn/40 bg-warn/10 px-3 py-2">{t('legalBackup')}</p>
                </Block>

                <Block title={t('legalUsageTitle')}>
                    <p>{t('legalUsageText')}</p>
                </Block>

                <Block title={t('legalPrivacyTitle')}>
                    <p>{t('legalPrivacyText')}</p>
                    {!desktop && <p className="text-muted">{t('legalPrivacyWeb')}</p>}
                </Block>

                <Block title={t('legalThirdPartyTitle')}>
                    <p>{t('legalThirdPartyText')}</p>
                    <ul className="divide-y divide-line rounded-xl border border-line" dir="ltr">
                        {tools.map((p) => (
                            <li key={p.name} className="flex flex-wrap items-baseline justify-between gap-x-3 px-3 py-2">
                                <span>
                                    <ExternalLink href={p.url}>{p.name}</ExternalLink>
                                    <span className="text-muted"> — {p.author}</span>
                                </span>
                                <span className="text-xs text-muted">{p.license}</span>
                            </li>
                        ))}
                    </ul>
                    {desktop && <p className="text-muted">{t('legalUnrar')}</p>}
                </Block>

                <Block title={t('legalTrademarksTitle')}>
                    <p>{t('legalTrademarksText')}</p>
                </Block>
            </div>
        </Modal>
    )
}
