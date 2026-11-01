// Map extensions to their general categories
export type FileCategory = 'image' | 'video' | 'audio' | 'document' | 'archive' | 'package' | 'unknown';

export function getFileCategory(filename: string): FileCategory {
    const ext = filename.split('.').pop()?.toLowerCase() || '';

    const images = ['jpg', 'jpeg', 'png', 'gif', 'webp', 'bmp', 'tiff', 'svg', 'ico'];
    const videos = ['mp4', 'webm', 'ogg', 'avi', 'mov', 'mkv', 'flv', 'wmv', 'm4v'];
    const audios = ['mp3', 'wav', 'ogg', 'flac', 'aac', 'm4a', 'wma'];
    const documents = ['pdf', 'doc', 'docx', 'txt', 'rtf', 'odt', 'ods', 'odp', 'md', 'csv', 'xlsx', 'xls', 'ppt', 'pptx'];
    const archives = ['zip', 'rar', '7z', 'tar', 'gz', 'tgz', 'bz2', 'tbz2', 'xz', 'txz', 'zst', 'cbz'];
    const packages = ['deb', 'rpm', 'pkg', 'slp'];

    if (images.includes(ext)) return 'image';
    if (videos.includes(ext)) return 'video';
    if (audios.includes(ext)) return 'audio';
    if (documents.includes(ext)) return 'document';
    if (archives.includes(ext)) return 'archive';
    if (packages.includes(ext)) return 'package';

    return 'unknown';
}

// Map category to possible output formats
export const targetFormatsByCategory: Record<FileCategory, string[]> = {
    image: ['JPG', 'PNG', 'WEBP', 'GIF', 'BMP', 'TIFF', 'ICO'],
    video: ['MP4', 'WEBM', 'MKV', 'AVI', 'MOV', 'GIF'],
    audio: ['MP3', 'WAV', 'OGG', 'FLAC', 'AAC', 'M4A'],
    document: ['PDF', 'DOC', 'DOCX', 'PPT', 'PPTX', 'ODT', 'ODS', 'ODP', 'TXT', 'MD', 'HTML'], // Web MVP cannot fully process these yet without Tauri backend
    archive: ['ZIP', 'TAR', 'RAR', '7Z', 'GZ', 'TAR.GZ', 'TGZ', 'TAR.BZ2', 'TAR.XZ', 'TAR.ZST', 'CBZ'],
    package: ['DEB', 'RPM', 'TGZ', 'SLP', 'PKG'],
    unknown: ['ZIP', 'RAR', '7Z', 'TAR', 'GZ', 'TAR.GZ', 'CBZ']
};

export function getAvailableFormats(filename: string): string[] {
    const category = getFileCategory(filename);
    const ext = filename.split('.').pop()?.toUpperCase() || '';

    // Return all formats for the category except the original format
    return targetFormatsByCategory[category].filter(f => f !== ext);
}

export function getDefaultFormat(filename: string): string {
    const formats = getAvailableFormats(filename);
    return formats.length > 0 ? formats[0] : 'ZIP';
}
