import { createContext, useContext, useState, ReactNode } from 'react';

export type Language = 'fr' | 'en' | 'tr';

const translations = {
    fr: {
        appTitle: "ASHINA",
        appSubtitle: "",
        heroTitle: "Transcodez tous vos fichiers, partout",
        heroDesc: "Sélectionnez vos médias, documents, ou archives. La conversion se fait ultra-rapidement directement dans l'application.",
        selectedFiles: "Fichiers sélectionnés",
        download: "Télécharger",
        convertProgress: "Conversion en cours...",
        engineLoading: "Chargement du moteur de conversion...",
        engineInit: "Initialisation du moteur de conversion...",
        preparing: "Préparation du fichier...",
        convertBtn: "Convertir",
        convertingBtn: "En cours...",
        fileStr: "fichier",
        filesStr: "fichiers",
        helpTitle: "Comment ça marche ?",
        helpDesc1: "Ce Convertisseur Universel vous permet de changer le format de presque tous vos fichiers multimédias grâce à la puissance du WebAssembly (WASM).",
        privacyTitle: "Confidentialité totale",
        privacyDesc: "La version Web actuelle convertit vos images, vidéos et fichiers audio directement sur votre appareil. Aucun fichier n'est envoyé sur un serveur distant, garantissant une protection totale de votre vie privée.",
        nativeNote: "La conversion des documents complexes (PDF, Word) requiert l'installation de la version native Desktop (Option B).",
        settingsTitle: "Paramètres",
        darkMode: "Mode Sombre",
        darkModeDesc: "Basculez entre le thème clair et le thème sombre.",
        hwAccel: "Accélération Matérielle",
        hwAccelDesc: "Bientôt disponible dans l'application Bureau Native (Tauri).",
        version: "Version",
        madeWith: "Créé avec ❤️ par",
        formatError: "Format document/archive : Nécessitera la version finale Desktop (Option B). Le Web MVP supporte uniquement les médias.",
        failedLoad: "Échec du chargement de FFmpeg",
        conversionFailed: "La conversion a échoué",
        dropzoneTitle: "Glissez-déposez vos fichiers ici",
        dropzoneDesc: "ou cliquez pour parcourir votre appareil. Support des images, vidéos et audios.",
        downloadApp: "Télécharger l'App (Beta)"
    },
    en: {
        appTitle: "ASHINA",
        appSubtitle: "",
        heroTitle: "Transcode all your files, anywhere",
        heroDesc: "Select your media, documents, or archives. Conversion happens ultra-fast directly within the application.",
        selectedFiles: "Selected files",
        download: "Download",
        convertProgress: "Converting...",
        engineLoading: "Loading conversion engine...",
        engineInit: "Initializing conversion engine...",
        preparing: "Preparing file...",
        convertBtn: "Convert",
        convertingBtn: "Converting...",
        fileStr: "file",
        filesStr: "files",
        helpTitle: "How does it work?",
        helpDesc1: "This Universal Converter allows you to change the format of almost all your media files using the power of WebAssembly (WASM).",
        privacyTitle: "Total Privacy",
        privacyDesc: "The current Web version converts your images, videos, and audio files directly on your device. No files are sent to a remote server, ensuring total protection of your privacy.",
        nativeNote: "Conversion of complex documents (PDF, Word) requires the native Desktop version (Option B).",
        settingsTitle: "Settings",
        darkMode: "Dark Mode",
        darkModeDesc: "Toggle between light and dark themes.",
        hwAccel: "Hardware Acceleration",
        hwAccelDesc: "Coming soon in the Native Desktop app (Tauri).",
        version: "Version",
        madeWith: "Made with ❤️ by",
        formatError: "Document/archive format: Will require the final Desktop version (Option B). The Web MVP only supports media.",
        failedLoad: "Failed to load FFmpeg",
        conversionFailed: "Conversion failed",
        dropzoneTitle: "Drag and drop your files here",
        dropzoneDesc: "or click to browse your device. Supports images, videos and audio.",
        downloadApp: "Download App (Beta)"
    },
    tr: {
        appTitle: "ASHINA",
        appSubtitle: "",
        heroTitle: "Tüm dosyalarınızı dönüştürün, her yerde",
        heroDesc: "Medya, belge veya arşivlerinizi seçin. Dönüştürme işlemi doğrudan uygulama içinde ultra hızlı gerçekleşir.",
        selectedFiles: "Seçilen dosyalar",
        download: "İndir",
        convertProgress: "Dönüştürülüyor...",
        engineLoading: "Dönüştürme motoru yükleniyor...",
        engineInit: "Dönüştürme motoru başlatılıyor...",
        preparing: "Dosya hazırlanıyor...",
        convertBtn: "Dönüştür",
        convertingBtn: "Dönüştürülüyor...",
        fileStr: "dosya",
        filesStr: "dosya",
        helpTitle: "Nasıl çalışır?",
        helpDesc1: "Bu Evrensel Dönüştürücü, WebAssembly (WASM) gücünü kullanarak neredeyse tüm medya dosyalarınızın biçimini değiştirmenize olanak tanır.",
        privacyTitle: "Tam Gizlilik",
        privacyDesc: "Mevcut Web sürümü, resimlerinizi, videolarınızı ve ses dosyalarınızı doğrudan cihazınızda dönüştürür. Hiçbir dosya uzak sunucuya gönderilmez, böylece gizliliğiniz tamamen korunur.",
        nativeNote: "Karmaşık belgelerin (PDF, Word) dönüştürülmesi için yerel Masaüstü sürümü (Seçenek B) gereklidir.",
        settingsTitle: "Ayarlar",
        darkMode: "Karanlık Mod",
        darkModeDesc: "Aydınlık ve karanlık temalar arasında geçiş yapın.",
        hwAccel: "Donanım Hızlandırma",
        hwAccelDesc: "Yakında Yerel Masaüstü uygulamasında (Tauri).",
        version: "Sürüm",
        madeWith: "❤️ ile yapıldı",
        formatError: "Belge/arşiv formatı: Nihai Masaüstü sürümünü gerektirecek (Seçenek B). Web MVP yalnızca medyayı destekler.",
        failedLoad: "FFmpeg yüklenemedi",
        conversionFailed: "Dönüştürme başarısız oldu",
        dropzoneTitle: "Dosyalarınızı buraya sürükleyip bırakın",
        dropzoneDesc: "veya cihazınıza göz atmak için tıklayın. Resim, video ve ses dosyalarını destekler.",
        downloadApp: "Uygulamayı İndir (Beta)"
    }
};

export type TranslationKey = keyof typeof translations.fr;

interface LanguageContextType {
    language: Language;
    setLanguage: (lang: Language) => void;
    t: (key: TranslationKey) => string;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export function LanguageProvider({ children }: { children: ReactNode }) {
    const [language, setLanguage] = useState<Language>('fr');

    const t = (key: TranslationKey): string => {
        return translations[language][key] || translations['fr'][key];
    };

    return (
        <LanguageContext.Provider value={{ language, setLanguage, t }}>
            {children}
        </LanguageContext.Provider>
    );
}

export function useLanguage() {
    const context = useContext(LanguageContext);
    if (context === undefined) {
        throw new Error('useLanguage must be used within a LanguageProvider');
    }
    return context;
}
