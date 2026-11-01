#!/bin/bash

# Script d'installation unifié pour Convertisseur Universel (Bureau)

echo "========================================================"
echo "  Installation de Convertisseur Universel (Bureau Beta) "
echo "========================================================"
echo ""

# Détection de la distribution
if [ -f /etc/os-release ]; then
    . /etc/os-release
    OS=$ID
    OS_LIKE=$ID_LIKE
else
    echo "Impossible de détecter la distribution Linux."
    exit 1
fi

echo "Distribution détectée : $PRETTY_NAME"
echo ""

# Variables pour simuler les téléchargements (à remplacer par les vrais URLs GitHub Releases plus tard)
APPIMAGE_URL="https://example.com/download/convertisseur-universel.AppImage"
DEB_URL="https://example.com/download/convertisseur-universel.deb"
RPM_URL="https://example.com/download/convertisseur-universel.rpm"

install_appimage() {
    echo "Téléchargement de la version AppImage..."
    # wget -q --show-progress -O Convertisseur-Universel.AppImage $APPIMAGE_URL
    echo "(Simulation de téléchargement de l'AppImage terminée)"
    echo "Rendre le fichier exécutable..."
    # chmod +x Convertisseur-Universel.AppImage
    echo "L'AppImage est prête ! Vous pouvez lancer le fichier 'Convertisseur-Universel.AppImage'."
}

install_deb() {
    echo "Téléchargement de la version .deb..."
    # wget -q --show-progress -O convertisseur.deb $DEB_URL
    echo "(Simulation de téléchargement du .deb terminée)"
    echo "Installation via apt/dpkg..."
    # sudo apt install ./convertisseur.deb
    echo "L'installation du paquet DEB est terminée ! L'application est disponible dans votre menu."
}

install_rpm() {
    echo "Téléchargement de la version .rpm..."
    # wget -q --show-progress -O convertisseur.rpm $RPM_URL
    echo "(Simulation de téléchargement du .rpm terminée)"
    echo "Installation via dnf/rpm..."
    # sudo dnf install ./convertisseur.rpm
    echo "L'installation du paquet RPM est terminée ! L'application est disponible dans votre menu."
}

# Logique de choix selon la distribution
if [[ "$OS" == "ubuntu" || "$OS" == "debian" || "$OS_LIKE" == *"debian"* || "$OS_LIKE" == *"ubuntu"* ]]; then
    echo "Votre système est basé sur Debian/Ubuntu."
    echo "Veuillez choisir le format à installer :"
    echo "  1) Version .deb (Recommandé, intégration système complète)"
    echo "  2) Version .AppImage (Portable, aucune installation système requise)"
    echo "  3) Annuler"
    read -p "Votre choix (1/2/3) : " choice

    case $choice in
        1) install_deb ;;
        2) install_appimage ;;
        3) echo "Installation annulée." ; exit 0 ;;
        *) echo "Choix invalide." ; exit 1 ;;
    esac

elif [[ "$OS" == "fedora" || "$OS" == "centos" || "$OS" == "rhel" || "$OS_LIKE" == *"fedora"* || "$OS_LIKE" == *"rhel"* ]]; then
    echo "Votre système est basé sur Fedora/Red Hat."
    echo "Veuillez choisir le format à installer :"
    echo "  1) Version .rpm (Recommandé, intégration système complète)"
    echo "  2) Version .AppImage (Portable, aucune installation système requise)"
    echo "  3) Annuler"
    read -p "Votre choix (1/2/3) : " choice

    case $choice in
        1) install_rpm ;;
        2) install_appimage ;;
        3) echo "Installation annulée." ; exit 0 ;;
        *) echo "Choix invalide." ; exit 1 ;;
    esac

else
    echo "Votre système n'est ni basé sur strict Debian ni sur Fedora."
    echo "Le format natif n'est peut-être pas disponible pour votre gestionnaire de paquets."
    echo "Veuillez choisir le format à installer :"
    echo "  1) Version .AppImage (Format Universel - Recommandé pour votre système)"
    echo "  2) Annuler"
    read -p "Votre choix (1/2) : " choice

    case $choice in
        1) install_appimage ;;
        2) echo "Installation annulée." ; exit 0 ;;
        *) echo "Choix invalide." ; exit 1 ;;
    esac
fi

echo ""
echo "Merci d'utiliser le Convertisseur Universel !"
