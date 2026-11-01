import { useState, useRef, useCallback } from 'react';
import { FFmpeg } from '@ffmpeg/ffmpeg';
import { fetchFile } from '@ffmpeg/util';
import ffmpegWorkerURL from '@ffmpeg/ffmpeg/worker?url';
import JSZip from 'jszip';
import { useLanguage } from '../contexts/LanguageContext';
import { invoke } from '@tauri-apps/api/core';

export type ConversionStatus = 'idle' | 'loading' | 'converting' | 'success' | 'error';

export function useConverter() {
    const [status, setStatus] = useState<ConversionStatus>('idle');
    const [progress, setProgress] = useState(0);
    const [logMsg, setLogMsg] = useState('');
    const [errorMsg, setErrorMsg] = useState('');
    const { t } = useLanguage();

    const ffmpegRef = useRef(new FFmpeg());
    const messageRef = useRef('');

    const load = useCallback(async () => {
        if (ffmpegRef.current.loaded) return true;

        setStatus('loading');
        setProgress(0);
        setLogMsg(t('engineInit'));
        try {
            const ffmpeg = ffmpegRef.current;

            ffmpeg.on('log', ({ message }) => {
                messageRef.current = message;
                setLogMsg(message);
                console.log(message);
            });

            ffmpeg.on('progress', ({ progress }) => {
                setProgress(Math.round(progress * 100));
            });

            // The definitive fix for FFmpeg v0.12 in Vite:
            // Construct absolute URLs to prevent Vite from treating /ffmpeg/* 
            // as source code imports and throwing the "copied as-is during build" error.
            const baseURL = window.location.origin + '/ffmpeg';

            await ffmpeg.load({
                coreURL: `${baseURL}/ffmpeg-core.js`,
                wasmURL: `${baseURL}/ffmpeg-core.wasm`,
                classWorkerURL: ffmpegWorkerURL,
            });

            setStatus('idle');
            return true;
        } catch (err: any) {
            console.error(err);
            setErrorMsg(err.message || t('failedLoad'));
            setStatus('error');
            return false;
        }
    }, []);

    const convertFile = async (file: File, targetFormat: string) => {
        const ext = file.name.split('.').pop()?.toLowerCase() || '';
        const targetExt = targetFormat.toLowerCase();

        // --- Special case: ZIP <-> CBZ Conversion (No FFmpeg needed, purely JSZip renaming/re-wrapping) ---
        if ((ext === 'zip' && targetExt === 'cbz') || (ext === 'cbz' && targetExt === 'zip')) {
            setStatus('converting');
            setProgress(0);
            setLogMsg(t('preparing'));
            setErrorMsg('');

            try {
                // Verify the file is actually a valid zip structure
                const zip = new JSZip();
                await zip.loadAsync(file, {
                    // Report progress of loading/verifying original archive
                });
                setProgress(50);

                // It's valid, now we just re-export it with the new extension to ensure it works
                const content = await zip.generateAsync({ type: 'blob' }, (metadata) => {
                    setProgress(50 + Math.round(metadata.percent / 2));
                });

                const outputFileName = `converted_${file.name.replace(/\.[^/.]+$/, "")}.${targetExt}`;
                const url = URL.createObjectURL(content);

                setStatus('success');
                setProgress(100);

                return { url, fileName: outputFileName };
            } catch (err: any) {
                console.error('JSZip Error:', err);
                setStatus('error');
                setErrorMsg(t('conversionFailed'));
                return null;
            }
        }
        // --- End of Special case ---

        // --- Package Conversion (Alien via Tauri) ---
        const packages = ['deb', 'rpm', 'pkg', 'slp', 'tgz'];
        if (packages.includes(ext) && packages.includes(targetExt)) {
            setStatus('converting');
            setProgress(0);
            setLogMsg("Appel de l'utilitaire système (Alien)...");
            setErrorMsg('');

            try {
                // Determine if we are running in Tauri
                const isTauri = '__TAURI_INTERNALS__' in window;
                if (!isTauri) {
                    throw new Error(t('formatError'));
                }

                // Read file as byte array to send to Rust
                const buffer = await file.arrayBuffer();
                const fileData = Array.from(new Uint8Array(buffer));

                setProgress(20);

                // Call the Rust command
                const outputData = await invoke<number[]>('convert_alien', {
                    fileData,
                    inputExt: ext,
                    targetExt: targetExt
                });

                setProgress(90);

                // Convert received bytes back to Blob and URL
                const blob = new Blob([new Uint8Array(outputData)]);
                const outputFileName = `converted_${file.name.replace(/\.[^/.]+$/, "")}.${targetExt}`;
                const url = URL.createObjectURL(blob);

                setStatus('success');
                setProgress(100);

                return { url, fileName: outputFileName };

            } catch (err: any) {
                console.error('Tauri/Alien Error:', err);
                setStatus('error');
                // The error could be a string returned from Rust or a standard Error
                setErrorMsg(typeof err === 'string' ? err : (err.message || t('conversionFailed')));
                return null;
            }
        }
        // --- End of Package case ---

        const nonMedia = ['pdf', 'doc', 'docx', 'txt', 'rtf', 'odt', 'ods', 'odp', 'md', 'csv', 'xlsx', 'xls', 'ppt', 'pptx', 'zip', 'rar', '7z', 'tar', 'gz', 'tgz', 'bz2', 'tbz2', 'xz', 'txz', 'zst', 'tar.gz', 'tar.bz2', 'tar.xz', 'tar.zst', 'cbz', 'deb', 'rpm', 'pkg', 'slp'];

        if (nonMedia.includes(ext) || nonMedia.includes(targetExt)) {
            setStatus('error');
            setErrorMsg(t('formatError'));
            return null;
        }

        if (!ffmpegRef.current.loaded) {
            const loaded = await load();
            if (!loaded) return null;
        }

        setStatus('converting');
        setProgress(0);
        setLogMsg(t('preparing'));
        setErrorMsg('');

        try {
            const ffmpeg = ffmpegRef.current;
            const inputFileName = file.name;
            const outputFileName = `converted_${inputFileName.replace(/\.[^/.]+$/, "")}.${targetFormat.toLowerCase()}`;

            await ffmpeg.writeFile(inputFileName, await fetchFile(file));
            await ffmpeg.exec(['-i', inputFileName, outputFileName]);
            const data = await ffmpeg.readFile(outputFileName);

            await ffmpeg.deleteFile(inputFileName);
            await ffmpeg.deleteFile(outputFileName);

            const blob = new Blob([new Uint8Array(data as any)], { type: `video/${targetFormat.toLowerCase()}` });
            const url = URL.createObjectURL(blob);

            setStatus('success');
            setProgress(100);

            return { url, fileName: outputFileName };
        } catch (err: any) {
            console.error(err);
            setStatus('error');
            setErrorMsg(err.message || t('conversionFailed'));
            return null;
        }
    };

    return { status, progress, logMsg, errorMsg, load, convertFile };
}
