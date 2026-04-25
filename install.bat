@echo off
setlocal

echo.
echo   jx Extension Installer
echo   --------------------------------
echo.

:: 1. Configuration - Ensure BUNDLE matches your manifest.xml ID
set "BUNDLE=com.jx.extension"
set "CEP=%APPDATA%\Adobe\CEP\extensions"
set "DEST=%CEP%\%BUNDLE%"
set "SRC=%~dp0"

:: 2. Registry Hack for Unsigned Extensions
echo   Enabling Developer Mode...
for %%v in (9 10 11 12 13 14) do (
    reg add "HKCU\Software\Adobe\CSXS.%%v" /v PlayerDebugMode /t REG_SZ /d 1 /f >nul 2>&1
)

:: 3. Clean up old versions
if exist "%DEST%" (
    echo   Removing old version...
    rmdir /s /q "%DEST%" >nul 2>&1
)

:: 4. Create Directory
if not exist "%CEP%" mkdir "%CEP%"

:: 5. Copy files (The /E /I /Y flags ensure folders are copied correctly)
echo   Copying files to Adobe directory...
xcopy "%SRC%*" "%DEST%\" /E /I /Y /Q >nul 2>&1

if %errorlevel% equ 0 (
    echo   Success! Installed to:
    echo   %DEST%
    echo.
    echo   Restart After Effects, then go to:
    echo   Window ^> Extensions ^> jx
) else (
    echo   ERROR: Installation failed. 
    echo   Try right-clicking this file and "Run as Administrator".
)

echo.
pause
endlocal