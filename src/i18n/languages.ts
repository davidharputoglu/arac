export type LanguageCode = 'fr' | 'en' | 'es' | 'pt' | 'it' | 'tr' | 'az' | 'uz' | 'kk' | 'tk' | 'ky' | 'tt' | 'ug'

export interface LanguageInfo {
    code: LanguageCode
    /** Nom dans la langue elle-même. */
    name: string
    dir: 'ltr' | 'rtl'
}

export const LANGUAGES: LanguageInfo[] = [
    { code: 'fr', name: 'Français', dir: 'ltr' },
    { code: 'en', name: 'English', dir: 'ltr' },
    { code: 'es', name: 'Español', dir: 'ltr' },
    { code: 'pt', name: 'Português', dir: 'ltr' },
    { code: 'it', name: 'Italiano', dir: 'ltr' },
    { code: 'tr', name: 'Türkçe', dir: 'ltr' },
    { code: 'az', name: 'Azərbaycanca', dir: 'ltr' },
    { code: 'uz', name: 'Oʻzbekcha', dir: 'ltr' },
    { code: 'kk', name: 'Қазақша', dir: 'ltr' },
    { code: 'tk', name: 'Türkmençe', dir: 'ltr' },
    { code: 'ky', name: 'Кыргызча', dir: 'ltr' },
    { code: 'tt', name: 'Татарча', dir: 'ltr' },
    { code: 'ug', name: 'ئۇيغۇرچە', dir: 'rtl' },
]

export const isLanguage = (c: string | null | undefined): c is LanguageCode =>
    !!c && LANGUAGES.some((l) => l.code === c)

/** Langues que l'installateur Windows ne propose pas (NSIS ne les connaît pas). */
const NOT_IN_INSTALLER: LanguageCode[] = ['az', 'kk', 'ky', 'tk', 'ug']

/** « fr-FR », « uz_Latn_UZ »… → code pris en charge, ou null. */
export function fromLocale(locale: string | null | undefined): LanguageCode | null {
    if (!locale) return null
    const base = locale.toLowerCase().split(/[-_.]/)[0]
    return isLanguage(base) ? base : null
}

/**
 * Première langue au démarrage : langue choisie à l'installation, sauf si le
 * système est dans une langue que l'installateur ne pouvait pas proposer.
 */
export function pickInitialLanguage(installer: string | null, system: string | null, browser: string | null): LanguageCode {
    const sys = fromLocale(system) ?? fromLocale(browser)
    if (sys && NOT_IN_INSTALLER.includes(sys)) return sys
    return fromLocale(installer) ?? sys ?? 'en'
}
