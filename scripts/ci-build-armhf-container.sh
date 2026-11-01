#!/usr/bin/env bash
# Exécuté dans un conteneur Debian 32 bits (linux/arm/v7) par le workflow :
# installe les outils puis construit les paquets armhf.
set -euo pipefail
export DEBIAN_FRONTEND=noninteractive
apt-get update -qq
apt-get install -y -qq curl ca-certificates git build-essential pkg-config file xz-utils \
    libwebkit2gtk-4.1-dev libayatana-appindicator3-dev librsvg2-dev libssl-dev patchelf \
    libfuse2 squashfs-tools desktop-file-utils >/dev/null
# Node.js 22 (paquet officiel pour armv7)
NODE=22.12.0
curl -fsSL "https://nodejs.org/dist/v$NODE/node-v$NODE-linux-armv7l.tar.xz" | tar -xJ -C /opt
export PATH="/opt/node-v$NODE-linux-armv7l/bin:$PATH"
# Rust (dépendances gardées en cache entre deux fabrications : dossier .cargo-armhf)
export CARGO_HOME="$PWD/.cargo-armhf" RUSTUP_HOME=/opt/rustup
curl -fsSL https://sh.rustup.rs | sh -s -- -y --profile minimal --default-host armv7-unknown-linux-gnueabihf --no-modify-path
export PATH="$CARGO_HOME/bin:$PATH"
git config --global --add safe.directory "$PWD"
npm ci --no-audit --no-fund
scripts/ci-build-linux.sh armhf
