@echo off
setlocal
title jx Tools Installer

echo.
echo    ------------------------------------------
echo    jx Tools - GitHub Installer
echo    ------------------------------------------
echo.

:: 1. Configuration
set "BUNDLE=com.jx.tools"
set "CEP=%APPDATA%\Adobe\CEP\extensions"
set "DEST=%CEP%\%BUNDLE%"
set "API=https://api.github.com/repos/williamm0/Extension/releases/latest"

:: 2. Run PowerShell directly
powershell -NoProfile -ExecutionPolicy Bypass -Command ^
    "$ErrorActionPreference = 'Stop';" ^
    "try {" ^
    "  Write-Host '  Connecting to GitHub...' -ForegroundColor Cyan;" ^
    "  $rel = Invoke-RestMethod -Uri '%API%' -Headers @{ 'User-Agent' = 'jx-installer' };" ^
    "  $assetUrl = ($rel.assets | Where-Object { $_.name -like '*.zip' } | Select-Object -ExpandProperty browser_download_url -First 1);" ^
    "  if (-not $assetUrl) { $assetUrl = $rel.zipball_url };" ^
    "  Write-Host '  Downloading latest version...' -ForegroundColor Cyan;" ^
    "  $zipPath = Join-Path $env:TEMP 'jx_dl.zip';" ^
    "  Invoke-WebRequest -Uri $assetUrl -OutFile $zipPath -UseBasicParsing;" ^
    "  Write-Host '  Unpacking...' -ForegroundColor Cyan;" ^
    "  $extract = Join-Path $env:TEMP ('jx_xtract_' + (Get-Date -UFormat '%%s'));" ^
    "  Expand-Archive -Path $zipPath -DestinationPath $extract -Force;" ^
    "  $csxs = Get-ChildItem -Path $extract -Filter 'CSXS' -Recurse -Directory | Select-Object -First 1;" ^
    "  if (-not $csxs) { throw 'No valid extension found in download.' };" ^
    "  $src = $csxs.Parent.FullName;" ^
    "  Write-Host '  Installing to Adobe folder...' -ForegroundColor Cyan;" ^
    "  if (Test-Path '%DEST%') { Remove-Item '%DEST%' -Recurse -Force };" ^
    "  New-Item -ItemType Directory -Path '%DEST%' -Force | Out-Null;" ^
    "  Copy-Item -Path \"$src\*\" -Destination '%DEST%' -Recurse -Force;" ^
    "  Get-Item '%DEST%\install.*' -ErrorAction SilentlyContinue | Remove-Item -Force;" ^
    "  Remove-Item $zipPath -Force;" ^
    "  Write-Host '  SUCCESS!' -ForegroundColor Green;" ^
    "} catch {" ^
    "  Write-Host ('`n  ERROR: ' + $_.Exception.Message) -ForegroundColor Red;" ^
    "  exit 1;" ^
    "}"

if %errorlevel% neq 0 (
    echo.
    echo    Installation failed.
    pause
    exit /b 1
)

:: 3. Registry Hack
echo    Enabling Adobe Developer Mode...
for %%v in (9 10 11 12 13 14) do (
    reg add "HKCU\Software\Adobe\CSXS.%%v" /v PlayerDebugMode /t REG_SZ /d 1 /f >nul 2>&1
)

echo.
echo    All set! Restart After Effects and check Window ^> Extensions.
echo.
pause
endlocal