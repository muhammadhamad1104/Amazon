import fs from 'fs';
import os from 'os';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const backendRoot = path.resolve(__dirname, '..');

const DEFAULT_UPLOADS_DIR = path.resolve(os.homedir(), 'irfwardrobe-uploads');

const resolveConfiguredUploadsPath = () => {
  const configuredPath = (process.env.UPLOADS_DIR || '').trim();

  if (!configuredPath) {
    return DEFAULT_UPLOADS_DIR;
  }

  if (path.isAbsolute(configuredPath)) {
    return path.resolve(configuredPath);
  }

  return path.resolve(backendRoot, configuredPath);
};

export const legacyUploadsPath = path.resolve(backendRoot, 'uploads');
export const uploadsPath = resolveConfiguredUploadsPath();

const arePathsSame = (leftPath, rightPath) => {
  const normalizedLeft = path.resolve(leftPath).replace(/\\+/g, '/').toLowerCase();
  const normalizedRight = path.resolve(rightPath).replace(/\\+/g, '/').toLowerCase();
  return normalizedLeft === normalizedRight;
};

const ensureDirectory = (dirPath) => {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }
};

const copyMissingFilesRecursively = (sourceDir, destinationDir) => {
  let copiedCount = 0;

  const entries = fs.readdirSync(sourceDir, { withFileTypes: true });

  entries.forEach((entry) => {
    const sourcePath = path.join(sourceDir, entry.name);
    const destinationPath = path.join(destinationDir, entry.name);

    if (entry.isDirectory()) {
      ensureDirectory(destinationPath);
      copiedCount += copyMissingFilesRecursively(sourcePath, destinationPath);
      return;
    }

    if (!entry.isFile()) {
      return;
    }

    if (!fs.existsSync(destinationPath)) {
      fs.copyFileSync(sourcePath, destinationPath);
      copiedCount += 1;
    }
  });

  return copiedCount;
};

const migrateLegacyUploads = () => {
  const shouldMigrate = String(process.env.MIGRATE_LEGACY_UPLOADS || 'true').toLowerCase() !== 'false';

  if (!shouldMigrate || arePathsSame(uploadsPath, legacyUploadsPath)) {
    return 0;
  }

  if (!fs.existsSync(legacyUploadsPath)) {
    return 0;
  }

  return copyMissingFilesRecursively(legacyUploadsPath, uploadsPath);
};

export const ensureUploadsStorageReady = () => {
  ensureDirectory(uploadsPath);
  const migratedCount = migrateLegacyUploads();

  return {
    uploadsPath,
    legacyUploadsPath,
    migratedCount,
    usesLegacyPath: arePathsSame(uploadsPath, legacyUploadsPath)
  };
};
