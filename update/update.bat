@echo off
setlocal enabledelayedexpansion
title jx Tools Updater

:: jx Tools — Windows updater
:: Runs outside After Effects; safe to overwrite extension files.

set "SCRIPT_DIR=%~dp0"
:: Remove trailing backslash
if "%SCRIPT_DIR:~-1%"=="\" set "SCRIPT_DIR=%SCRIPT_DIR:~0,-1%"

:: Parent of the update\ folder = extension root
for %%I in ("%SCRIPT_DIR%\..") do set "EXT_DIR=%%~fI"

set "INFO_FILE=%SCRIPT_DIR%\update_info.json"

echo.
echo   jx Tools Updater
echo   ------------------------------------------

:: ── Read update info ─────────────────────────────────────────────────────────
if not exist "%INFO_FILE%" (
    echo   Error: update_info.json not found.
    echo   Launch the update from inside the jx panel.
    echo.
    pause
    exit /b 1
)

for /f "usebackq delims=" %%A in (
    `powershell -NoProfile -Command "(Get-Content -Raw '%INFO_FILE%' | ConvertFrom-Json).url"`
) do set "DOWNLOAD_URL=%%A"

for /f "usebackq delims=" %%A in (
    `powershell -NoProfile -Command "(Get-Content -Raw '%INFO_FILE%' | ConvertFrom-Json).version"`
) do set "VERSION=%%A"

if "%DOWNLOAD_URL%"=="" (
    echo   Error: could not read download URL from update_info.json.
    echo.
    pause
    exit /b 1
)

echo   Version : %VERSION%
echo   Install : %EXT_DIR%
echo.

:: ── Download ──────────────────────────────────────────────────────────────────
set "WORK_ROOT=%APPDATA%\jx Tools\Updates"
set "TMP_DIR=%WORK_ROOT%\download_%RANDOM%%RANDOM%"
set "ZIP_FILE=%TMP_DIR%\jx_update.zip"
mkdir "%TMP_DIR%" >nul 2>&1

echo   Downloading...
powershell -NoProfile -Command ^
    "try { Invoke-WebRequest -Uri '%DOWNLOAD_URL%' -OutFile '%ZIP_FILE%' -UseBasicParsing } catch { exit 1 }"

if errorlevel 1 (
    echo   Error: download failed.
    rmdir /s /q "%TMP_DIR%" >nul 2>&1
    echo.
    pause
    exit /b 1
)

if not exist "%ZIP_FILE%" (
    echo   Error: ZIP file not found after download.
    rmdir /s /q "%TMP_DIR%" >nul 2>&1
    echo.
    pause
    exit /b 1
)

:: ── Extract ───────────────────────────────────────────────────────────────────
echo   Extracting...
set "EXTRACT_DIR=%TMP_DIR%\extracted"
powershell -NoProfile -Command ^
    "Expand-Archive -LiteralPath '%ZIP_FILE%' -DestinationPath '%EXTRACT_DIR%' -Force"

:: ── Find extension root ───────────────────────────────────────────────────────
set "ROOT="
if exist "%EXTRACT_DIR%\CSXS\manifest.xml" (
    set "ROOT=%EXTRACT_DIR%"
) else (
    for /d %%D in ("%EXTRACT_DIR%\*") do (
        if exist "%%D\CSXS\manifest.xml" (
            set "ROOT=%%D"
        )
    )
)

if "%ROOT%"=="" (
    echo   Error: could not locate CSXS\manifest.xml in archive.
    rmdir /s /q "%TMP_DIR%" >nul 2>&1
    echo.
    pause
    exit /b 1
)

:: ── Install ───────────────────────────────────────────────────────────────────
echo   Installing...
xcopy /E /Y /I "%ROOT%\*" "%EXT_DIR%\" >nul 2>&1
set "INSTALL_STATUS=%errorlevel%"

rmdir /s /q "%TMP_DIR%" >nul 2>&1
del "%INFO_FILE%" >nul 2>&1

if %INSTALL_STATUS% neq 0 (
    echo.
    echo   Error: file copy failed (exit %INSTALL_STATUS%).
    echo   Close After Effects and run this script again.
    echo.
    pause
    exit /b 1
)

echo.
echo   jx Tools %VERSION% installed successfully.
echo.
echo   Restart After Effects to apply the update.
echo.
pause
