import { useState, useEffect } from 'react';
import { Layout } from './components/Layout';
import { Dropzone } from './components/Dropzone';
import { FileType, X, Loader2, CheckCircle, AlertCircle } from 'lucide-react';
import { useConverter } from './hooks/useConverter';
import { getAvailableFormats, getDefaultFormat } from './utils/formats';
import { useLanguage } from './contexts/LanguageContext';
import { save } from '@tauri-apps/plugin-dialog';
import { writeFile } from '@tauri-apps/plugin-fs';
import { getCurrentWebview } from '@tauri-apps/api/webview';

function App() {
    const [files, setFiles] = useState<File[]>([]);
    const [targetFormats, setTargetFormats] = useState<Record<number, string>>({});
    const [conversionResults, setConversionResults] = useState<Record<number, { url: string, name: string }>>({});

    const { t } = useLanguage();
    const { status, progress, logMsg, errorMsg, convertFile } = useConverter();

    // Prevent Tauri/Webkit from intercepting global drag & drop events and opening the file instead of dropping it
    // Handle native Tauri drag events instead
    useEffect(() => {
        let unlisten: (() => void) | undefined;

        const setupTauriDrop = async () => {
            try {
                const isTauri = '__TAURI_INTERNALS__' in window;
                if (!isTauri) return;

                // Listen to native Tauri file drop events
                unlisten = await getCurrentWebview().onDragDropEvent((event) => {
                    if (event.payload.type === 'drop') {
                        const paths = event.payload.paths;
                        if (paths && paths.length > 0) {
                            // For Tauri drops, the webview doesn't get standard File objects
                            // We create mock File objects just enough to display the name and route to the converter
                            const newFiles = paths.map(path => {
                                const filename = path.split(/[/\\]/).pop() || 'unknown';
                                return new File([path], filename, { type: 'tauri/path' });
                            });
                            handleFilesSelected(newFiles);
                        }
                    }
                });
            } catch (err) {
                console.error("Failed to setup Tauri drop", err);
            }
        };

        setupTauriDrop();

        const preventDefault = (e: Event) => e.preventDefault();
        window.addEventListener('dragover', preventDefault, false);
        window.addEventListener('drop', preventDefault, false);

        return () => {
            window.removeEventListener('dragover', preventDefault);
            window.removeEventListener('drop', preventDefault);
            if (unlisten) unlisten();
        };
    }, []);

    const handleFilesSelected = (newFiles: File[]) => {
        setFiles(prev => {
            const updated = [...prev, ...newFiles];
            // Set dynamic default format based on file extension
            const newFormats = { ...targetFormats };
            updated.forEach((f, i) => {
                if (!newFormats[i]) newFormats[i] = getDefaultFormat(f.name);
            });
            setTargetFormats(newFormats);
            return updated;
        });
    };

    const removeFile = (indexToRemove: number) => {
        setFiles(files.filter((_, index) => index !== indexToRemove));
        const newFormats = { ...targetFormats };
        delete newFormats[indexToRemove];
        setTargetFormats(newFormats);
    };

    const handleDownload = async (index: number) => {
        const result = conversionResults[index];
        if (!result) return;

        try {
            const isTauri = '__TAURI_INTERNALS__' in window;
            if (isTauri) {
                const filePath = await save({ defaultPath: result.name });
                if (filePath) {
                    const response = await fetch(result.url);
                    const buffer = await response.arrayBuffer();
                    await writeFile(filePath, new Uint8Array(buffer));
                }
            } else {
                const link = document.createElement('a');
                link.href = result.url;
                link.download = result.name;
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);
            }
        } catch (err: unknown) {
            console.error("Save failed", err);
            if (err instanceof Error) {
                alert(`Erreur de téléchargement: ${err.message}`);
            } else if (typeof err === 'string') {
                alert(`Erreur système: ${err}`);
            } else {
                alert("Erreur de permission Tauri. Vérifiez la console distante.");
            }
        }
    };

    const handleConvertAll = async () => {
        for (let i = 0; i < files.length; i++) {
            if (!conversionResults[i]) {
                const format = targetFormats[i] || 'MP4';
                const result = await convertFile(files[i], format);
                if (result) {
                    setConversionResults(prev => ({ ...prev, [i]: { url: result.url, name: result.fileName } }));
                }
            }
        }
    };

    return (
        <Layout>
            <div className="flex flex-col gap-8 w-full max-w-3xl mx-auto mt-8">
                <header className="text-center mb-8">
                    <h2 className="text-4xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-teal-500 via-indigo-500 to-purple-600 dark:from-teal-400 dark:via-indigo-500 dark:to-purple-500 mb-4 tracking-tight">
                        {t('heroTitle')}
                    </h2>
                    <p className="text-slate-600 dark:text-slate-400 text-lg max-w-xl mx-auto">
                        {t('heroDesc')}
                    </p>
                </header>

                <Dropzone onFilesSelected={handleFilesSelected} />

                {files.length > 0 && (
                    <div className="flex flex-col gap-4 mt-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
                        <h3 className="text-xl font-semibold text-slate-800 dark:text-slate-200 flex items-center gap-2">
                            {t('selectedFiles')} ({files.length})
                        </h3>

                        <div className="grid gap-3">
                            {files.map((file, index) => (
                                <div key={index} className="flex flex-col sm:flex-row items-start sm:items-center justify-between p-4 rounded-2xl bg-white/60 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 backdrop-blur-sm group hover:border-slate-300 dark:hover:border-slate-600 transition-colors gap-4 sm:gap-0">
                                    <div className="flex items-center gap-4 w-full sm:w-auto">
                                        <div className="w-10 h-10 shrink-0 rounded-xl bg-slate-100 dark:bg-slate-700/50 flex items-center justify-center text-slate-500 dark:text-slate-300">
                                            <FileType size={20} />
                                        </div>
                                        <div className="min-w-0 flex-1">
                                            <h4 className="font-medium text-slate-700 dark:text-slate-200 truncate">
                                                {file.name}
                                            </h4>
                                            <p className="text-sm text-slate-500 dark:text-slate-400">
                                                {(file.size / 1024 / 1024).toFixed(2)} MB
                                            </p>
                                        </div>
                                    </div>

                                    <div className="flex items-center gap-3 w-full sm:w-auto justify-between sm:justify-end">
                                        {/* Placeholder dropdown for format selection */}
                                        <select
                                            value={targetFormats[index] || getDefaultFormat(file.name)}
                                            onChange={(e) => setTargetFormats(prev => ({ ...prev, [index]: e.target.value }))}
                                            className="bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-200 text-sm rounded-lg focus:ring-teal-500 focus:border-teal-500 block p-2 outline-none w-24"
                                        >
                                            {getAvailableFormats(file.name).map((fmt) => (
                                                <option key={fmt} value={fmt}>{fmt}</option>
                                            ))}
                                        </select>

                                        {conversionResults[index] ? (
                                            <button
                                                onClick={() => handleDownload(index)}
                                                className="p-2 text-teal-600 dark:text-teal-400 hover:text-teal-700 dark:hover:text-teal-300 hover:bg-teal-50 dark:hover:bg-teal-400/10 rounded-lg transition-colors flex items-center gap-1 text-sm font-medium"
                                            >
                                                <CheckCircle size={20} />
                                                <span className="hidden sm:inline">{t('download')}</span>
                                            </button>
                                        ) : (
                                            <button
                                                onClick={() => removeFile(index)}
                                                className="p-2 text-slate-400 dark:text-slate-500 hover:text-red-500 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-400/10 rounded-lg transition-colors"
                                                disabled={status === 'converting'}
                                            >
                                                <X size={20} />
                                            </button>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>

                        {(status === 'converting' || status === 'loading') && (
                            <div className="flex flex-col items-center justify-center p-6 bg-white/60 dark:bg-slate-800/50 rounded-2xl border border-teal-500/30">
                                <Loader2 className="w-8 h-8 text-teal-500 dark:text-teal-400 animate-spin mb-4" />
                                <p className="text-slate-700 dark:text-slate-200 font-medium">{status === 'loading' ? t('engineLoading') : t('convertProgress')}</p>
                                <div className="w-full max-w-md bg-slate-200 dark:bg-slate-700 rounded-full h-2.5 mt-4 overflow-hidden">
                                    <div className="bg-gradient-to-r from-teal-400 to-indigo-500 h-2.5 rounded-full transition-all duration-300" style={{ width: `${progress}%` }}></div>
                                </div>
                                <div className="mt-4 w-full max-w-md p-3 bg-slate-100 dark:bg-slate-900/80 rounded-lg border border-slate-200 dark:border-slate-700">
                                    <p className="text-xs text-slate-500 dark:text-slate-400 font-mono break-all text-center">
                                        {logMsg || 'Patientez...'}
                                    </p>
                                </div>
                            </div>
                        )}

                        {status === 'error' && (
                            <div className="flex items-center gap-3 p-4 bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/20 rounded-xl text-red-600 dark:text-red-400">
                                <AlertCircle size={20} className="shrink-0" />
                                <p className="text-sm">{errorMsg}</p>
                            </div>
                        )}

                        <div className="flex justify-end mt-4">
                            <button
                                onClick={handleConvertAll}
                                disabled={status === 'converting' || status === 'loading' || Object.keys(conversionResults).length === files.length}
                                className="px-6 py-3 bg-gradient-to-r from-teal-500 to-indigo-600 hover:from-teal-400 hover:to-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-medium rounded-xl shadow-lg shadow-teal-500/20 transform transition-all active:scale-95 flex items-center gap-2"
                            >
                                {status === 'converting' ? t('convertingBtn') : `${t('convertBtn')} ${files.length} ${files.length > 1 ? t('filesStr') : t('fileStr')}`}
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </Layout>
    );
}

export default App;
