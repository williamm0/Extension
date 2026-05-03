import { mkdirSync, rmSync, cpSync, writeFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { execFileSync } from 'node:child_process';

const root = fileURLToPath(new URL('..', import.meta.url));
const releaseDir = join(root, 'dist', 'windows');
const staging = join(releaseDir, 'jxTools-2.0.1-windows');
const payload = join(staging, 'jx Tools');
const zipPath = join(releaseDir, 'jxTools-2.0.1-windows.zip');

rmSync(releaseDir, { recursive: true, force: true });
mkdirSync(payload, { recursive: true });

for (const item of ['CSXS', 'client', 'host', 'update', 'README.md', 'Product description.txt', 'progress.txt', 'fixes.txt', '.gitignore']) {
  const from = join(root, item);
  const to = join(payload, item);
  if (existsSync(from)) cpSync(from, to, { recursive: true });
}

const installBat = `@echo off
setlocal EnableExtensions EnableDelayedExpansion
title jx Tools - Windows Installer

echo.
echo ============================================
echo   jx Tools v2.0.1 - Windows Installer
echo ============================================
echo.

set "SRC=%~dp0jx Tools"
if not exist "%SRC%\\CSXS\\manifest.xml" (
  echo [ERROR] Could not find the "jx Tools" payload next to this installer.
  echo Make sure you extracted the entire ZIP before running Install.bat.
  echo.
  pause
  exit /b 1
)

set "DEST_USER=%APPDATA%\\Adobe\\CEP\\extensions\\jx Tools"
set "DEST_SYS=%PROGRAMFILES(X86)%\\Common Files\\Adobe\\CEP\\extensions\\jx Tools"

echo Installing to:
echo   %DEST_USER%
echo.

if exist "%DEST_USER%" (
  echo Removing previous version...
  rmdir /S /Q "%DEST_USER%" 2>nul
)

mkdir "%DEST_USER%" 2>nul
xcopy /E /I /Y /Q "%SRC%" "%DEST_USER%" >nul
if errorlevel 1 (
  echo [ERROR] Copy failed. Try running this installer as Administrator.
  pause
  exit /b 1
)

echo.
echo Enabling unsigned CEP extensions (required for jx Tools)...
for %%V in (4 5 6 7 8 9 10 11 12) do (
  reg add "HKCU\\Software\\Adobe\\CSXS.%%V" /v PlayerDebugMode /t REG_SZ /d 1 /f >nul 2>&1
)

if exist "%DEST_SYS%" (
  echo.
  echo NOTE: An older system-wide copy was found at:
  echo   %DEST_SYS%
  echo You may want to delete it ^(admin rights required^) so After Effects loads only the new version.
)

echo.
echo ============================================
echo   Install complete.
echo   Restart After Effects, then open:
echo   Window  ^>  Extensions  ^>  jx Tools
echo ============================================
echo.
pause
exit /b 0
`;

const uninstallBat = `@echo off
setlocal
title jx Tools - Uninstaller
set "DEST_USER=%APPDATA%\\Adobe\\CEP\\extensions\\jx Tools"
echo Removing %DEST_USER% ...
if exist "%DEST_USER%" rmdir /S /Q "%DEST_USER%"
echo Done.
pause
`;

const readme = `jx Tools v2.0.1 - Windows install

1. Close After Effects.
2. Double-click Install.bat (per-user install, no admin needed).
   If Windows SmartScreen blocks it, click "More info" then "Run anyway".
3. Restart After Effects.
4. Open  Window > Extensions > jx Tools.

If the panel does not show up:
- Make sure After Effects 2024 or newer is installed.
- Re-run Install.bat once more, then restart After Effects.
- If you previously installed jx Tools from a ZIP, delete:
    %APPDATA%\\Adobe\\CEP\\extensions\\jx Tools
  and run Install.bat again.

Uninstall: run Uninstall.bat.

Support: jx@jxffx.com
`;

const crlf = (s) => s.replace(/\r?\n/g, '\r\n');
writeFileSync(join(staging, 'Install.bat'), crlf(installBat));
writeFileSync(join(staging, 'Uninstall.bat'), crlf(uninstallBat));
writeFileSync(join(staging, 'READ ME FIRST.txt'), crlf(readme));

execFileSync('zip', ['-qr', zipPath, 'jxTools-2.0.1-windows'], { cwd: releaseDir, stdio: 'inherit' });
console.log(zipPath);
