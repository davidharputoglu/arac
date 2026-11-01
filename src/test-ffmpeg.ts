import { FFmpeg } from '@ffmpeg/ffmpeg';
// The critical fix: Let Vite bundle the worker as a native Module Worker URL
import ffmpegWorkerURL from '@ffmpeg/ffmpeg/worker?url';

const log = (msg: string) => {
    console.log(msg);
    const logDiv = document.getElementById('log');
    if (logDiv) logDiv.innerHTML += `<p>${msg}</p>`;
};

async function init() {
    log("1. Starting initialization test (Vite Module URL)...");
    const ffmpeg = new FFmpeg();

    ffmpeg.on('log', ({ message }) => {
        log(`[FFMPEG] ${message}`);
    });

    try {
        log("2. Calling ffmpeg.load() with Vite-compiled worker URL...");

        // Use the native raw URLs for WASM/Core, but the compilation-safe URL for Worker
        const base = window.location.origin;

        await ffmpeg.load({
            coreURL: `${base}/ffmpeg/ffmpeg-core.js`,
            wasmURL: `${base}/ffmpeg/ffmpeg-core.wasm`,
            classWorkerURL: ffmpegWorkerURL
        });

        log("3. SUCCESS! FFmpeg loaded.");
    } catch (e: any) {
        log(`ERROR: ${e.message}`);
        console.error(e);
    }
}

init();
