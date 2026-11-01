/** @type {import('tailwindcss').Config} */
// Toutes les couleurs viennent du thème actif (variables CSS « R G B »),
// ce qui permet les thèmes intégrés et les thèmes personnalisés.
const v = (name) => `rgb(var(--c-${name}) / <alpha-value>)`

export default {
    content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
    theme: {
        extend: {
            colors: {
                bg: v('bg'),
                surface: v('surface'),
                raised: v('raised'),
                line: v('line'),
                fg: v('fg'),
                muted: v('muted'),
                accent: v('accent'),
                accent2: v('accent2'),
                onaccent: v('onaccent'),
                danger: v('danger'),
                success: v('success'),
                warn: v('warn'),
            },
            keyframes: {
                'arac-indeterminate': {
                    '0%': { transform: 'translateX(-100%)' },
                    '100%': { transform: 'translateX(300%)' },
                },
            },
        },
    },
    plugins: [],
}
