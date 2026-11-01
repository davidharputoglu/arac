#!/usr/bin/env bash
# Construit les paquets Linux d'Araç (.deb, .rpm, .AppImage) pour le
# processeur de la machine (ou du conteneur) et les renomme.
#   scripts/ci-build-linux.sh x86_64|aarch64|armhf
# Utilisé par .github/workflows/release.yml ; marche aussi sur un PC Linux
# (Debian/Ubuntu) avec les dépendances de Tauri installées.
set -euo pipefail
ARCH="$1"
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"
VERSION="$(grep -oP "APP_VERSION = '\K[^']+" src/version.ts)"

scripts/prepare-linux.sh "$ARCH"
# Les AppImage de linuxdeploy doivent pouvoir tourner sans FUSE (conteneurs).
export APPIMAGE_EXTRACT_AND_RUN=1
# En ARM 32 bits, Tauri devine mal la cible (armv7-…-gnu, « armel ») : on la donne.
TARGET=()
B="src-tauri/target/release/bundle"
if [ "$ARCH" = armhf ]; then
    TARGET=(--target armv7-unknown-linux-gnueabihf)
    B="src-tauri/target/armv7-unknown-linux-gnueabihf/release/bundle"
fi
npx tauri build --bundles deb,rpm,appimage --config src-tauri/release-linux.json "${TARGET[@]}"

OUT="$ROOT/out"
mkdir -p "$OUT"
cp "$(ls $B/deb/*.deb | head -1)" "$OUT/Arac_${VERSION}_linux_${ARCH}.deb"
cp "$(ls $B/rpm/*.rpm | head -1)" "$OUT/Arac_${VERSION}_linux_${ARCH}.rpm"
cp "$(ls $B/appimage/*.AppImage | head -1)" "$OUT/Arac_${VERSION}_linux_${ARCH}.AppImage"
ls -la "$OUT"
