/**
 * Empacota skills/narrativa-marca em um zip pronto para upload na Anthropic Skills API.
 *
 * Uso: node scripts/pack-narrativa-marca-skill.mjs
 * Saída: dist/narrativa-marca-skill.zip
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { execFileSync } from 'child_process';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');
const skillDir = path.join(root, 'skills', 'narrativa-marca');
const outDir = path.join(root, 'dist');
const outZip = path.join(outDir, 'narrativa-marca-skill.zip');

if (!fs.existsSync(path.join(skillDir, 'SKILL.md'))) {
  console.error('SKILL.md não encontrado em', skillDir);
  process.exit(1);
}

fs.mkdirSync(outDir, { recursive: true });
if (fs.existsSync(outZip)) fs.unlinkSync(outZip);

const isWin = process.platform === 'win32';
if (isWin) {
  execFileSync(
    'powershell.exe',
    [
      '-NoProfile',
      '-Command',
      `Compress-Archive -Path '${skillDir}\\*' -DestinationPath '${outZip}' -Force`,
    ],
    { stdio: 'inherit' }
  );
} else {
  execFileSync('zip', ['-r', outZip, '.'], { cwd: skillDir, stdio: 'inherit' });
}

const bytes = fs.statSync(outZip).size;
const mb = (bytes / (1024 * 1024)).toFixed(2);
console.log(`OK ${outZip} (${mb} MB)`);
if (bytes > 30 * 1024 * 1024) {
  console.error('Atenção: zip acima do limite de 30 MB da Skills API');
  process.exit(1);
}
