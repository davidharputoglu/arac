import { useEffect, useState } from 'react'
import { TriangleAlert } from 'lucide-react'
import { CONTRAST_PAIRS, TOKENS, contrast, type Colors, type Theme, type Token } from '../theme'
import { useI18n } from '../i18n'
import type { MessageKey } from '../i18n/locales/fr'

export const TOKEN_KEYS: Record<Token, MessageKey> = {
    bg: 'tokBg', surface: 'tokSurface', raised: 'tokRaised', line: 'tokLine', fg: 'tokFg', muted: 'tokMuted',
    accent: 'tokAccent', accent2: 'tokAccent2', onaccent: 'tokOnaccent', danger: 'tokDanger', success: 'tokSuccess', warn: 'tokWarn',
}

interface Props {
    theme: Theme
    /** Aperçu en direct pendant la modification. */
    onPreview: (colors: Colors) => void
    onSave: (name: string, colors: Colors) => void
    onCancel: () => void
}

export function ThemeEditor({ theme, onPreview, onSave, onCancel }: Props) {
    const { t } = useI18n()
    const [name, setName] = useState(theme.name)
    const [colors, setColors] = useState<Colors>(theme.colors)

    useEffect(() => onPreview(colors), [colors, onPreview])

    const set = (k: Token, v: string) => {
        if (/^#[0-9a-f]{6}$/i.test(v)) setColors((c) => ({ ...c, [k]: v.toLowerCase() }))
    }
    const warnings = CONTRAST_PAIRS
        .map(([a, b, min]) => ({ a, b, ratio: contrast(colors[a], colors[b]), min }))
        .filter((w) => w.ratio < w.min)

    return (
        <div className="space-y-4" data-testid="theme-editor">
            <label className="block">
                <span className="text-sm text-muted">{t('themeName')}</span>
                <input
                    value={name}
                    maxLength={40}
                    onChange={(e) => setName(e.target.value)}
                    className="mt-1 w-full rounded-lg bg-raised border border-line px-3 py-2 text-fg outline-none focus:ring-2 focus:ring-accent"
                />
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {TOKENS.map((k) => (
                    <label key={k} className="flex items-center gap-2 rounded-lg border border-line bg-raised/60 px-2 py-1.5">
                        <input
                            type="color"
                            value={colors[k]}
                            onChange={(e) => set(k, e.target.value)}
                            className="h-8 w-10 shrink-0 cursor-pointer rounded border border-line bg-transparent"
                            aria-label={t(TOKEN_KEYS[k])}
                        />
                        <span className="flex-1 min-w-0 text-sm text-fg truncate">{t(TOKEN_KEYS[k])}</span>
                        <input
                            defaultValue={colors[k]}
                            key={colors[k]}
                            onBlur={(e) => set(k, e.target.value.trim())}
                            className="w-20 rounded bg-bg/60 border border-line px-1.5 py-0.5 text-xs font-mono text-muted"
                            dir="ltr"
                            spellCheck={false}
                        />
                    </label>
                ))}
            </div>
            {warnings.map((w) => (
                <p key={w.a + w.b} className="flex items-start gap-2 text-sm text-warn">
                    <TriangleAlert size={16} className="mt-0.5 shrink-0" />
                    {t('contrastWarning', { ratio: w.ratio.toFixed(1), a: t(TOKEN_KEYS[w.a]), b: t(TOKEN_KEYS[w.b]) })}
                </p>
            ))}
            <div className="flex justify-end gap-2 pt-1">
                <button onClick={onCancel} className="px-4 py-2 rounded-lg border border-line text-fg hover:bg-raised">{t('cancel')}</button>
                <button
                    onClick={() => onSave(name.trim() || t('newThemeName'), colors)}
                    className="px-4 py-2 rounded-lg bg-accent text-onaccent font-medium hover:brightness-110"
                >
                    {t('save')}
                </button>
            </div>
        </div>
    )
}
