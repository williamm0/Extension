import { mkdirSync, rmSync, cpSync, writeFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { execFileSync } from 'node:child_process';

const root = fileURLToPath(new URL('..', import.meta.url));
const releaseDir = join(root, 'dist', 'mac');
const payloadRoot = join(releaseDir, 'pkg-root');
const payloadApp = join(payloadRoot, 'jx Tools');
const pkgPath = join(releaseDir, 'jxTools-2.0.1-mac.pkg');

rmSync(releaseDir, { recursive: true, force: true });
mkdirSync(payloadApp, { recursive: true });
for (const item of ['CSXS', 'client', 'host', 'update', 'README.md', 'Product description.txt', 'progress.txt', 'fixes.txt', '.gitignore']) {
  const from = join(root, item);
  const to = join(payloadApp, item);
  if (existsSync(from)) cpSync(from, to, { recursive: true });
}
writeFileSync(join(payloadApp, 'Installer note.txt'), 'Install this folder into Adobe CEP extensions.\n');

const scriptsDir = join(root, 'build', 'pkg-scripts');
mkdirSync(scriptsDir, { recursive: true });

execFileSync('pkgbuild', [
  '--root', payloadRoot,
  '--identifier', 'com.jx.tools.extension',
  '--version', '2.0.1',
  '--install-location', '/Library/Application Support/Adobe/CEP/extensions',
  pkgPath,
], { stdio: 'inherit' });

console.log(pkgPath);
