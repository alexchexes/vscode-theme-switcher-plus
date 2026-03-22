import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const rootDir = join(__dirname, '..');
const packageJsonPath = join(rootDir, 'package.json');
const packageJson = JSON.parse(readFileSync(packageJsonPath, 'utf8'));
const vsixPath = join(
  rootDir,
  `${packageJson.name}-${packageJson.version}.vsix`,
);
const codeCli = process.platform === 'win32' ? 'code.cmd' : 'code';

const result = spawnSync(
  codeCli,
  ['--install-extension', vsixPath, '--force'],
  {
    cwd: rootDir,
    shell: process.platform === 'win32',
    stdio: 'inherit',
  },
);

if (result.error) {
  console.error(
    `Failed to run ${codeCli}. Make sure the VS Code 'code' CLI is installed and on PATH.`,
  );
  console.error(result.error.message);
  process.exit(1);
}

process.exit(result.status ?? 1);
