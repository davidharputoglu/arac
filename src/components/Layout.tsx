import { useState, useEffect } from 'react';
import { Settings, HelpCircle, Info, Moon, Sun } from 'lucide-react';
import { Modal } from './Modal';
import { useLanguage } from '../contexts/LanguageContext';

interface LayoutProps {
    children: React.ReactNode;
}

export function Layout({ children }: LayoutProps) {
    const [isHelpOpen, setIsHelpOpen] = useState(false);
    const [isSettingsOpen, setIsSettingsOpen] = useState(false);
    const [isDarkMode, setIsDarkMode] = useState(true);
    const { language, setLanguage, t } = useLanguage();

    useEffect(() => {
        if (isDarkMode) {
            document.documentElement.classList.add('dark');
        } else {
            document.documentElement.classList.remove('dark');
        }
    }, [isDarkMode]);

    return (
        <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-800 dark:text-slate-200 selection:bg-teal-500/30 font-sans flex flex-col relative overflow-hidden transition-colors duration-300">
            {/* Background decorations */}
            <div className="absolute top-0 left-1/4 w-96 h-96 bg-teal-500/10 rounded-full blur-[128px] pointer-events-none" />
            <div className="absolute bottom-0 right-1/4 w-[30rem] h-[30rem] bg-indigo-500/10 rounded-full blur-[128px] pointer-events-none" />

            {/* Header */}
            <header className="h-16 flex items-center justify-between px-6 border-b border-slate-200 dark:border-white/5 bg-white/80 dark:bg-white/5 backdrop-blur-md z-10 transition-colors duration-300 relative">
                <div className="flex items-center gap-3 w-1/3">
                    <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-teal-400 to-indigo-500 flex items-center justify-center shadow-lg shadow-teal-500/20">
                        <svg viewBox="0 0 24 24" fill="none" className="w-5 h-5 text-white" stroke="currentColor" strokeWidth="2">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
                        </svg>
                    </div>
                    <div className="hidden sm:flex flex-col">
                        <h1 className="text-2xl font-black tracking-tight text-teal-600 dark:text-teal-400 leading-none">
                            ASHINA
                        </h1>
                        <span className="text-[10px] text-slate-500 dark:text-slate-400 font-bold uppercase tracking-widest mt-0.5">
                            Convertisseur Universel
                        </span>
                    </div>
                </div>

                <div className="absolute left-1/2 -translate-x-1/2 flex items-center gap-4">
                    <button className={`text-2xl hover:scale-110 transition-transform ${language === 'fr' ? 'drop-shadow-md grayscale-0 opacity-100' : 'grayscale opacity-50'} hover:grayscale-0 hover:opacity-100`} onClick={() => setLanguage('fr')} title="Français">🇫🇷</button>
                    <button className={`text-2xl hover:scale-110 transition-transform ${language === 'en' ? 'drop-shadow-md grayscale-0 opacity-100' : 'grayscale opacity-50'} hover:grayscale-0 hover:opacity-100`} onClick={() => setLanguage('en')} title="English">🇬🇧</button>
                    <button className={`text-2xl hover:scale-110 transition-transform ${language === 'tr' ? 'drop-shadow-md grayscale-0 opacity-100' : 'grayscale opacity-50'} hover:grayscale-0 hover:opacity-100`} onClick={() => setLanguage('tr')} title="Türkçe">🇹🇷</button>
                </div>

                <nav className="flex items-center justify-end gap-2 w-1/3">
                    <a
                        href="#"
                        className="hidden sm:inline-flex px-3 py-1.5 rounded-full bg-teal-500/10 text-teal-600 dark:text-teal-400 font-medium text-sm items-center gap-1.5 hover:bg-teal-500/20 transition-colors border border-teal-500/20"
                        title="Télécharger la version Desktop Native (Tauri)"
                        onClick={(e) => { e.preventDefault(); alert("Le lien de téléchargement final de la version Desktop (AppImage / DEB / RPM pour Fedora) sera ajouté ici quand elle sera prête à être distribuée !"); }}
                    >
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                        </svg>
                        {t('downloadApp')}
                    </a>

                    <button
                        onClick={() => setIsHelpOpen(true)}
                        className="p-2 rounded-md hover:bg-slate-200 dark:hover:bg-white/10 transition-colors text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
                        title="Aide"
                    >
                        <HelpCircle size={20} />
                    </button>
                    <button
                        onClick={() => setIsSettingsOpen(true)}
                        className="p-2 rounded-md hover:bg-slate-200 dark:hover:bg-white/10 transition-colors text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white lg:mr-4"
                        title="Paramètres"
                    >
                        <Settings size={20} />
                    </button>
                </nav>
            </header>

            {/* Main Content */}
            <main className="flex-1 flex flex-col z-10 p-6 md:p-12 overflow-y-auto w-full">
                <div className="max-w-4xl mx-auto w-full flex-1 flex flex-col">
                    {children}
                </div>
            </main>

            {/* Footer */}
            <footer className="h-14 mt-auto flex items-center justify-between px-6 border-t border-slate-200 dark:border-white/5 bg-white/80 dark:bg-slate-950/80 backdrop-blur-md z-10 w-full text-slate-500 dark:text-slate-400 text-sm transition-colors duration-300">
                <div className="w-1/3"></div>
                <div className="w-1/3 flex justify-center">
                    <p>
                        {t('madeWith')} <span className="text-teal-600 dark:text-teal-400 font-semibold tracking-wide">David HARPUTOGLU</span>
                    </p>
                </div>
                <div className="w-1/3 flex justify-end">
                    <span className="opacity-60 font-mono text-xs">v0.0.1 Beta</span>
                </div>
            </footer>

            {/* Modals */}
            <Modal isOpen={isHelpOpen} onClose={() => setIsHelpOpen(false)} title={t('helpTitle')}>
                <div className="space-y-4 text-slate-300">
                    <p>
                        {t('helpDesc1')}
                    </p>
                    <div className="bg-slate-800/50 p-4 rounded-xl border border-teal-500/20">
                        <h4 className="flex items-center gap-2 font-medium text-teal-400 mb-2">
                            <Info size={18} /> {t('privacyTitle')}
                        </h4>
                        <p className="text-sm">
                            {t('privacyDesc')}
                        </p>
                    </div>
                    <p className="text-sm text-slate-400 italic">
                        {t('nativeNote')}
                    </p>
                </div>
            </Modal>

            <Modal isOpen={isSettingsOpen} onClose={() => setIsSettingsOpen(false)} title={t('settingsTitle')}>
                <div className="space-y-6 text-slate-700 dark:text-slate-300">
                    <div className="space-y-2">
                        <div className="flex items-center justify-between">
                            <span className="font-medium text-slate-900 dark:text-slate-200 flex items-center gap-2">
                                {isDarkMode ? <Moon size={18} /> : <Sun size={18} />} {t('darkMode')}
                            </span>
                            <button
                                onClick={() => setIsDarkMode(!isDarkMode)}
                                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${isDarkMode ? 'bg-teal-500' : 'bg-slate-300'}`}
                            >
                                <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${isDarkMode ? 'translate-x-6' : 'translate-x-1'}`} />
                            </button>
                        </div>
                        <p className="text-xs text-slate-500">{t('darkModeDesc')}</p>
                    </div>

                    <div className="space-y-2">
                        <label className="flex items-center justify-between opacity-50 cursor-not-allowed">
                            <span className="font-medium text-slate-900 dark:text-slate-200">{t('hwAccel')}</span>
                            <div className="relative inline-flex h-6 w-11 items-center rounded-full bg-slate-700">
                                <span className="inline-block h-4 w-4 transform rounded-full bg-slate-400 transition translate-x-1" />
                            </div>
                        </label>
                        <p className="text-xs text-slate-500">{t('hwAccelDesc')}</p>
                    </div>

                    <div className="pt-4 border-t border-slate-800">
                        <p className="text-xs text-slate-500 text-center">{t('version')} 0.0.1 Beta</p>
                    </div>
                </div>
            </Modal>
        </div>
    );
}
