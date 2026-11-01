import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App'
import './index.css'
import { I18nProvider } from './i18n'
import { isLanguage, pickInitialLanguage, type LanguageCode } from './i18n/languages'
import { isDesktop, initialLanguage } from './engines/desktop'
import { loadSettings, saveSettings } from './settings'
import { BUILTIN_THEMES, applyTheme, loadCustomThemes } from './theme'

async function start() {
    const settings = loadSettings()
    // Paramètres d'intégration (embed.js) : ?lang=fr&theme=clair
    const params = new URLSearchParams(location.search)
    const forcedLang = params.get('lang')
    if (isLanguage(forcedLang)) settings.lang = forcedLang
    const forcedTheme = params.get('theme')
    if (forcedTheme && BUILTIN_THEMES.some((t) => t.id === forcedTheme)) settings.theme = forcedTheme
    // Thème appliqué avant le premier affichage (pas de flash de couleurs).
    const theme = [...BUILTIN_THEMES, ...loadCustomThemes()].find((t) => t.id === settings.theme) ?? BUILTIN_THEMES[0]
    applyTheme(theme)

    let lang: LanguageCode | null = settings.lang
    if (!lang) {
        let installer: string | null = null
        let system: string | null = null
        if (isDesktop) {
            // « langue de l'installateur|langue du système »
            const raw = await initialLanguage().catch(() => null)
            if (raw) [installer, system] = raw.split('|')
        }
        lang = pickInitialLanguage(installer, system, navigator.language)
        saveSettings({ ...settings, lang })
    }

    createRoot(document.getElementById('root')!).render(
        <StrictMode>
            <I18nProvider initial={lang}>
                <App initialSettings={{ ...settings, lang }} />
            </I18nProvider>
        </StrictMode>,
    )
}

void start()
