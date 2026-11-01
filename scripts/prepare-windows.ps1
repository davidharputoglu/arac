# Prépare les outils fournis avec l'installateur Windows d'Araç :
#   - ffmpeg (build statique officiel BtbN)
#   - 7-Zip (7z.exe + 7z.dll, version officielle)
#   - LibreOffice (installateur officiel .msi, proposé pendant l'installation)
#
#   powershell -ExecutionPolicy Bypass -File scripts\prepare-windows.ps1 [-Arch x64|arm64] [-NoLibreOffice]
#
# Résultat : src-tauri\binaries\ (ffmpeg, 7-Zip, licences) et src-tauri\windows\LibreOffice.msi
# + src-tauri\windows\libreoffice.nsh (lu par l'installateur).

param(
    [ValidateSet('x64', 'arm64')] [string] $Arch = $(if ($env:PROCESSOR_ARCHITECTURE -eq 'ARM64') { 'arm64' } else { 'x64' }),
    [switch] $NoLibreOffice
)

$ErrorActionPreference = 'Stop'
$ProgressPreference = 'SilentlyContinue'   # téléchargements beaucoup plus rapides
$Root = Split-Path -Parent $PSScriptRoot
$Bin = Join-Path $Root 'src-tauri\binaries'
$Win = Join-Path $Root 'src-tauri\windows'
$Work = Join-Path ([System.IO.Path]::GetTempPath()) ("arac-prep-" + [guid]::NewGuid())
New-Item -ItemType Directory -Force -Path $Bin, (Join-Path $Bin 'licenses'), $Work | Out-Null

$Triple = if ($Arch -eq 'arm64') { 'aarch64-pc-windows-msvc' } else { 'x86_64-pc-windows-msvc' }
$Headers = @{ 'Accept' = 'application/vnd.github+json'; 'User-Agent' = 'arac-build' }
if ($env:GITHUB_TOKEN) { $Headers['Authorization'] = "Bearer $env:GITHUB_TOKEN" }

function Get-LatestAsset([string] $Repo, [string] $Release, [string] $Pattern) {
    $r = Invoke-RestMethod -Headers $Headers -Uri "https://api.github.com/repos/$Repo/releases/$Release"
    $a = $r.assets | Where-Object { $_.name -match $Pattern } | Sort-Object name | Select-Object -Last 1
    if ($a) { return $a.browser_download_url }
    return $null
}

function Save-Url([string] $Url, [string] $Path) {
    Write-Host "Téléchargement : $Url"
    Invoke-WebRequest -UseBasicParsing -Uri $Url -OutFile $Path
}

# ffmpeg ---------------------------------------------------------------------------
$plat = if ($Arch -eq 'arm64') { 'winarm64' } else { 'win64' }
$url = Get-LatestAsset 'BtbN/FFmpeg-Builds' 'tags/latest' "^ffmpeg-n[0-9.]+-latest-$plat-gpl-[0-9.]+\.zip$"
if (-not $url) { $url = "https://github.com/BtbN/FFmpeg-Builds/releases/download/latest/ffmpeg-master-latest-$plat-gpl.zip" }
Save-Url $url "$Work\ffmpeg.zip"
Expand-Archive "$Work\ffmpeg.zip" "$Work\ffmpeg"
$ff = Get-ChildItem "$Work\ffmpeg" -Recurse -Filter ffmpeg.exe | Select-Object -First 1
Copy-Item $ff.FullName "$Bin\arac-ffmpeg-$Triple.exe" -Force
$lic = Get-ChildItem "$Work\ffmpeg" -Recurse -Include 'LICENSE*' | Select-Object -First 1
if ($lic) { Copy-Item $lic.FullName "$Bin\licenses\ffmpeg-LICENSE.txt" -Force }

# 7-Zip : l'installateur officiel est une archive 7z auto-extractible -----------------------
$suffix = if ($Arch -eq 'arm64') { 'arm64' } else { 'x64' }
$url = Get-LatestAsset 'ip7z/7zip' 'latest' "^7z[0-9]+-$suffix\.exe$"
if (-not $url) { throw "7-Zip introuvable pour $suffix" }
Save-Url $url "$Work\7z-setup.exe"
$extractor = (Get-Command 7z.exe -ErrorAction SilentlyContinue).Source
if (-not $extractor -and (Test-Path "$env:ProgramFiles\7-Zip\7z.exe")) { $extractor = "$env:ProgramFiles\7-Zip\7z.exe" }
if (-not $extractor) {
    Save-Url (Get-LatestAsset 'ip7z/7zip' 'latest' '^7zr\.exe$') "$Work\7zr.exe"
    $extractor = "$Work\7zr.exe"
}
& $extractor x -y "-o$Work\7z" "$Work\7z-setup.exe" | Out-Null
if (-not (Test-Path "$Work\7z\7z.exe")) { throw "Extraction de 7-Zip impossible" }
Copy-Item "$Work\7z\7z.exe" "$Bin\arac-7z-$Triple.exe" -Force
Copy-Item "$Work\7z\7z.dll" "$Bin\7z.dll" -Force
Copy-Item "$Work\7z\License.txt" "$Bin\licenses\7-Zip-License.txt" -Force

# LibreOffice --------------------------------------------------------------------------
$nsh = Join-Path $Win 'libreoffice.nsh'
$msi = Join-Path $Win 'LibreOffice.msi'
if ($NoLibreOffice) {
    Remove-Item $nsh, $msi -ErrorAction SilentlyContinue
    Write-Host 'Installateur construit sans LibreOffice.'
} else {
    $base = 'https://download.documentfoundation.org/libreoffice/stable/'
    $listing = (Invoke-WebRequest -UseBasicParsing -Uri $base).Content
    $versions = [regex]::Matches($listing, 'href="(\d+\.\d+\.\d+)/"') | ForEach-Object { [version]$_.Groups[1].Value } | Sort-Object
    $v = $versions[-1].ToString()
    $loUrl = if ($Arch -eq 'arm64') { "$base$v/win/aarch64/LibreOffice_${v}_Win_aarch64.msi" } else { "$base$v/win/x86_64/LibreOffice_${v}_Win_x86-64.msi" }
    try { Save-Url $loUrl $msi }
    catch {
        # Pas de version ARM64 : la version x64 fonctionne aussi (émulation Windows).
        $loUrl = "$base$v/win/x86_64/LibreOffice_${v}_Win_x86-64.msi"
        Save-Url $loUrl $msi
    }
    # Taille réelle une fois installé : extraction administrative dans un dossier temporaire.
    $probe = Join-Path $Work 'lo'
    Start-Process msiexec.exe -Wait -ArgumentList @('/a', "`"$msi`"", '/qn', "TARGETDIR=`"$probe`"") | Out-Null
    $bytes = (Get-ChildItem $probe -Recurse -File -ErrorAction SilentlyContinue | Measure-Object Length -Sum).Sum
    $mb = if ($bytes) { [math]::Ceiling($bytes / 1MB / 50) * 50 } else { [math]::Ceiling((Get-Item $msi).Length / 1MB * 3 / 50) * 50 }
    $msiPath = (Resolve-Path $msi).Path
    @(
        '; Généré par scripts/prepare-windows.ps1 — ne pas modifier.',
        "!define ARAC_LO_MSI `"$msiPath`"",
        "!define ARAC_LO_VERSION `"$v`"",
        "!define ARAC_LO_SIZE_MB `"$mb`""
    ) -join "`r`n" | ForEach-Object { [System.IO.File]::WriteAllText($nsh, $_ + "`r`n", (New-Object System.Text.UTF8Encoding $true)) }
    Write-Host "LibreOffice $v ($mb Mo une fois installé)"
}

Remove-Item -Recurse -Force $Work -ErrorAction SilentlyContinue
try { & "$Bin\arac-ffmpeg-$Triple.exe" -hide_banner -version | Select-Object -First 1 } catch { }
Write-Host "Prêt pour $Triple."
