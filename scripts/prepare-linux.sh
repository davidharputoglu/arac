#!/usr/bin/env bash
# Prépare les outils fournis avec Araç pour Linux : ffmpeg et 7-Zip (7zz),
# versions statiques officielles, nommés comme Tauri l'attend.
#
#   scripts/prepare-linux.sh [x86_64|aarch64|armhf]   (par défaut : processeur actuel)
#   scripts/prepare-linux.sh --system                 copie ffmpeg/7z du système (tests)
#
# Résultat : src-tauri/binaries/arac-ffmpeg-<cible>, arac-7z-<cible>, licenses/
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
OUT="$ROOT/src-tauri/binaries"
mkdir -p "$OUT/licenses"

MODE="download"
ARCH=""
for a in "$@"; do
    case "$a" in
        --system) MODE="system" ;;
        *) ARCH="$a" ;;
    esac
done
if [ -z "$ARCH" ]; then
    case "$(uname -m)" in x86_64) ARCH=x86_64 ;; aarch64|arm64) ARCH=aarch64 ;; armv7*|armhf) ARCH=armhf ;; *) echo "Processeur inconnu"; exit 1 ;; esac
fi
case "$ARCH" in
    x86_64) TRIPLE=x86_64-unknown-linux-gnu; BTBN=linux64; SEVEN=linux-x64 ;;
    aarch64) TRIPLE=aarch64-unknown-linux-gnu; BTBN=linuxarm64; SEVEN=linux-arm64 ;;
    armhf) TRIPLE=armv7-unknown-linux-gnueabihf; BTBN=""; SEVEN=linux-arm ;;
    *) echo "Architecture non prise en charge : $ARCH"; exit 1 ;;
esac

if [ "$MODE" = system ]; then
    install -m 755 "$(command -v ffmpeg)" "$OUT/arac-ffmpeg-$TRIPLE"
    install -m 755 "$(command -v 7zz || command -v 7z || command -v 7za)" "$OUT/arac-7z-$TRIPLE"
    for d in ffmpeg 7zip p7zip-full; do
        [ -f "/usr/share/doc/$d/copyright" ] && cp "/usr/share/doc/$d/copyright" "$OUT/licenses/$d-copyright.txt"
    done
    ls "$OUT/licenses/"* >/dev/null 2>&1 || echo "Licences : voir THIRD-PARTY-NOTICES.md" > "$OUT/licenses/README.txt"
    echo "Outils du système copiés pour $TRIPLE (usage : tests uniquement)."
    exit 0
fi

WORK="$(mktemp -d)"
trap 'rm -rf "$WORK"' EXIT
GH=(-H "Accept: application/vnd.github+json")
[ -n "${GITHUB_TOKEN:-}" ] && GH+=(-H "Authorization: Bearer $GITHUB_TOKEN")

# URL du dernier fichier d'une release GitHub correspondant à un motif.
latest_asset() {
    curl -fsSL "${GH[@]}" "https://api.github.com/repos/$1/releases/$2" \
        | grep -o '"browser_download_url": *"[^"]*"' | cut -d'"' -f4 | grep -E "$3" | sort -V | tail -1
}

# ffmpeg ------------------------------------------------------------------------
if [ -n "$BTBN" ]; then
    URL="$(latest_asset BtbN/FFmpeg-Builds tags/latest "ffmpeg-n[0-9.]+-latest-$BTBN-gpl-[0-9.]+\.tar\.xz$")"
    [ -n "$URL" ] || URL="https://github.com/BtbN/FFmpeg-Builds/releases/download/latest/ffmpeg-master-latest-$BTBN-gpl.tar.xz"
else
    URL="https://johnvansickle.com/ffmpeg/releases/ffmpeg-release-armhf-static.tar.xz"
fi
echo "ffmpeg : $URL"
curl -fL --retry 3 -o "$WORK/ffmpeg.tar.xz" "$URL"
mkdir -p "$WORK/ffmpeg" && tar -xJf "$WORK/ffmpeg.tar.xz" -C "$WORK/ffmpeg"
FF="$(find "$WORK/ffmpeg" -type f -name ffmpeg | head -1)"
install -m 755 "$FF" "$OUT/arac-ffmpeg-$TRIPLE"
LIC="$(find "$WORK/ffmpeg" -maxdepth 3 -type f \( -iname 'LICENSE*' -o -iname 'GPL*.txt' \) | head -1)"
[ -n "$LIC" ] && cp "$LIC" "$OUT/licenses/ffmpeg-LICENSE.txt"

# 7-Zip ---------------------------------------------------------------------------
URL="$(latest_asset ip7z/7zip latest "7z[0-9]+-$SEVEN\.tar\.xz$")"
[ -n "$URL" ] || { echo "7-Zip introuvable pour $SEVEN"; exit 1; }
echo "7-Zip : $URL"
curl -fL --retry 3 -o "$WORK/7z.tar.xz" "$URL"
mkdir -p "$WORK/7z" && tar -xJf "$WORK/7z.tar.xz" -C "$WORK/7z"
install -m 755 "$WORK/7z/7zz" "$OUT/arac-7z-$TRIPLE"
[ -f "$WORK/7z/License.txt" ] && cp "$WORK/7z/License.txt" "$OUT/licenses/7-Zip-License.txt"

"$OUT/arac-ffmpeg-$TRIPLE" -hide_banner -version | head -1 || true
echo "Prêt : $OUT"
