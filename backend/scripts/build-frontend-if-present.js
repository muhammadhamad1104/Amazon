import { cpSync, existsSync, rmSync } from 'fs';
import path from 'path';
import { spawnSync } from 'child_process';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const frontendDir = path.resolve(__dirname, '../../frontend');
const frontendPackageJson = path.join(frontendDir, 'package.json');
const frontendLockFile = path.join(frontendDir, 'package-lock.json');
const frontendDistDir = path.join(frontendDir, 'dist');
const backendDistDir = path.resolve(__dirname, '../dist');
const backendDistIndex = path.join(backendDistDir, 'index.html');

if (!existsSync(frontendPackageJson)) {
  if (existsSync(backendDistIndex)) {
    console.log('Frontend source is missing, using existing backend/dist build.');
    process.exit(0);
  }

  console.log('Frontend source and backend/dist build not found. Skipping frontend build.');
  process.exit(0);
}

const npmCommand = process.platform === 'win32' ? 'npm.cmd' : 'npm';

const runStep = (args, stepName) => {
  console.log(`\n${stepName}...`);
  const result = spawnSync(npmCommand, args, {
    cwd: frontendDir,
    stdio: 'inherit'
  });

  if (result.status !== 0) {
    console.error(`${stepName} failed with exit code ${result.status ?? 1}.`);
    process.exit(result.status ?? 1);
  }
};

const installArgs = existsSync(frontendLockFile)
  ? ['ci', '--include=dev']
  : ['install', '--include=dev'];

runStep(installArgs, 'Installing frontend dependencies');
runStep(['run', 'build'], 'Building frontend');

if (!existsSync(frontendDistDir)) {
  console.error('Frontend build finished but dist folder was not created.');
  process.exit(1);
}

rmSync(backendDistDir, { recursive: true, force: true });
cpSync(frontendDistDir, backendDistDir, { recursive: true, force: true });

console.log(`Copied frontend build to ${backendDistDir}.`);

console.log('\nFrontend build completed successfully.');
