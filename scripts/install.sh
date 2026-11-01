#!/usr/bin/env bash
# Araç — script d'installation pour Linux / Linux installer
# © 2026 David HARPUTOGLU — GNU GPL v3 ou ultérieure / or later
#
# Fichier généré par scripts/generate-legal.mts à partir de
# scripts/install.template.sh : modifier le modèle, pas ce fichier.
#
# Utilisation :
#   bash Arac_0.1_install.sh
# Options (installation sans questions) :
#   --lang fr|en|es|pt|it|tr|az|uz|kk|tk|ky|tt|ug
#   --format deb|rpm|appimage    --dir DOSSIER (AppImage)
#   --docs yes|no                --accept (accepte la licence)
# Si les fichiers .deb/.rpm/.AppImage sont à côté du script, ils sont utilisés
# sans rien télécharger.

set -euo pipefail

ARAC_VERSION="0.1"
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
load_strings() {
    case "$1" in
        fr)
            T_title='Installation d’Araç {version}'
            T_detected='Système détecté : {distro} ({arch})'
            T_archUnsupported='Processeur non pris en charge : {arch}'
            T_acceptTitle='Licence et conditions'
            T_yes='Oui'
            T_no='Non'
            T_accept='Acceptez-vous ces conditions ?'
            T_chooseFormat='Comment voulez-vous installer Araç ?'
            T_fmtDeb='Paquet .deb (recommandé : intégration complète au système)'
            T_fmtRpm='Paquet .rpm (recommandé : intégration complète au système)'
            T_fmtAppImage='AppImage (portable, sans droits administrateur)'
            T_cancel='Annuler'
            T_choice='Votre choix'
            T_invalid='Choix invalide.'
            T_appimageDir='Dossier où placer l’AppImage'
            T_askDocs='Voulez-vous aussi convertir des documents (Word, Excel, PowerPoint, PDF) ? Cela installe LibreOffice.'
            T_docsAlready='LibreOffice est déjà installé : la conversion de documents est disponible.'
            T_docsManual='Installez LibreOffice avec le gestionnaire de paquets de votre distribution.'
            T_downloading='Téléchargement de {file}…'
            T_downloadFailed='Échec du téléchargement : {url}'
            T_installing='Installation…'
            T_needSudo='Le mot de passe administrateur (sudo) peut vous être demandé.'
            T_done='Araç est installé ! Lancez-le depuis le menu des applications.'
            T_doneAppImage='Araç est installé dans {path} et apparaît dans le menu des applications.'
            T_cancelled='Installation annulée.'
            T_failed='L’installation a échoué.'
            T_noDownloader='curl ou wget est nécessaire.'
            T_legalLicenseText='Araç est un logiciel libre : vous pouvez le redistribuer et le modifier selon les termes de la Licence publique générale GNU (GPL) publiée par la Free Software Foundation, version 3 ou (à votre choix) toute version ultérieure. Si vous redistribuez Araç, modifié ou non, vous devez aussi fournir son code source sous la même licence.'
            T_legalLicenseOfficial='Seul le texte original anglais de la licence fait foi ; il est fourni avec l’application (fichier LICENSE).'
            T_legalDisclaimerText='Araç est fourni « tel quel », dans l’espoir qu’il sera utile, mais SANS AUCUNE GARANTIE, expresse ou implicite, notamment de qualité marchande ou d’adéquation à un usage particulier. Dans les limites permises par la loi, l’auteur ne pourra être tenu responsable d’aucun dommage, ni d’aucune perte de données ou de fichiers liée à l’utilisation du logiciel.'
            T_legalBackup='Gardez toujours une copie de vos fichiers originaux et vérifiez les fichiers convertis avant de supprimer les originaux.'
            T_legalUsageText='Vous êtes seul responsable des fichiers que vous convertissez. Respectez les droits d’auteur et les licences des contenus. Araç ne doit pas servir à contourner une protection anticopie (DRM) ni à diffuser des œuvres sans autorisation.'
            ;;
        en)
            T_title='Araç {version} setup'
            T_detected='Detected system: {distro} ({arch})'
            T_archUnsupported='Unsupported processor: {arch}'
            T_acceptTitle='Licence and terms'
            T_yes='Yes'
            T_no='No'
            T_accept='Do you accept these terms?'
            T_chooseFormat='How do you want to install Araç?'
            T_fmtDeb='.deb package (recommended: full system integration)'
            T_fmtRpm='.rpm package (recommended: full system integration)'
            T_fmtAppImage='AppImage (portable, no administrator rights)'
            T_cancel='Cancel'
            T_choice='Your choice'
            T_invalid='Invalid choice.'
            T_appimageDir='Folder for the AppImage'
            T_askDocs='Do you also want to convert documents (Word, Excel, PowerPoint, PDF)? This installs LibreOffice.'
            T_docsAlready='LibreOffice is already installed: document conversion is available.'
            T_docsManual='Install LibreOffice with your distribution’s package manager.'
            T_downloading='Downloading {file}…'
            T_downloadFailed='Download failed: {url}'
            T_installing='Installing…'
            T_needSudo='You may be asked for the administrator (sudo) password.'
            T_done='Araç is installed! Start it from the applications menu.'
            T_doneAppImage='Araç is installed in {path} and appears in the applications menu.'
            T_cancelled='Installation cancelled.'
            T_failed='Installation failed.'
            T_noDownloader='curl or wget is required.'
            T_legalLicenseText='Araç is free software: you can redistribute it and/or modify it under the terms of the GNU General Public License (GPL) as published by the Free Software Foundation, either version 3 of the License or (at your option) any later version. If you redistribute Araç, modified or not, you must also provide its source code under the same licence.'
            T_legalLicenseOfficial='Only the original English text of the licence is legally binding; it is included with the application (LICENSE file).'
            T_legalDisclaimerText='Araç is provided “as is”, in the hope that it will be useful, but WITHOUT ANY WARRANTY, express or implied, including the warranties of MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. To the extent permitted by law, the author shall not be liable for any damage, or for any loss of data or files, arising from the use of the software.'
            T_legalBackup='Always keep a copy of your original files and check the converted files before deleting the originals.'
            T_legalUsageText='You alone are responsible for the files you convert. Respect the copyright and licences of the content. Araç must not be used to bypass copy protection (DRM) or to distribute works without permission.'
            ;;
        es)
            T_title='Instalación de Araç {version}'
            T_detected='Sistema detectado: {distro} ({arch})'
            T_archUnsupported='Procesador no compatible: {arch}'
            T_acceptTitle='Licencia y condiciones'
            T_yes='Sí'
            T_no='No'
            T_accept='¿Aceptas estas condiciones?'
            T_chooseFormat='¿Cómo quieres instalar Araç?'
            T_fmtDeb='Paquete .deb (recomendado: integración completa en el sistema)'
            T_fmtRpm='Paquete .rpm (recomendado: integración completa en el sistema)'
            T_fmtAppImage='AppImage (portátil, sin permisos de administrador)'
            T_cancel='Cancelar'
            T_choice='Tu elección'
            T_invalid='Opción no válida.'
            T_appimageDir='Carpeta para la AppImage'
            T_askDocs='¿Quieres convertir también documentos (Word, Excel, PowerPoint, PDF)? Se instalará LibreOffice.'
            T_docsAlready='LibreOffice ya está instalado: la conversión de documentos está disponible.'
            T_docsManual='Instala LibreOffice con el gestor de paquetes de tu distribución.'
            T_downloading='Descargando {file}…'
            T_downloadFailed='Error de descarga: {url}'
            T_installing='Instalando…'
            T_needSudo='Puede que se te pida la contraseña de administrador (sudo).'
            T_done='¡Araç está instalado! Ábrelo desde el menú de aplicaciones.'
            T_doneAppImage='Araç está instalado en {path} y aparece en el menú de aplicaciones.'
            T_cancelled='Instalación cancelada.'
            T_failed='La instalación ha fallado.'
            T_noDownloader='Se necesita curl o wget.'
            T_legalLicenseText='Araç es software libre: puedes redistribuirlo y modificarlo según los términos de la Licencia Pública General de GNU (GPL) publicada por la Free Software Foundation, versión 3 o (a tu elección) cualquier versión posterior. Si redistribuyes Araç, modificado o no, también debes proporcionar su código fuente bajo la misma licencia.'
            T_legalLicenseOfficial='Solo el texto original en inglés de la licencia tiene validez legal; se incluye con la aplicación (archivo LICENSE).'
            T_legalDisclaimerText='Araç se proporciona «tal cual», con la esperanza de que sea útil, pero SIN NINGUNA GARANTÍA, expresa o implícita, incluidas las de COMERCIABILIDAD o IDONEIDAD PARA UN FIN DETERMINADO. En la medida en que lo permita la ley, el autor no será responsable de ningún daño ni de ninguna pérdida de datos o archivos derivada del uso del software.'
            T_legalBackup='Conserva siempre una copia de tus archivos originales y comprueba los archivos convertidos antes de borrar los originales.'
            T_legalUsageText='Eres el único responsable de los archivos que conviertes. Respeta los derechos de autor y las licencias de los contenidos. Araç no debe usarse para eludir protecciones anticopia (DRM) ni para difundir obras sin autorización.'
            ;;
        pt)
            T_title='Instalação do Araç {version}'
            T_detected='Sistema detetado: {distro} ({arch})'
            T_archUnsupported='Processador não suportado: {arch}'
            T_acceptTitle='Licença e condições'
            T_yes='Sim'
            T_no='Não'
            T_accept='Aceita estas condições?'
            T_chooseFormat='Como pretende instalar o Araç?'
            T_fmtDeb='Pacote .deb (recomendado: integração completa no sistema)'
            T_fmtRpm='Pacote .rpm (recomendado: integração completa no sistema)'
            T_fmtAppImage='AppImage (portátil, sem direitos de administrador)'
            T_cancel='Cancelar'
            T_choice='A sua escolha'
            T_invalid='Escolha inválida.'
            T_appimageDir='Pasta para a AppImage'
            T_askDocs='Quer também converter documentos (Word, Excel, PowerPoint, PDF)? Isto instala o LibreOffice.'
            T_docsAlready='O LibreOffice já está instalado: a conversão de documentos está disponível.'
            T_docsManual='Instale o LibreOffice com o gestor de pacotes da sua distribuição.'
            T_downloading='A transferir {file}…'
            T_downloadFailed='Falha na transferência: {url}'
            T_installing='A instalar…'
            T_needSudo='Pode ser-lhe pedida a palavra-passe de administrador (sudo).'
            T_done='O Araç está instalado! Abra-o a partir do menu de aplicações.'
            T_doneAppImage='O Araç está instalado em {path} e aparece no menu de aplicações.'
            T_cancelled='Instalação cancelada.'
            T_failed='A instalação falhou.'
            T_noDownloader='É necessário o curl ou o wget.'
            T_legalLicenseText='O Araç é software livre: pode redistribuí-lo e modificá-lo nos termos da Licença Pública Geral GNU (GPL) publicada pela Free Software Foundation, versão 3 ou (à sua escolha) qualquer versão posterior. Se redistribuir o Araç, modificado ou não, também deve fornecer o seu código-fonte sob a mesma licença.'
            T_legalLicenseOfficial='Apenas o texto original em inglês da licença tem valor legal; é fornecido com a aplicação (ficheiro LICENSE).'
            T_legalDisclaimerText='O Araç é fornecido «tal como está», na esperança de que seja útil, mas SEM QUALQUER GARANTIA, expressa ou implícita, incluindo as de COMERCIALIZAÇÃO ou ADEQUAÇÃO A UM FIM ESPECÍFICO. Na medida permitida por lei, o autor não será responsável por quaisquer danos nem por qualquer perda de dados ou ficheiros resultante da utilização do software.'
            T_legalBackup='Guarde sempre uma cópia dos seus ficheiros originais e verifique os ficheiros convertidos antes de apagar os originais.'
            T_legalUsageText='É o único responsável pelos ficheiros que converte. Respeite os direitos de autor e as licenças dos conteúdos. O Araç não deve ser usado para contornar proteções anticópia (DRM) nem para divulgar obras sem autorização.'
            ;;
        it)
            T_title='Installazione di Araç {version}'
            T_detected='Sistema rilevato: {distro} ({arch})'
            T_archUnsupported='Processore non supportato: {arch}'
            T_acceptTitle='Licenza e condizioni'
            T_yes='Sì'
            T_no='No'
            T_accept='Accetti queste condizioni?'
            T_chooseFormat='Come vuoi installare Araç?'
            T_fmtDeb='Pacchetto .deb (consigliato: integrazione completa nel sistema)'
            T_fmtRpm='Pacchetto .rpm (consigliato: integrazione completa nel sistema)'
            T_fmtAppImage='AppImage (portatile, senza diritti di amministratore)'
            T_cancel='Annulla'
            T_choice='La tua scelta'
            T_invalid='Scelta non valida.'
            T_appimageDir='Cartella per l’AppImage'
            T_askDocs='Vuoi convertire anche i documenti (Word, Excel, PowerPoint, PDF)? Verrà installato LibreOffice.'
            T_docsAlready='LibreOffice è già installato: la conversione dei documenti è disponibile.'
            T_docsManual='Installa LibreOffice con il gestore di pacchetti della tua distribuzione.'
            T_downloading='Download di {file}…'
            T_downloadFailed='Download non riuscito: {url}'
            T_installing='Installazione…'
            T_needSudo='Potrebbe esserti chiesta la password di amministratore (sudo).'
            T_done='Araç è installato! Avvialo dal menu delle applicazioni.'
            T_doneAppImage='Araç è installato in {path} e compare nel menu delle applicazioni.'
            T_cancelled='Installazione annullata.'
            T_failed='Installazione non riuscita.'
            T_noDownloader='Serve curl o wget.'
            T_legalLicenseText='Araç è software libero: puoi ridistribuirlo e modificarlo secondo i termini della GNU General Public License (GPL) pubblicata dalla Free Software Foundation, versione 3 o (a tua scelta) qualsiasi versione successiva. Se ridistribuisci Araç, modificato o no, devi fornire anche il suo codice sorgente con la stessa licenza.'
            T_legalLicenseOfficial='Solo il testo originale inglese della licenza ha valore legale; è fornito con l’applicazione (file LICENSE).'
            T_legalDisclaimerText='Araç è fornito «così com’è», nella speranza che sia utile, ma SENZA ALCUNA GARANZIA, esplicita o implicita, comprese quelle di COMMERCIABILITÀ o IDONEITÀ A UNO SCOPO PARTICOLARE. Nei limiti consentiti dalla legge, l’autore non sarà responsabile di alcun danno, né di alcuna perdita di dati o file derivante dall’uso del software.'
            T_legalBackup='Conserva sempre una copia dei file originali e controlla i file convertiti prima di eliminare gli originali.'
            T_legalUsageText='Sei l’unico responsabile dei file che converti. Rispetta il diritto d’autore e le licenze dei contenuti. Araç non deve essere usato per aggirare protezioni anticopia (DRM) né per diffondere opere senza autorizzazione.'
            ;;
        tr)
            T_title='Araç {version} kurulumu'
            T_detected='Algılanan sistem: {distro} ({arch})'
            T_archUnsupported='Desteklenmeyen işlemci: {arch}'
            T_acceptTitle='Lisans ve koşullar'
            T_yes='Evet'
            T_no='Hayır'
            T_accept='Bu koşulları kabul ediyor musunuz?'
            T_chooseFormat='Araç’ı nasıl kurmak istersiniz?'
            T_fmtDeb='.deb paketi (önerilir: sisteme tam entegrasyon)'
            T_fmtRpm='.rpm paketi (önerilir: sisteme tam entegrasyon)'
            T_fmtAppImage='AppImage (taşınabilir, yönetici yetkisi gerekmez)'
            T_cancel='İptal'
            T_choice='Seçiminiz'
            T_invalid='Geçersiz seçim.'
            T_appimageDir='AppImage klasörü'
            T_askDocs='Belgeleri de (Word, Excel, PowerPoint, PDF) dönüştürmek ister misiniz? Bu, LibreOffice’i kurar.'
            T_docsAlready='LibreOffice zaten kurulu: belge dönüştürme kullanılabilir.'
            T_docsManual='LibreOffice’i dağıtımınızın paket yöneticisiyle kurun.'
            T_downloading='{file} indiriliyor…'
            T_downloadFailed='İndirme başarısız: {url}'
            T_installing='Kuruluyor…'
            T_needSudo='Yönetici (sudo) parolası istenebilir.'
            T_done='Araç kuruldu! Uygulamalar menüsünden başlatın.'
            T_doneAppImage='Araç {path} konumuna kuruldu ve uygulamalar menüsünde görünüyor.'
            T_cancelled='Kurulum iptal edildi.'
            T_failed='Kurulum başarısız oldu.'
            T_noDownloader='curl veya wget gereklidir.'
            T_legalLicenseText='Araç özgür bir yazılımdır: Özgür Yazılım Vakfı (Free Software Foundation) tarafından yayımlanan GNU Genel Kamu Lisansı’nın (GPL) 3. sürümü veya (tercihinize göre) daha sonraki herhangi bir sürümü koşulları altında yeniden dağıtabilir ve değiştirebilirsiniz. Araç’ı değiştirilmiş ya da değiştirilmemiş olarak yeniden dağıtırsanız, kaynak kodunu da aynı lisansla sağlamanız gerekir.'
            T_legalLicenseOfficial='Yalnızca lisansın İngilizce özgün metni hukuken geçerlidir; uygulamayla birlikte sunulur (LICENSE dosyası).'
            T_legalDisclaimerText='Araç, yararlı olacağı umuduyla “olduğu gibi” sunulur; ancak SATILABİLİRLİK veya BELİRLİ BİR AMACA UYGUNLUK dahil, açık ya da örtülü HİÇBİR GARANTİ verilmez. Yasaların izin verdiği ölçüde yazar, yazılımın kullanımından doğan hiçbir zarardan, veri ya da dosya kaybından sorumlu tutulamaz.'
            T_legalBackup='Asıl dosyalarınızın her zaman bir kopyasını saklayın ve asıllarını silmeden önce dönüştürülen dosyaları kontrol edin.'
            T_legalUsageText='Dönüştürdüğünüz dosyalardan yalnızca siz sorumlusunuz. İçeriklerin telif haklarına ve lisanslarına saygı gösterin. Araç kopya korumasını (DRM) aşmak veya eserleri izinsiz yaymak için kullanılmamalıdır.'
            ;;
        az)
            T_title='Araç {version} quraşdırılması'
            T_detected='Aşkar edilən sistem: {distro} ({arch})'
            T_archUnsupported='Dəstəklənməyən prosessor: {arch}'
            T_acceptTitle='Lisenziya və şərtlər'
            T_yes='Bəli'
            T_no='Xeyr'
            T_accept='Bu şərtləri qəbul edirsiniz?'
            T_chooseFormat='Araç-ı necə quraşdırmaq istəyirsiniz?'
            T_fmtDeb='.deb paketi (tövsiyə olunur: sistemə tam inteqrasiya)'
            T_fmtRpm='.rpm paketi (tövsiyə olunur: sistemə tam inteqrasiya)'
            T_fmtAppImage='AppImage (portativ, administrator hüquqları tələb olunmur)'
            T_cancel='Ləğv et'
            T_choice='Seçiminiz'
            T_invalid='Yanlış seçim.'
            T_appimageDir='AppImage üçün qovluq'
            T_askDocs='Sənədləri də (Word, Excel, PowerPoint, PDF) çevirmək istəyirsiniz? Bu, LibreOffice-u quraşdırır.'
            T_docsAlready='LibreOffice artıq quraşdırılıb: sənəd çevirmə mövcuddur.'
            T_docsManual='LibreOffice-u distributivinizin paket meneceri ilə quraşdırın.'
            T_downloading='{file} endirilir…'
            T_downloadFailed='Endirmə alınmadı: {url}'
            T_installing='Quraşdırılır…'
            T_needSudo='Administrator (sudo) şifrəsi soruşula bilər.'
            T_done='Araç quraşdırıldı! Onu tətbiqlər menyusundan işə salın.'
            T_doneAppImage='Araç {path} qovluğuna quraşdırıldı və tətbiqlər menyusunda görünür.'
            T_cancelled='Quraşdırma ləğv edildi.'
            T_failed='Quraşdırma alınmadı.'
            T_noDownloader='curl və ya wget lazımdır.'
            T_legalLicenseText='Araç azad proqramdır: onu Azad Proqram Təminatı Fondu (Free Software Foundation) tərəfindən dərc edilmiş GNU Ümumi İctimai Lisenziyasının (GPL) 3-cü versiyası və ya (seçiminizə görə) istənilən sonrakı versiyası şərtləri ilə yaya və dəyişdirə bilərsiniz. Araç-ı dəyişdirilmiş və ya dəyişdirilməmiş halda yaysanız, onun mənbə kodunu da eyni lisenziya ilə təqdim etməlisiniz.'
            T_legalLicenseOfficial='Yalnız lisenziyanın ingilis dilindəki orijinal mətni hüquqi qüvvəyə malikdir; o, tətbiqlə birlikdə verilir (LICENSE faylı).'
            T_legalDisclaimerText='Araç faydalı olacağı ümidi ilə “olduğu kimi” təqdim edilir, lakin SATIŞA YARARLILIQ və ya MÜƏYYƏN MƏQSƏDƏ UYĞUNLUQ da daxil olmaqla, açıq və ya gizli HEÇ BİR ZƏMANƏT verilmir. Qanunun icazə verdiyi həddə müəllif proqramın istifadəsindən yaranan heç bir zərərə, məlumat və ya fayl itkisinə görə məsuliyyət daşımır.'
            T_legalBackup='Əsl fayllarınızın həmişə surətini saxlayın və əsl faylları silməzdən əvvəl çevrilmiş faylları yoxlayın.'
            T_legalUsageText='Çevirdiyiniz fayllara görə yalnız siz məsuliyyət daşıyırsınız. Məzmunun müəllif hüquqlarına və lisenziyalarına hörmət edin. Araç surət qorumasından (DRM) yan keçmək və ya əsərləri icazəsiz yaymaq üçün istifadə edilməməlidir.'
            ;;
        uz)
            T_title='Araç {version} oʻrnatilishi'
            T_detected='Aniqlangan tizim: {distro} ({arch})'
            T_archUnsupported='Qoʻllab-quvvatlanmaydigan protsessor: {arch}'
            T_acceptTitle='Litsenziya va shartlar'
            T_yes='Ha'
            T_no='Yoʻq'
            T_accept='Ushbu shartlarni qabul qilasizmi?'
            T_chooseFormat='Araçni qanday oʻrnatmoqchisiz?'
            T_fmtDeb='.deb paketi (tavsiya etiladi: tizimga toʻliq integratsiya)'
            T_fmtRpm='.rpm paketi (tavsiya etiladi: tizimga toʻliq integratsiya)'
            T_fmtAppImage='AppImage (koʻchma, administrator huquqlari shart emas)'
            T_cancel='Bekor qilish'
            T_choice='Tanlovingiz'
            T_invalid='Notoʻgʻri tanlov.'
            T_appimageDir='AppImage uchun jild'
            T_askDocs='Hujjatlarni ham (Word, Excel, PowerPoint, PDF) oʻgirmoqchimisiz? Bu LibreOffice ni oʻrnatadi.'
            T_docsAlready='LibreOffice allaqachon oʻrnatilgan: hujjatlarni oʻgirish mavjud.'
            T_docsManual='LibreOffice ni distributivingiz paket menejeri orqali oʻrnating.'
            T_downloading='{file} yuklab olinmoqda…'
            T_downloadFailed='Yuklab olinmadi: {url}'
            T_installing='Oʻrnatilmoqda…'
            T_needSudo='Administrator (sudo) paroli soʻralishi mumkin.'
            T_done='Araç oʻrnatildi! Uni ilovalar menyusidan ishga tushiring.'
            T_doneAppImage='Araç {path} jildiga oʻrnatildi va ilovalar menyusida koʻrinadi.'
            T_cancelled='Oʻrnatish bekor qilindi.'
            T_failed='Oʻrnatish muvaffaqiyatsiz tugadi.'
            T_noDownloader='curl yoki wget kerak.'
            T_legalLicenseText='Araç erkin dasturdir: uni Erkin dasturiy taʼminot jamgʻarmasi (Free Software Foundation) tomonidan eʼlon qilingan GNU Umumiy ommaviy litsenziyasi (GPL) 3-versiyasi yoki (tanlovingizga koʻra) undan keyingi istalgan versiyasi shartlari asosida tarqatishingiz va oʻzgartirishingiz mumkin. Araçni oʻzgartirilgan yoki oʻzgartirilmagan holda tarqatsangiz, uning manba kodini ham shu litsenziya bilan taqdim etishingiz shart.'
            T_legalLicenseOfficial='Faqat litsenziyaning ingliz tilidagi asl matni yuridik kuchga ega; u ilova bilan birga beriladi (LICENSE fayli).'
            T_legalDisclaimerText='Araç foydali boʻladi degan umidda “boricha” taqdim etiladi, lekin TIJORIY YAROQLILIK yoki MAʼLUM MAQSADGA MUVOFIQLIK kafolatlari ham, aniq yoki nazarda tutilgan HECH QANDAY KAFOLAT berilmaydi. Qonun ruxsat bergan doirada muallif dasturdan foydalanish natijasida yuzaga kelgan hech qanday zarar, maʼlumot yoki fayl yoʻqolishi uchun javobgar emas.'
            T_legalBackup='Asl fayllaringiz nusxasini doim saqlang va asl fayllarni oʻchirishdan oldin oʻgirilgan fayllarni tekshiring.'
            T_legalUsageText='Oʻgirgan fayllaringiz uchun faqat oʻzingiz javobgarsiz. Kontentning mualliflik huquqlari va litsenziyalarini hurmat qiling. Araç nusxa koʻchirishdan himoyani (DRM) chetlab oʻtish yoki asarlarni ruxsatsiz tarqatish uchun ishlatilmasligi kerak.'
            ;;
        kk)
            T_title='Araç {version} орнату'
            T_detected='Анықталған жүйе: {distro} ({arch})'
            T_archUnsupported='Қолдау көрсетілмейтін процессор: {arch}'
            T_acceptTitle='Лицензия және шарттар'
            T_yes='Иә'
            T_no='Жоқ'
            T_accept='Осы шарттарды қабылдайсыз ба?'
            T_chooseFormat='Araç-ты қалай орнатқыңыз келеді?'
            T_fmtDeb='.deb бумасы (ұсынылады: жүйеге толық біріктіру)'
            T_fmtRpm='.rpm бумасы (ұсынылады: жүйеге толық біріктіру)'
            T_fmtAppImage='AppImage (тасымалы, әкімші құқықтары қажет емес)'
            T_cancel='Бас тарту'
            T_choice='Таңдауыңыз'
            T_invalid='Қате таңдау.'
            T_appimageDir='AppImage бумасы'
            T_askDocs='Құжаттарды да (Word, Excel, PowerPoint, PDF) түрлендіргіңіз келе ме? Бұл LibreOffice орнатады.'
            T_docsAlready='LibreOffice әлдеқашан орнатылған: құжаттарды түрлендіру қолжетімді.'
            T_docsManual='LibreOffice-ты дистрибутивіңіздің бумалар менеджерімен орнатыңыз.'
            T_downloading='{file} жүктелуде…'
            T_downloadFailed='Жүктеу сәтсіз: {url}'
            T_installing='Орнатылуда…'
            T_needSudo='Әкімші (sudo) құпиясөзі сұралуы мүмкін.'
            T_done='Araç орнатылды! Оны қолданбалар мәзірінен іске қосыңыз.'
            T_doneAppImage='Araç {path} ішіне орнатылды және қолданбалар мәзірінде көрінеді.'
            T_cancelled='Орнатудан бас тартылды.'
            T_failed='Орнату сәтсіз аяқталды.'
            T_noDownloader='curl немесе wget қажет.'
            T_legalLicenseText='Araç — еркін бағдарлама: оны Еркін бағдарламалық қамтамасыз ету қоры (Free Software Foundation) жариялаған GNU Жалпы қоғамдық лицензиясының (GPL) 3-нұсқасы немесе (өз таңдауыңызша) кез келген кейінгі нұсқасы шарттары бойынша таратып, өзгерте аласыз. Araç-ты өзгертіп немесе өзгертпей таратсаңыз, оның бастапқы кодын да сол лицензиямен ұсынуыңыз керек.'
            T_legalLicenseOfficial='Лицензияның тек ағылшын тіліндегі түпнұсқа мәтіні ғана заңды күшке ие; ол қолданбамен бірге беріледі (LICENSE файлы).'
            T_legalDisclaimerText='Araç пайдалы болады деген үмітпен «сол күйінде» ұсынылады, бірақ ТАУАРЛЫҚ ЖАРАМДЫЛЫҚ немесе БЕЛГІЛІ БІР МАҚСАТҚА СӘЙКЕСТІК кепілдіктерін қоса алғанда, айқын не жанама ЕШҚАНДАЙ КЕПІЛДІК берілмейді. Заң рұқсат еткен шекте автор бағдарламаны пайдаланудан туындаған ешбір залалға, деректердің не файлдардың жоғалуына жауап бермейді.'
            T_legalBackup='Бастапқы файлдарыңыздың көшірмесін әрдайым сақтаңыз және бастапқыларын жоймас бұрын түрлендірілген файлдарды тексеріңіз.'
            T_legalUsageText='Түрлендіретін файлдарыңызға тек өзіңіз жауаптысыз. Мазмұнның авторлық құқықтары мен лицензияларын құрметтеңіз. Araç көшіруден қорғауды (DRM) айналып өту немесе туындыларды рұқсатсыз тарату үшін пайдаланылмауы тиіс.'
            ;;
        tk)
            T_title='Araç {version} gurnamak'
            T_detected='Kesgitlenen ulgam: {distro} ({arch})'
            T_archUnsupported='Goldanylmaýan prosessor: {arch}'
            T_acceptTitle='Ygtyýarnama we şertler'
            T_yes='Hawa'
            T_no='Ýok'
            T_accept='Bu şertleri kabul edýärsiňizmi?'
            T_chooseFormat='Araç-y nähili gurmak isleýärsiňiz?'
            T_fmtDeb='.deb paketi (maslahat berilýär: ulgama doly birleşdirmek)'
            T_fmtRpm='.rpm paketi (maslahat berilýär: ulgama doly birleşdirmek)'
            T_fmtAppImage='AppImage (göçme, administrator hukuklary gerek däl)'
            T_cancel='Ýatyr'
            T_choice='Saýlawyňyz'
            T_invalid='Nädogry saýlaw.'
            T_appimageDir='AppImage üçin bukja'
            T_askDocs='Resminamalary hem (Word, Excel, PowerPoint, PDF) öwürmek isleýärsiňizmi? Bu LibreOffice-i gurýar.'
            T_docsAlready='LibreOffice eýýäm gurnalan: resminamalary öwürmek elýeterli.'
            T_docsManual='LibreOffice-i paýlamaňyzyň paket dolandyryjysy bilen guruň.'
            T_downloading='{file} ýüklenýär…'
            T_downloadFailed='Ýükläp bolmady: {url}'
            T_installing='Gurnalýar…'
            T_needSudo='Administrator (sudo) açar sözi soralyp bilner.'
            T_done='Araç gurnaldy! Ony programmalar menýusyndan işlediň.'
            T_doneAppImage='Araç {path} bukjasyna gurnaldy we programmalar menýusynda görünýär.'
            T_cancelled='Gurnamak ýatyryldy.'
            T_failed='Gurnamak başa barmady.'
            T_noDownloader='curl ýa-da wget gerek.'
            T_legalLicenseText='Araç erkin programma: ony Erkin Programma Üpjünçiligi Gaznasy (Free Software Foundation) tarapyndan çap edilen GNU Umumy Jemgyýetçilik Ygtyýarnamasynyň (GPL) 3-nji wersiýasynyň ýa-da (islegiňize görä) ondan soňky islendik wersiýasynyň şertlerine laýyklykda ýaýradyp we üýtgedip bilersiňiz. Araç-y üýtgedilen ýa-da üýtgedilmedik görnüşde ýaýratsaňyz, onuň çeşme koduny hem şol ygtyýarnama bilen bermeli.'
            T_legalLicenseOfficial='Diňe ygtyýarnamanyň iňlis dilindäki asyl teksti kanuny güýje eýe; ol programma bilen bile berilýär (LICENSE faýly).'
            T_legalDisclaimerText='Araç peýdaly bolar diýen umyt bilen “bolşy ýaly” hödürlenýär, emma SÖWDA ÝARAMLYLYGY ýa-da BELLI BIR MAKSADA LAÝYKLYK kepillikleri hem goşmak bilen, aç-açan ýa-da göz öňünde tutulýan HIÇ HILI KEPILLIK berilmeýär. Kanunyň rugsat berýän çäginde awtor programmanyň ulanylmagyndan ýüze çykan hiç bir zyýan, maglumat ýa-da faýl ýitgisi üçin jogapkär däl.'
            T_legalBackup='Asyl faýllaryňyzyň nusgasyny hemişe saklaň we asyllaryny pozmazdan öň öwrülen faýllary barlaň.'
            T_legalUsageText='Öwürýän faýllaryňyz üçin diňe siz jogapkär. Mazmunyň awtorlyk hukuklaryna we ygtyýarnamalaryna hormat goýuň. Araç göçürmeden goragy (DRM) aýlanyp geçmek ýa-da eserleri rugsatsyz ýaýratmak üçin ulanylmaly däl.'
            ;;
        ky)
            T_title='Araç {version} орнотуу'
            T_detected='Аныкталган система: {distro} ({arch})'
            T_archUnsupported='Колдоого алынбаган процессор: {arch}'
            T_acceptTitle='Лицензия жана шарттар'
            T_yes='Ооба'
            T_no='Жок'
            T_accept='Бул шарттарды кабыл аласызбы?'
            T_chooseFormat='Araç’ты кантип орноткуңуз келет?'
            T_fmtDeb='.deb пакети (сунушталат: системага толук бириктирүү)'
            T_fmtRpm='.rpm пакети (сунушталат: системага толук бириктирүү)'
            T_fmtAppImage='AppImage (көчмө, администратор укуктары керек эмес)'
            T_cancel='Жокко чыгаруу'
            T_choice='Тандооңуз'
            T_invalid='Туура эмес тандоо.'
            T_appimageDir='AppImage үчүн папка'
            T_askDocs='Документтерди да (Word, Excel, PowerPoint, PDF) өзгөрткүңүз келеби? Бул LibreOffice орнотот.'
            T_docsAlready='LibreOffice мурунтан орнотулган: документтерди өзгөртүү жеткиликтүү.'
            T_docsManual='LibreOffice’ти дистрибутивиңиздин пакеттер менеджери менен орнотуңуз.'
            T_downloading='{file} жүктөлүүдө…'
            T_downloadFailed='Жүктөө ишке ашкан жок: {url}'
            T_installing='Орнотулууда…'
            T_needSudo='Администратордун (sudo) сырсөзү суралышы мүмкүн.'
            T_done='Araç орнотулду! Аны колдонмолор менюсунан иштетиңиз.'
            T_doneAppImage='Araç {path} ичине орнотулду жана колдонмолор менюсунда көрүнөт.'
            T_cancelled='Орнотуу жокко чыгарылды.'
            T_failed='Орнотуу ишке ашкан жок.'
            T_noDownloader='curl же wget керек.'
            T_legalLicenseText='Araç — эркин программа: аны Эркин программалык камсыздоо фонду (Free Software Foundation) жарыялаган GNU Жалпы коомдук лицензиясынын (GPL) 3-версиясынын же (өз тандооңуз боюнча) андан кийинки каалаган версиясынын шарттары боюнча тарата жана өзгөртө аласыз. Araç’ты өзгөртүп же өзгөртпөй таратсаңыз, анын баштапкы кодун да ошол эле лицензия менен берүүгө тийишсиз.'
            T_legalLicenseOfficial='Лицензиянын англис тилиндеги түп нуска тексти гана юридикалык күчкө ээ; ал колдонмо менен кошо берилет (LICENSE файлы).'
            T_legalDisclaimerText='Araç пайдалуу болот деген үмүт менен «кандай болсо, ошондой» берилет, бирок СООДАГА ЖАРАМДУУЛУК же БЕЛГИЛҮҮ БИР МАКСАТКА ЫЛАЙЫКТУУЛУК кепилдиктерин кошо алганда, ачык же кыйыр ЭЧ КАНДАЙ КЕПИЛДИК берилбейт. Мыйзам уруксат берген чекте автор программаны колдонуудан келип чыккан эч кандай зыян, маалымат же файл жоготуу үчүн жооп бербейт.'
            T_legalBackup='Баштапкы файлдарыңыздын көчүрмөсүн ар дайым сактаңыз жана баштапкыларын өчүрүүдөн мурун өзгөртүлгөн файлдарды текшериңиз.'
            T_legalUsageText='Өзгөрткөн файлдарыңыз үчүн өзүңүз гана жооптуусуз. Мазмундун автордук укуктарын жана лицензияларын урматтаңыз. Araç көчүрүүдөн коргоону (DRM) айланып өтүү же чыгармаларды уруксатсыз таратуу үчүн колдонулбашы керек.'
            ;;
        tt)
            T_title='Araç {version} урнаштыру'
            T_detected='Табылган система: {distro} ({arch})'
            T_archUnsupported='Хупланмаган процессор: {arch}'
            T_acceptTitle='Лицензия һәм шартлар'
            T_yes='Әйе'
            T_no='Юк'
            T_accept='Бу шартларны кабул итәсезме?'
            T_chooseFormat='Araç’ны ничек урнаштырырга телисез?'
            T_fmtDeb='.deb пакеты (тәкъдим ителә: системага тулы кушылу)'
            T_fmtRpm='.rpm пакеты (тәкъдим ителә: системага тулы кушылу)'
            T_fmtAppImage='AppImage (күчмә, администратор хокуклары кирәкми)'
            T_cancel='Баш тарту'
            T_choice='Сайлавыгыз'
            T_invalid='Дөрес булмаган сайлау.'
            T_appimageDir='AppImage өчен папка'
            T_askDocs='Документларны да (Word, Excel, PowerPoint, PDF) үзгәртергә телисезме? Бу LibreOffice урнаштыра.'
            T_docsAlready='LibreOffice инде урнаштырылган: документларны үзгәртү мөмкин.'
            T_docsManual='LibreOffice’ны дистрибутивыгызның пакетлар менеджеры ярдәмендә урнаштырыгыз.'
            T_downloading='{file} йөкләнә…'
            T_downloadFailed='Йөкләп булмады: {url}'
            T_installing='Урнаштырыла…'
            T_needSudo='Администратор (sudo) серсүзе соралырга мөмкин.'
            T_done='Araç урнаштырылды! Аны кушымталар менюсыннан җибәрегез.'
            T_doneAppImage='Araç {path} эченә урнаштырылды һәм кушымталар менюсында күренә.'
            T_cancelled='Урнаштырудан баш тартылды.'
            T_failed='Урнаштыру барып чыкмады.'
            T_noDownloader='curl яки wget кирәк.'
            T_legalLicenseText='Araç — ирекле программа: аны Ирекле программа тәэминаты фонды (Free Software Foundation) бастырган GNU Гомуми җәмәгать лицензиясенең (GPL) 3нче версиясе яки (теләгегез буенча) аннан соңгы теләсә кайсы версиясе шартларында тарата һәм үзгәртә аласыз. Araç’ны үзгәртеп яки үзгәртмичә таратсагыз, аның чыганак кодын да шул ук лицензия белән бирергә тиешсез.'
            T_legalLicenseOfficial='Лицензиянең инглиз телендәге төп нөсхә тексты гына юридик көчкә ия; ул кушымта белән бергә бирелә (LICENSE файлы).'
            T_legalDisclaimerText='Araç файдалы булыр дигән өмет белән «булганча» тәкъдим ителә, ләкин САТУГА ЯРАКЛЫЛЫК яки БЕЛГЕЛЕ БЕР МАКСАТКА ТУРЫ КИЛҮ гарантияләрен дә кертеп, ачык яки читләтелгән БЕРНИНДИ ГАРАНТИЯ бирелми. Закон рөхсәт иткән чикләрдә автор программаны куллану нәтиҗәсендә килеп чыккан бернинди зыян, мәгълүмат яки файл югалту өчен җавап бирми.'
            T_legalBackup='Башлангыч файлларыгызның күчермәсен һәрвакыт саклагыз һәм башлангычларын бетерер алдыннан үзгәртелгән файлларны тикшерегез.'
            T_legalUsageText='Үзгәрткән файлларыгыз өчен бары тик сез генә җаваплы. Эчтәлекнең автор хокукларын һәм лицензияләрен хөрмәт итегез. Araç күчерүдән саклауны (DRM) әйләнеп узу яки әсәрләрне рөхсәтсез тарату өчен кулланылырга тиеш түгел.'
            ;;
        ug)
            T_title='Araç {version} قاچىلاش'
            T_detected='بايقالغان سىستېما: {distro} ({arch})'
            T_archUnsupported='قوللىمايدىغان بىر تەرەپ قىلغۇچ: {arch}'
            T_acceptTitle='ئىجازەتنامە ۋە شەرتلەر'
            T_yes='ھەئە'
            T_no='ياق'
            T_accept='بۇ شەرتلەرنى قوبۇل قىلامسىز؟'
            T_chooseFormat='Araç نى قانداق قاچىلىماقچى؟'
            T_fmtDeb='.deb بوغچىسى (تەۋسىيە: سىستېمىغا تولۇق بىرلەشتۈرۈش)'
            T_fmtRpm='.rpm بوغچىسى (تەۋسىيە: سىستېمىغا تولۇق بىرلەشتۈرۈش)'
            T_fmtAppImage='AppImage (يۆتكىلىشچان، باشقۇرغۇچى ھوقۇقى كەتمەيدۇ)'
            T_cancel='بىكار قىلىش'
            T_choice='تاللىشىڭىز'
            T_invalid='خاتا تاللاش.'
            T_appimageDir='AppImage قىسقۇچى'
            T_askDocs='پۈتۈكلەرنىمۇ (Word، Excel، PowerPoint، PDF) ئايلاندۇرماقچىمۇ؟ بۇ LibreOffice نى قاچىلايدۇ.'
            T_docsAlready='LibreOffice ئاللىقاچان قاچىلانغان: پۈتۈك ئايلاندۇرۇشقا بولىدۇ.'
            T_docsManual='LibreOffice نى تارقىتىلمىڭىزنىڭ بوغچا باشقۇرغۇچىسى ئارقىلىق قاچىلاڭ.'
            T_downloading='{file} چۈشۈرۈلۈۋاتىدۇ…'
            T_downloadFailed='چۈشۈرۈش مەغلۇپ بولدى: {url}'
            T_installing='قاچىلىنىۋاتىدۇ…'
            T_needSudo='باشقۇرغۇچى (sudo) پارولى سورىلىشى مۇمكىن.'
            T_done='Araç قاچىلاندى! ئۇنى ئەپلەر تىزىملىكىدىن قوزغىتىڭ.'
            T_doneAppImage='Araç {path} غا قاچىلاندى ۋە ئەپلەر تىزىملىكىدە كۆرۈنىدۇ.'
            T_cancelled='قاچىلاش بىكار قىلىندى.'
            T_failed='قاچىلاش مەغلۇپ بولدى.'
            T_noDownloader='curl ياكى wget كېرەك.'
            T_legalLicenseText='Araç ئەركىن يۇمشاق دېتال: ئۇنى ئەركىن يۇمشاق دېتال فوندى (Free Software Foundation) ئېلان قىلغان GNU ئومۇمىي ئاممىۋى ئىجازەتنامىسى (GPL) نىڭ 3-نەشرى ياكى (ئۆز تاللىشىڭىز بويىچە) ئۇنىڭدىن كېيىنكى خالىغان نەشرىنىڭ شەرتلىرى بويىچە تارقىتالايسىز ۋە ئۆزگەرتەلەيسىز. Araç نى ئۆزگەرتىپ ياكى ئۆزگەرتمەي تارقاتسىڭىز، ئۇنىڭ مەنبە كودىنىمۇ ئوخشاش ئىجازەتنامە بىلەن تەمىنلىشىڭىز كېرەك.'
            T_legalLicenseOfficial='پەقەت ئىجازەتنامىنىڭ ئىنگلىزچە ئەسلى تېكىستىلا قانۇنىي كۈچكە ئىگە؛ ئۇ ئەپ بىلەن بىللە بېرىلىدۇ (LICENSE ھۆججىتى).'
            T_legalDisclaimerText='Araç پايدىلىق بولىدۇ دېگەن ئۈمىد بىلەن «بار پېتى» تەمىنلىنىدۇ، ئەمما سېتىشقا ماس كېلىش ياكى مەلۇم مەقسەتكە ئۇيغۇن كېلىش كاپالىتىنى ئۆز ئىچىگە ئالغان، ئوچۇق ياكى يوشۇرۇن ھېچقانداق كاپالەت بېرىلمەيدۇ. قانۇن يول قويغان دائىرىدە، ئاپتور يۇمشاق دېتالنى ئىشلىتىشتىن كېلىپ چىققان ھېچقانداق زىيان، سانلىق مەلۇمات ياكى ھۆججەت يوقىتىشقا جاۋابكار ئەمەس.'
            T_legalBackup='ئەسلى ھۆججەتلىرىڭىزنىڭ كۆپەيتمىسىنى ھەمىشە ساقلاڭ، ئەسلىسىنى ئۆچۈرۈشتىن بۇرۇن ئايلاندۇرۇلغان ھۆججەتلەرنى تەكشۈرۈڭ.'
            T_legalUsageText='ئايلاندۇرغان ھۆججەتلىرىڭىزگە پەقەت ئۆزىڭىز مەسئۇل. مەزمۇنلارنىڭ نەشر ھوقۇقى ۋە ئىجازەتنامىلىرىنى ھۆرمەت قىلىڭ. Araç نى كۆچۈرۈشتىن قوغداش (DRM) تىن ئايلىنىپ ئۆتۈش ياكى ئەسەرلەرنى ئىجازەتسىز تارقىتىش ئۈچۈن ئىشلىتىشكە بولمايدۇ.'
            ;;
        *) return 1 ;;
    esac
}
ICON_PNG_BASE64='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'
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
