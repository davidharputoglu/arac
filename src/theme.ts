// Thèmes : 4 intégrés (Turquoise par défaut, Noir, Sombre, Clair) et des
// thèmes personnalisés que l'utilisateur crée, enregistre, exporte et importe.

export const TOKENS = ['bg', 'surface', 'raised', 'line', 'fg', 'muted', 'accent', 'accent2', 'onaccent', 'danger', 'success', 'warn'] as const
export type Token = (typeof TOKENS)[number]
export type Colors = Record<Token, string>

export interface Theme {
    id: string
    name: string
    builtin: boolean
    colors: Colors
}

export const BUILTIN_THEMES: Theme[] = [
    {
        id: 'turquoise', name: 'Turquoise', builtin: true,
        colors: {
            bg: '#06272b', surface: '#0b3439', raised: '#114148', line: '#1d5960',
            fg: '#e8fbf8', muted: '#94c7c1', accent: '#2dd4bf', accent2: '#22d3ee', onaccent: '#022c28',
            danger: '#f87171', success: '#34d399', warn: '#fbbf24',
        },
    },
    {
        id: 'noir', name: 'Noir', builtin: true,
        colors: {
            bg: '#000000', surface: '#0b0b0c', raised: '#161618', line: '#2a2a2e',
            fg: '#f5f5f5', muted: '#a1a1aa', accent: '#2dd4bf', accent2: '#38bdf8', onaccent: '#00201c',
            danger: '#f87171', success: '#4ade80', warn: '#facc15',
        },
    },
    {
        id: 'sombre', name: 'Sombre', builtin: true,
        colors: {
            bg: '#0f172a', surface: '#162033', raised: '#1e293b', line: '#334155',
            fg: '#e2e8f0', muted: '#94a3b8', accent: '#2dd4bf', accent2: '#818cf8', onaccent: '#052e2b',
            danger: '#f87171', success: '#34d399', warn: '#fbbf24',
        },
    },
    {
        id: 'clair', name: 'Clair', builtin: true,
        colors: {
            bg: '#f4f8f8', surface: '#ffffff', raised: '#eef4f4', line: '#d3e0df',
            fg: '#0f2a2e', muted: '#55716f', accent: '#0d9488', accent2: '#0891b2', onaccent: '#ffffff',
            danger: '#dc2626', success: '#059669', warn: '#b45309',
        },
    },
]

export const DEFAULT_THEME_ID = 'turquoise'

const HEX = /^#[0-9a-f]{6}$/i

export function hexToRgb(hex: string): [number, number, number] {
    const h = HEX.test(hex) ? hex.slice(1) : '000000'
    return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)]
}

function luminance(hex: string): number {
    const [r, g, b] = hexToRgb(hex).map((v) => {
        const c = v / 255
        return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4
    })
    return 0.2126 * r + 0.7152 * g + 0.0722 * b
}

/** Rapport de contraste WCAG (1 à 21). 4,5 est le minimum pour du texte. */
export function contrast(a: string, b: string): number {
    const [x, y] = [luminance(a), luminance(b)].sort((m, n) => n - m)
    return (x + 0.05) / (y + 0.05)
}

/** Paires à vérifier dans l'éditeur (texte lisible sur son fond). */
export const CONTRAST_PAIRS: [Token, Token, number][] = [
    ['fg', 'bg', 4.5], ['fg', 'surface', 4.5], ['muted', 'surface', 3], ['onaccent', 'accent', 4.5],
]

export function applyTheme(theme: Theme) {
    const root = document.documentElement
    for (const k of TOKENS) root.style.setProperty(`--c-${k}`, hexToRgb(theme.colors[k]).join(' '))
    const dark = luminance(theme.colors.bg) < 0.3
    root.style.colorScheme = dark ? 'dark' : 'light'
    root.dataset.theme = theme.id
}

/** Valide un thème importé (fichier .json). */
export function parseTheme(raw: unknown): Theme | null {
    if (!raw || typeof raw !== 'object') return null
    const o = raw as { name?: unknown; colors?: Record<string, unknown> }
    if (typeof o.name !== 'string' || !o.name.trim() || !o.colors || typeof o.colors !== 'object') return null
    const colors = {} as Colors
    for (const k of TOKENS) {
        const v = o.colors[k]
        if (typeof v !== 'string' || !HEX.test(v)) return null
        colors[k] = v.toLowerCase()
    }
    return { id: `custom-${Date.now().toString(36)}`, name: o.name.trim().slice(0, 40), builtin: false, colors }
}

const KEY = 'arac.customThemes'

export function loadCustomThemes(): Theme[] {
    try {
        const raw = JSON.parse(localStorage.getItem(KEY) ?? '[]') as unknown[]
        return raw.flatMap((r) => {
            const t = parseTheme(r)
            const id = (r as { id?: unknown }).id
            return t ? [{ ...t, id: typeof id === 'string' ? id : t.id }] : []
        })
    } catch {
        return []
    }
}

export function saveCustomThemes(themes: Theme[]) {
    try {
        localStorage.setItem(KEY, JSON.stringify(themes.map(({ id, name, colors }) => ({ id, name, colors }))))
    } catch {
        /* stockage indisponible */
    }
}
