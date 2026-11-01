import React, { useState, useRef } from 'react';
import { UploadCloud } from 'lucide-react';
import { useLanguage } from '../contexts/LanguageContext';

interface DropzoneProps {
    onFilesSelected: (files: File[]) => void;
}

export function Dropzone({ onFilesSelected }: DropzoneProps) {
    const { t } = useLanguage();
    const [isDragActive, setIsDragActive] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleDragOver = (e: React.DragEvent) => {
        e.preventDefault();
        setIsDragActive(true);
    };

    const handleDragLeave = (e: React.DragEvent) => {
        e.preventDefault();
        setIsDragActive(false);
    };

    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault();
        setIsDragActive(false);
        if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
            onFilesSelected(Array.from(e.dataTransfer.files));
        }
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files.length > 0) {
            onFilesSelected(Array.from(e.target.files));
        }
    };

    return (
        <div
            className={`relative overflow-hidden rounded-3xl border-2 border-dashed transition-all duration-300 ease-out flex flex-col items-center justify-center p-8 sm:p-12
            ${isDragActive
                    ? 'border-teal-500 bg-teal-50/50 dark:bg-teal-500/10 scale-[1.02]'
                    : 'border-slate-300 dark:border-slate-700 bg-white/50 dark:bg-slate-800/30 hover:bg-slate-50 dark:hover:bg-slate-800/50 hover:border-slate-400 dark:hover:border-slate-500'}`}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
        >
            <div className="relative z-10 flex flex-col items-center text-center gap-4">
                <div className={`p-4 rounded-2xl transition-colors duration-300 ${isDragActive ? 'bg-teal-500 text-white' : 'bg-slate-200 dark:bg-slate-800 text-slate-500 dark:text-slate-400'}`}>
                    <UploadCloud size={48} strokeWidth={1.5} />
                </div>
                <div>
                    <p className="text-xl font-medium text-slate-700 dark:text-slate-200 mb-1">
                        {t('dropzoneTitle')}
                    </p>
                    <p className="text-sm text-slate-500 dark:text-slate-400 max-w-sm mx-auto">
                        {t('dropzoneDesc')}
                    </p>
                </div>
            </div>
            <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileChange}
                className="hidden"
                multiple
            />
        </div>
    );
}
