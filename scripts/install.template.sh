#!/usr/bin/env bash
# Araç — script d'installation pour Linux / Linux installer
# © 2026 David HARPUTOGLU — GNU GPL v3 ou ultérieure / or later
#
# Fichier généré par scripts/generate-legal.mts à partir de
# scripts/install.template.sh : modifier le modèle, pas ce fichier.
#
# Utilisation :
#   bash Arac_@VERSION@_install.sh
# Options (installation sans questions) :
#   --lang fr|en|es|pt|it|tr|az|uz|kk|tk|ky|tt|ug
#   --format deb|rpm|appimage    --dir DOSSIER (AppImage)
#   --docs yes|no                --accept (accepte la licence)
# Si les fichiers .deb/.rpm/.AppImage sont à côté du script, ils sont utilisés
# sans rien télécharger.

set -euo pipefail

ARAC_VERSION="@VERSION@"
REPO="davidharputoglu/arac"
BASE_URL="${ARAC_BASE_URL:-https://github.com/$REPO/releases/download/v$ARAC_VERSION}"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]:-$0}")" 2>/dev/null && pwd || pwd)"

OPT_LANG="" OPT_FORMAT="" OPT_DIR="" OPT_DOCS="" OPT_ACCEPT=0
while [ $# -gt 0 ]; do
    case "$1" in
        --lang) OPT_LANG="${2:-}"; shift 2 ;;
        --format) OPT_FORMAT="${2:-}"; shift 2 ;;
        --dir) OPT_DIR="${2:-}"; shift 2 ;;
        --docs) OPT_DOCS="${2:-}"; shift 2 ;;
        --accept) OPT_ACCEPT=1; shift ;;
        -h|--help) sed -n '2,16p' "$0"; exit 0 ;;
        *) echo "Option inconnue / unknown option: $1" >&2; exit 2 ;;
    esac
done

# --- Textes (générés) -------------------------------------------------------
@STRINGS@
# ---------------------------------------------------------------------------

# Lecture au clavier même quand le script est lancé par « curl … | bash ».
# Sans terminal (tests, automatisation), les réponses sont lues sur l'entrée standard.
ask() {
    local answer=""
    if (: </dev/tty) 2>/dev/null; then read -r answer </dev/tty || true; else read -r answer || true; fi
    printf '%s' "$answer"
}

# t CLÉ [nom valeur]… : texte traduit avec ses variables remplacées.
t() {
    local var="T_$1" s
    s="${!var}"
    shift
    while [ $# -gt 1 ]; do s="${s//\{$1\}/$2}"; shift 2; done
    printf '%s' "$s"
}

bold() { printf '\033[1m%s\033[0m\n' "$*"; }
info() { printf '\033[36m%s\033[0m\n' "$*"; }
fail() { printf '\033[31m%s\033[0m\n' "$*" >&2; exit 1; }

# menu « question » choix1 choix2… → numéro choisi (1, 2…) dans $CHOICE.
menu() {
    local prompt="$1"; shift
    local i=1 n
    echo
    bold "$prompt"
    for opt in "$@"; do echo "  $i) $opt"; i=$((i + 1)); done
    while true; do
        printf '%s [1]: ' "$(t choice)"
        n="$(ask)"
        n="${n:-1}"
        if [[ "$n" =~ ^[0-9]+$ ]] && [ "$n" -ge 1 ] && [ "$n" -le $# ]; then CHOICE="$n"; return; fi
        echo "$(t invalid)"
    done
}

# 1. Langue -----------------------------------------------------------------
CODES=(fr en es pt it tr az uz kk tk ky tt ug)
NAMES=("Français" "English" "Español" "Português" "Italiano" "Türkçe" "Azərbaycanca" "Oʻzbekcha" "Қазақша" "Türkmençe" "Кыргызча" "Татарча" "ئۇيغۇرچە")
LANG_CODE="$OPT_LANG"
if [ -z "$LANG_CODE" ]; then
    sys="${LC_ALL:-${LC_MESSAGES:-${LANG:-en}}}"
    sys="${sys%%[_.@-]*}"
    default=2
    for i in "${!CODES[@]}"; do [ "${CODES[$i]}" = "$sys" ] && default=$((i + 1)); done
    echo
    bold "Araç $ARAC_VERSION — Langue / Language / Dil"
    for i in "${!NAMES[@]}"; do echo "  $((i + 1))) ${NAMES[$i]}"; done
    printf '[%s]: ' "$default"
    n="$(ask)"
    n="${n:-$default}"
    [[ "$n" =~ ^[0-9]+$ ]] && [ "$n" -ge 1 ] && [ "$n" -le 13 ] || n="$default"
    LANG_CODE="${CODES[$((n - 1))]}"
fi
load_strings "$LANG_CODE" || load_strings en

# 2. Système et processeur ---------------------------------------------------
case "$(uname -m)" in
    x86_64|amd64) ARCH="x86_64" ;;
    aarch64|arm64) ARCH="aarch64" ;;
    armv7*|armv6*|armhf|arm) ARCH="armhf" ;;
    *) fail "$(t archUnsupported arch "$(uname -m)")" ;;
esac

# Lecture de /etc/os-release sans écraser les variables du script.
os_field() { [ -r /etc/os-release ] && (. /etc/os-release; eval "printf '%s' \"\${$1:-}\"") || true; }
OS_ID="$(os_field ID)"; OS_LIKE="$(os_field ID_LIKE)"; OS_NAME="$(os_field PRETTY_NAME)"
FAMILY="other"
case " ${OS_ID} ${OS_LIKE} " in
    *" debian "*|*" ubuntu "*|*" linuxmint "*|*" pop "*|*" elementary "*|*" zorin "*|*" kali "*|*" raspbian "*) FAMILY="debian" ;;
    *" fedora "*|*" rhel "*|*" centos "*|*" rocky "*|*" almalinux "*|*" suse "*|*" opensuse "*|*" opensuse-leap "*|*" opensuse-tumbleweed "*|*" sles "*|*" mageia "*|*" openmandriva "*|*" nobara "*) FAMILY="rpm" ;;
    *" arch "*|*" manjaro "*|*" endeavouros "*|*" garuda "*) FAMILY="arch" ;;
esac

echo
bold "$(t title version "$ARAC_VERSION")"
info "$(t detected distro "${OS_NAME:-${OS_ID:-Linux}}" arch "$ARCH")"

# 3. Licence et conditions ---------------------------------------------------
echo
bold "$(t acceptTitle)"
echo "Araç $ARAC_VERSION — © 2026 David HARPUTOGLU"
echo
printf '%s\n\n%s\n\n%s\n\n%s\n\n%s\n' "$T_legalLicenseText" "$T_legalLicenseOfficial" "$T_legalDisclaimerText" "$T_legalBackup" "$T_legalUsageText" | fold -s -w "${COLUMNS:-100}"
echo "https://www.gnu.org/licenses/gpl-3.0.html"
if [ "$OPT_ACCEPT" != 1 ]; then
    menu "$(t accept)" "$(t yes)" "$(t no)"
    [ "$CHOICE" = 1 ] || { echo "$(t cancelled)"; exit 0; }
fi

# 4. Format d'installation selon la distribution ----------------------------
FORMATS=()
case "$FAMILY" in
    debian) FORMATS=(deb appimage) ;;
    rpm) FORMATS=(rpm appimage) ;;
    *) FORMATS=(appimage) ;;
esac
FORMAT="$OPT_FORMAT"
if [ -z "$FORMAT" ]; then
    labels=()
    for f in "${FORMATS[@]}"; do
        case "$f" in deb) labels+=("$(t fmtDeb)") ;; rpm) labels+=("$(t fmtRpm)") ;; appimage) labels+=("$(t fmtAppImage)") ;; esac
    done
    labels+=("$(t cancel)")
    menu "$(t chooseFormat)" "${labels[@]}"
    [ "$CHOICE" -le "${#FORMATS[@]}" ] || { echo "$(t cancelled)"; exit 0; }
    FORMAT="${FORMATS[$((CHOICE - 1))]}"
fi

case "$FORMAT" in
    deb) FILE="Arac_${ARAC_VERSION}_linux_${ARCH}.deb" ;;
    rpm) FILE="Arac_${ARAC_VERSION}_linux_${ARCH}.rpm" ;;
    appimage) FILE="Arac_${ARAC_VERSION}_linux_${ARCH}.AppImage" ;;
    *) fail "$(t invalid)" ;;
esac

SUDO=""
if [ "$(id -u)" -ne 0 ]; then SUDO="sudo"; fi

# 5. Récupération du fichier (à côté du script, sinon téléchargement) --------
WORK="$(mktemp -d)"
trap 'rm -rf "$WORK"' EXIT
if [ -f "$SCRIPT_DIR/$FILE" ]; then
    PKG="$SCRIPT_DIR/$FILE"
else
    PKG="$WORK/$FILE"
    URL="$BASE_URL/$FILE"
    info "$(t downloading file "$FILE")"
    if command -v curl >/dev/null 2>&1; then
        curl -fL --progress-bar -o "$PKG" "$URL" || fail "$(t downloadFailed url "$URL")"
    elif command -v wget >/dev/null 2>&1; then
        wget -q --show-progress -O "$PKG" "$URL" || fail "$(t downloadFailed url "$URL")"
    else
        fail "$(t noDownloader)"
    fi
fi

# 6. Installation -------------------------------------------------------------
info "$(t installing)"
[ -n "$SUDO" ] && [ "$FORMAT" != appimage ] && info "$(t needSudo)"
case "$FORMAT" in
    deb)
        if command -v apt-get >/dev/null 2>&1; then
            $SUDO apt-get install -y "$PKG" || fail "$(t failed)"
        else
            $SUDO dpkg -i "$PKG" || fail "$(t failed)"
        fi
        ;;
    rpm)
        if command -v dnf >/dev/null 2>&1; then $SUDO dnf install -y "$PKG" || fail "$(t failed)"
        elif command -v zypper >/dev/null 2>&1; then $SUDO zypper --non-interactive install --allow-unsigned-rpm "$PKG" || fail "$(t failed)"
        elif command -v yum >/dev/null 2>&1; then $SUDO yum install -y "$PKG" || fail "$(t failed)"
        else $SUDO rpm -Uvh "$PKG" || fail "$(t failed)"
        fi
        ;;
    appimage)
        DEST="$OPT_DIR"
        if [ -z "$DEST" ]; then
            echo
            printf '%s [%s]: ' "$(t appimageDir)" "$HOME/Applications"
            DEST="$(ask)"
            DEST="${DEST:-$HOME/Applications}"
        fi
        DEST="${DEST/#\~/$HOME}"
        mkdir -p "$DEST"
        TARGET="$DEST/Arac.AppImage"
        cp "$PKG" "$TARGET"
        chmod +x "$TARGET"
        # Sans FUSE 2, l'AppImage se lance en se décompressant d'abord.
        EXEC="\"$TARGET\""
        if ! { ldconfig -p 2>/dev/null | grep -q 'libfuse.so.2'; }; then EXEC="env APPIMAGE_EXTRACT_AND_RUN=1 \"$TARGET\""; fi
        ICON_DIR="$HOME/.local/share/icons/hicolor/128x128/apps"
        mkdir -p "$ICON_DIR" "$HOME/.local/share/applications"
        printf '%s' "$ICON_PNG_BASE64" | base64 -d > "$ICON_DIR/arac.png"
        cat > "$HOME/.local/share/applications/arac.desktop" <<DESKTOP
[Desktop Entry]
Type=Application
Name=Araç
Comment=Convertisseur universel de fichiers
Exec=$EXEC %F
Icon=arac
Terminal=false
Categories=Utility;AudioVideo;Office;
DESKTOP
        command -v update-desktop-database >/dev/null 2>&1 && update-desktop-database "$HOME/.local/share/applications" >/dev/null 2>&1 || true
        ;;
esac

# 7. Conversion de documents : LibreOffice -----------------------------------
has_office() {
    command -v soffice >/dev/null 2>&1 || command -v libreoffice >/dev/null 2>&1 \
        || ls /opt/libreoffice*/program/soffice >/dev/null 2>&1 \
        || { command -v flatpak >/dev/null 2>&1 && flatpak info org.libreoffice.LibreOffice >/dev/null 2>&1; }
}
if has_office; then
    info "$(t docsAlready)"
else
    DOCS="$OPT_DOCS"
    if [ -z "$DOCS" ]; then
        menu "$(t askDocs)" "$(t yes)" "$(t no)"
        [ "$CHOICE" = 1 ] && DOCS=yes || DOCS=no
    fi
    if [ "$DOCS" = yes ]; then
        info "$(t installing) LibreOffice"
        PKGS="libreoffice-writer libreoffice-calc libreoffice-impress libreoffice-draw"
        if command -v apt-get >/dev/null 2>&1; then $SUDO apt-get install -y $PKGS || info "$(t docsManual)"
        elif command -v dnf >/dev/null 2>&1; then $SUDO dnf install -y $PKGS || info "$(t docsManual)"
        elif command -v zypper >/dev/null 2>&1; then $SUDO zypper --non-interactive install $PKGS || info "$(t docsManual)"
        elif command -v pacman >/dev/null 2>&1; then $SUDO pacman -S --needed --noconfirm libreoffice-fresh || info "$(t docsManual)"
        elif command -v flatpak >/dev/null 2>&1; then flatpak install -y flathub org.libreoffice.LibreOffice || info "$(t docsManual)"
        else info "$(t docsManual)"
        fi
    fi
fi

# 8. Langue choisie, reprise par Araç au premier lancement -------------------
CONF="${XDG_CONFIG_HOME:-$HOME/.config}/arac"
mkdir -p "$CONF"
printf '%s' "$LANG_CODE" > "$CONF/install-language"

echo
if [ "$FORMAT" = appimage ]; then bold "$(t doneAppImage path "$TARGET")"; else bold "$(t done)"; fi
