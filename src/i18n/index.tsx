import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import fr, { type MessageKey, type Messages } from './locales/fr'
import en from './locales/en'
import es from './locales/es'
import pt from './locales/pt'
import it from './locales/it'
import tr from './locales/tr'
import az from './locales/az'
import uz from './locales/uz'
import kk from './locales/kk'
import tk from './locales/tk'
import ky from './locales/ky'
import tt from './locales/tt'
import ug from './locales/ug'
import { LANGUAGES, type LanguageCode } from './languages'

export const MESSAGES: Record<LanguageCode, Messages> = { fr, en, es, pt, it, tr, az, uz, kk, tk, ky, tt, ug }

interface I18n {
    lang: LanguageCode
    dir: 'ltr' | 'rtl'
    setLang: (l: LanguageCode) => void
    t: (key: MessageKey, vars?: Record<string, string | number>) => string
}

const Ctx = createContext<I18n | null>(null)

export function I18nProvider({ initial, onChange, children }: {
    initial: LanguageCode
    onChange?: (l: LanguageCode) => void
    children: ReactNode
}) {
    const [lang, setLangState] = useState<LanguageCode>(initial)
    const dir = LANGUAGES.find((l) => l.code === lang)?.dir ?? 'ltr'

    useEffect(() => {
        document.documentElement.lang = lang
        document.documentElement.dir = dir
    }, [lang, dir])

    const setLang = useCallback((l: LanguageCode) => {
        setLangState(l)
        onChange?.(l)
    }, [onChange])

    const t = useCallback((key: MessageKey, vars?: Record<string, string | number>) => {
        let s = MESSAGES[lang][key] ?? fr[key] ?? key
        if (vars) for (const [k, v] of Object.entries(vars)) s = s.split(`{${k}}`).join(String(v))
        return s
    }, [lang])

    const value = useMemo(() => ({ lang, dir, setLang, t }), [lang, dir, setLang, t])
    return <Ctx.Provider value={value}>{children}</Ctx.Provider>
}

export function useI18n(): I18n {
    const v = useContext(Ctx)
    if (!v) throw new Error('useI18n hors de I18nProvider')
    return v
}
