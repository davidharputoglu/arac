import { defineConfig, type Plugin } from 'vite'
import react from '@vitejs/plugin-react'
import { copyFileSync, createReadStream, mkdirSync, statSync } from 'node:fs'
import { join, resolve } from 'node:path'

// Moteur ffmpeg (WebAssembly) pour la version web : copié depuis node_modules
// au lieu d'être gardé dans le dépôt (32 Mo).
const FFMPEG_DIR = resolve(__dirname, 'node_modules/@ffmpeg/core/dist/esm')
const FFMPEG_FILES = ['ffmpeg-core.js', 'ffmpeg-core.wasm']

function ffmpegCore(copy: boolean): Plugin {
    return {
        name: 'arac-ffmpeg-core',
        configureServer(server) {
            server.middlewares.use((req, res, next) => {
                const m = req.url?.match(/\/ffmpeg\/(ffmpeg-core\.(?:js|wasm))(\?.*)?$/)
                if (!m) return next()
                const file = join(FFMPEG_DIR, m[1])
                res.setHeader('Content-Type', m[1].endsWith('.wasm') ? 'application/wasm' : 'text/javascript')
                res.setHeader('Content-Length', statSync(file).size)
                createReadStream(file).pipe(res)
            })
        },
        writeBundle(options) {
            if (!copy || !options.dir) return
            const out = join(options.dir, 'ffmpeg')
            mkdirSync(out, { recursive: true })
            for (const f of FFMPEG_FILES) copyFileSync(join(FFMPEG_DIR, f), join(out, f))
        },
    }
}

export default defineConfig(({ mode }) => {
    const web = mode === 'web'
    return {
        // Chemins relatifs : la version web marche dans n'importe quel sous-dossier.
        base: './',
        plugins: [react(), ffmpegCore(web)],
        // web-assets/ contient embed.js (intégration dans une page) : version web seulement.
        publicDir: web || mode === 'development' ? 'web-assets' : false,
        build: {
            outDir: web ? 'dist-web' : 'dist',
            emptyOutDir: true,
            target: 'es2021',
            chunkSizeWarningLimit: 1200,
        },
        clearScreen: false,
        server: {
            port: 1420,
            strictPort: true,
            watch: { ignored: ['**/src-tauri/**'] },
        },
        optimizeDeps: {
            exclude: ['@ffmpeg/ffmpeg', '@ffmpeg/util'],
        },
    }
})

