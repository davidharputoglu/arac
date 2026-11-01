// Préférences de l'utilisateur, gardées dans le navigateur / la fenêtre.
// localStorage peut être indisponible (navigation privée, page intégrée) :
// tout est protégé et l'application marche sans.

import { isLanguage, type LanguageCode } from './i18n/languages'
import { DEFAULT_THEME_ID } from './theme'

export type OutputMode = 'beside' | 'folder'

export interface Settings {
    lang: LanguageCode | null
    /** Identifiant du thème actif (intégré ou personnalisé). */
    theme: string
    outputMode: OutputMode
    outputDir: string | null
}

const KEY = 'arac.settings'

export function loadSettings(): Settings {
    const d: Settings = { lang: null, theme: DEFAULT_THEME_ID, outputMode: 'beside', outputDir: null }
    try {
        const raw = localStorage.getItem(KEY)
        if (!raw) return d
        const s = JSON.parse(raw) as Partial<Settings>
        return {
            lang: isLanguage(s.lang) ? s.lang : null,
            theme: typeof s.theme === 'string' && s.theme ? s.theme : DEFAULT_THEME_ID,
            outputMode: s.outputMode === 'folder' ? 'folder' : 'beside',
            outputDir: typeof s.outputDir === 'string' ? s.outputDir : null,
        }
    } catch {
        return d
    }
}

export function saveSettings(s: Settings) {
    try {
        localStorage.setItem(KEY, JSON.stringify(s))
    } catch {
        /* stockage indisponible : réglages perdus à la fermeture */
    }
}
