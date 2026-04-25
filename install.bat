@echo off
setlocal

echo.
echo   jx Extension Installer
echo   --------------------------------
echo.

set "BUNDLE=com.jx.extension"
set "CEP=%APPDATA%\Adobe\CEP\extensions"
set "DEST=%CEP%\%BUNDLE%"
set "SRC=%~dp0"
rem strip trailing backslash
if "%SRC:~-1%"=="\" set "SRC=%SRC:~0,-1%"

rem Enable debug mode so unsigned extensions load
echo   Enabling debug mode...
for %%v in (9 10 11 12 13) do (
    reg add "HKCU\Software\Adobe\CSXS.%%v" /v PlayerDebugMode /t REG_SZ /d 1 /f >nul 2>&1
)

rem Create CEP extensions folder if missing
if not exist "%CEP%" mkdir "%CEP%"

rem Remove previous install
if exist "%DEST%" (
    rmdir /s /q "%DEST%" >nul 2>&1
)

rem Create a directory junction (works without admin on most systems)
mklink /J "%DEST%" "%SRC%" >nul 2>&1

if %errorlevel% equ 0 (
    echo   Installed at:
    echo   %DEST%
    echo.
    echo   Restart After Effects, then open:
    echo   Window ^> Extensions ^> jx
    echo.
) else (
    echo   Junction failed — trying folder copy instead...
    xcopy "%SRC%" "%DEST%\" /e /i /q >nul 2>&1
    if %errorlevel% equ 0 (
        echo   Copied to:
        echo   %DEST%
        echo.
        echo   NOTE: updates will not auto-install to this copy.
        echo   Re-run install.bat after each update.
        echo.
        echo   Restart After Effects, then open:
        echo   Window ^> Extensions ^> jx
        echo.
    ) else (
        echo   ERROR: install failed. Try running as Administrator.
        echo.
    )
)

pause
endlocal
