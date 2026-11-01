; Araç — étapes ajoutées à l'installateur Windows (Tauri / NSIS).
;
; 1. Question « Voulez-vous aussi convertir des documents ? » ; si oui,
;    installation de LibreOffice (fourni dans l'installateur, rien à télécharger).
; 2. Langue choisie à l'installation transmise à Araç (fichier install-language).
; 3. Version affichée « 0.1 » dans « Applications installées ».
;
; Le fichier libreoffice.nsh est créé par scripts/prepare-windows.ps1 ; sans lui,
; l'installateur est construit sans LibreOffice et ne pose pas la question.

!define ARAC_DIR "${__FILEDIR__}"
; Version affichée : ne change que sur décision de l'auteur.
!define ARAC_DISPLAY_VERSION "0.1"
!include /NONFATAL "${ARAC_DIR}\libreoffice.nsh"
!ifndef ARAC_LO_SIZE_MB
    !define ARAC_LO_SIZE_MB "350"
!endif

Var AracDocs

!ifdef ARAC_LO_MSI

; Textes de l'installateur selon la langue choisie ($R0 = numéro du texte).
Function AracText
    ${If} $LANGUAGE == 1036 ; français
        ${If} $R0 == 1
            StrCpy $R1 "Voulez-vous aussi pouvoir convertir des documents (Word, Excel, PowerPoint, PDF…) ?$\r$\n$\r$\nCela installe LibreOffice, une suite bureautique libre et gratuite (environ ${ARAC_LO_SIZE_MB} Mo). Vous pourrez le faire plus tard en relançant cet installateur."
        ${ElseIf} $R0 == 2
            StrCpy $R1 "LibreOffice est déjà installé : la conversion de documents sera disponible."
        ${ElseIf} $R0 == 3
            StrCpy $R1 "Installation de LibreOffice (quelques minutes)…"
        ${ElseIf} $R0 == 4
            StrCpy $R1 "LibreOffice n'a pas pu être installé (code $0). Araç fonctionne quand même, sans la conversion de documents. Vous pourrez relancer cet installateur plus tard."
        ${Else}
            StrCpy $R1 "LibreOffice est installé."
        ${EndIf}
    ${ElseIf} $LANGUAGE == 1034 ; espagnol
        ${If} $R0 == 1
            StrCpy $R1 "¿Quieres poder convertir también documentos (Word, Excel, PowerPoint, PDF…)?$\r$\n$\r$\nSe instalará LibreOffice, una suite ofimática libre y gratuita (unos ${ARAC_LO_SIZE_MB} MB). Podrás hacerlo más tarde volviendo a ejecutar este instalador."
        ${ElseIf} $R0 == 2
            StrCpy $R1 "LibreOffice ya está instalado: la conversión de documentos estará disponible."
        ${ElseIf} $R0 == 3
            StrCpy $R1 "Instalando LibreOffice (unos minutos)…"
        ${ElseIf} $R0 == 4
            StrCpy $R1 "No se ha podido instalar LibreOffice (código $0). Araç funciona igualmente, sin la conversión de documentos. Puedes volver a ejecutar este instalador más tarde."
        ${Else}
            StrCpy $R1 "LibreOffice está instalado."
        ${EndIf}
    ${ElseIf} $LANGUAGE == 2070 ; portugais
        ${If} $R0 == 1
            StrCpy $R1 "Quer também poder converter documentos (Word, Excel, PowerPoint, PDF…)?$\r$\n$\r$\nIsto instala o LibreOffice, um pacote de escritório livre e gratuito (cerca de ${ARAC_LO_SIZE_MB} MB). Pode fazê-lo mais tarde executando novamente este instalador."
        ${ElseIf} $R0 == 2
            StrCpy $R1 "O LibreOffice já está instalado: a conversão de documentos estará disponível."
        ${ElseIf} $R0 == 3
            StrCpy $R1 "A instalar o LibreOffice (alguns minutos)…"
        ${ElseIf} $R0 == 4
            StrCpy $R1 "Não foi possível instalar o LibreOffice (código $0). O Araç funciona na mesma, sem a conversão de documentos. Pode executar novamente este instalador mais tarde."
        ${Else}
            StrCpy $R1 "O LibreOffice está instalado."
        ${EndIf}
    ${ElseIf} $LANGUAGE == 1040 ; italien
        ${If} $R0 == 1
            StrCpy $R1 "Vuoi poter convertire anche i documenti (Word, Excel, PowerPoint, PDF…)?$\r$\n$\r$\nVerrà installato LibreOffice, una suite per ufficio libera e gratuita (circa ${ARAC_LO_SIZE_MB} MB). Potrai farlo più tardi avviando di nuovo questo programma di installazione."
        ${ElseIf} $R0 == 2
            StrCpy $R1 "LibreOffice è già installato: la conversione dei documenti sarà disponibile."
        ${ElseIf} $R0 == 3
            StrCpy $R1 "Installazione di LibreOffice (qualche minuto)…"
        ${ElseIf} $R0 == 4
            StrCpy $R1 "Impossibile installare LibreOffice (codice $0). Araç funziona comunque, senza la conversione dei documenti. Potrai avviare di nuovo questo programma di installazione più tardi."
        ${Else}
            StrCpy $R1 "LibreOffice è installato."
        ${EndIf}
    ${ElseIf} $LANGUAGE == 1055 ; turc
        ${If} $R0 == 1
            StrCpy $R1 "Belgeleri de (Word, Excel, PowerPoint, PDF…) dönüştürebilmek ister misiniz?$\r$\n$\r$\nBu işlem, özgür ve ücretsiz bir ofis paketi olan LibreOffice'i yükler (yaklaşık ${ARAC_LO_SIZE_MB} MB). Bunu daha sonra bu yükleyiciyi yeniden çalıştırarak da yapabilirsiniz."
        ${ElseIf} $R0 == 2
            StrCpy $R1 "LibreOffice zaten yüklü: belge dönüştürme kullanılabilir olacak."
        ${ElseIf} $R0 == 3
            StrCpy $R1 "LibreOffice yükleniyor (birkaç dakika)…"
        ${ElseIf} $R0 == 4
            StrCpy $R1 "LibreOffice yüklenemedi (kod $0). Araç yine de çalışır, ancak belge dönüştürme olmadan. Bu yükleyiciyi daha sonra yeniden çalıştırabilirsiniz."
        ${Else}
            StrCpy $R1 "LibreOffice yüklendi."
        ${EndIf}
    ${ElseIf} $LANGUAGE == 1092 ; tatar
        ${If} $R0 == 1
            StrCpy $R1 "Документларны да (Word, Excel, PowerPoint, PDF…) үзгәртә алырга телисезме?$\r$\n$\r$\nБу ирекле һәм түләүсез офис пакеты LibreOffice'ны урнаштыра (якынча ${ARAC_LO_SIZE_MB} МБ). Моны соңрак бу урнаштыручыны яңадан җибәреп тә эшли аласыз."
        ${ElseIf} $R0 == 2
            StrCpy $R1 "LibreOffice инде урнаштырылган: документларны үзгәртү мөмкин булачак."
        ${ElseIf} $R0 == 3
            StrCpy $R1 "LibreOffice урнаштырыла (берничә минут)…"
        ${ElseIf} $R0 == 4
            StrCpy $R1 "LibreOffice урнаштырылмады (код $0). Araç барыбер эшли, ләкин документларны үзгәртүсез. Бу урнаштыручыны соңрак яңадан җибәрә аласыз."
        ${Else}
            StrCpy $R1 "LibreOffice урнаштырылды."
        ${EndIf}
    ${ElseIf} $LANGUAGE == 1091 ; ouzbek
        ${If} $R0 == 1
            StrCpy $R1 "Hujjatlarni ham (Word, Excel, PowerPoint, PDF…) oʻgira olishni xohlaysizmi?$\r$\n$\r$\nBu erkin va bepul ofis toʻplami LibreOffice ni oʻrnatadi (taxminan ${ARAC_LO_SIZE_MB} MB). Buni keyinroq ushbu oʻrnatuvchini qayta ishga tushirib ham qilishingiz mumkin."
        ${ElseIf} $R0 == 2
            StrCpy $R1 "LibreOffice allaqachon oʻrnatilgan: hujjatlarni oʻgirish mavjud boʻladi."
        ${ElseIf} $R0 == 3
            StrCpy $R1 "LibreOffice oʻrnatilmoqda (bir necha daqiqa)…"
        ${ElseIf} $R0 == 4
            StrCpy $R1 "LibreOffice oʻrnatilmadi (kod $0). Araç baribir ishlaydi, lekin hujjatlarni oʻgirishsiz. Bu oʻrnatuvchini keyinroq qayta ishga tushirishingiz mumkin."
        ${Else}
            StrCpy $R1 "LibreOffice oʻrnatildi."
        ${EndIf}
    ${Else} ; anglais (et langues absentes de NSIS)
        ${If} $R0 == 1
            StrCpy $R1 "Do you also want to be able to convert documents (Word, Excel, PowerPoint, PDF…)?$\r$\n$\r$\nThis installs LibreOffice, a free and open-source office suite (about ${ARAC_LO_SIZE_MB} MB). You can also do it later by running this installer again."
        ${ElseIf} $R0 == 2
            StrCpy $R1 "LibreOffice is already installed: document conversion will be available."
        ${ElseIf} $R0 == 3
            StrCpy $R1 "Installing LibreOffice (a few minutes)…"
        ${ElseIf} $R0 == 4
            StrCpy $R1 "LibreOffice could not be installed (code $0). Araç still works, without document conversion. You can run this installer again later."
        ${Else}
            StrCpy $R1 "LibreOffice is installed."
        ${EndIf}
    ${EndIf}
FunctionEnd

; LibreOffice déjà présent sur l'ordinateur ? ($R2 = 1 si oui)
Function AracHasLibreOffice
    StrCpy $R2 0
    ${If} ${FileExists} "$PROGRAMFILES64\LibreOffice\program\soffice.exe"
    ${OrIf} ${FileExists} "$PROGRAMFILES32\LibreOffice\program\soffice.exe"
        StrCpy $R2 1
    ${EndIf}
FunctionEnd
!endif

!macro NSIS_HOOK_PREINSTALL
    StrCpy $AracDocs 0
    !ifdef ARAC_LO_MSI
        Call AracHasLibreOffice
        ${If} $R2 == 1
            StrCpy $R0 2
            Call AracText
            DetailPrint "$R1"
        ${ElseIf} $PassiveMode <> 1
        ${AndIfNot} ${Silent}
            StrCpy $R0 1
            Call AracText
            MessageBox MB_YESNO|MB_ICONQUESTION "$R1" /SD IDNO IDNO arac_no_docs
            StrCpy $AracDocs 1
            arac_no_docs:
        ${EndIf}
    !endif
!macroend

!macro NSIS_HOOK_POSTINSTALL
    ; Langue de l'installation, reprise par Araç au premier lancement.
    ${Select} $LANGUAGE
        ${Case} 1036
            StrCpy $R3 "fr"
        ${Case} 1034
            StrCpy $R3 "es"
        ${Case} 2070
            StrCpy $R3 "pt"
        ${Case} 1040
            StrCpy $R3 "it"
        ${Case} 1055
            StrCpy $R3 "tr"
        ${Case} 1092
            StrCpy $R3 "tt"
        ${Case} 1091
            StrCpy $R3 "uz"
        ${CaseElse}
            StrCpy $R3 "en"
    ${EndSelect}
    FileOpen $R4 "$INSTDIR\install-language" w
    FileWrite $R4 "$R3"
    FileClose $R4

    WriteRegStr SHCTX "${UNINSTKEY}" "DisplayVersion" "${ARAC_DISPLAY_VERSION}"

    !ifdef ARAC_LO_MSI
        ${If} $AracDocs == 1
            StrCpy $R0 3
            Call AracText
            DetailPrint "$R1"
            InitPluginsDir
            SetOutPath "$PLUGINSDIR"
            File "/oname=LibreOffice.msi" "${ARAC_LO_MSI}"
            ; Pas d'association des fichiers Office : Word/Excel restent ouverts par
            ; le logiciel habituel de l'utilisateur.
            ExecWait '"$SYSDIR\msiexec.exe" /i "$PLUGINSDIR\LibreOffice.msi" /passive /norestart REGISTER_NO_MSO_TYPES=1 QUICKSTART=0 CREATEDESKTOPLINK=0 RebootYesNo=No' $0
            SetOutPath "$INSTDIR"
            Delete "$PLUGINSDIR\LibreOffice.msi"
            ${If} $0 == 0
            ${OrIf} $0 == 3010
                StrCpy $R0 5
                Call AracText
                DetailPrint "$R1"
            ${Else}
                StrCpy $R0 4
                Call AracText
                DetailPrint "$R1"
                MessageBox MB_OK|MB_ICONEXCLAMATION "$R1" /SD IDOK
            ${EndIf}
        ${EndIf}
    !endif
!macroend

!macro NSIS_HOOK_PREUNINSTALL
    Delete "$INSTDIR\install-language"
!macroend
