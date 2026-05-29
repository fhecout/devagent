const path = require('path');

const IGNORED_DIRS = new Set([
  'node_modules',
  '.git',
  'dist',
  'build',
  '.next',
  'coverage',
  'vendor',
  '.venv',
  '__pycache__',
  'target',
  'out',
  '.turbo',
  '.cache',
]);

const ALLOWED_EXTENSIONS = new Set([
  '.js',
  '.jsx',
  '.ts',
  '.tsx',
  '.json',
  '.md',
  '.py',
  '.java',
  '.cs',
  '.go',
  '.php',
  '.rb',
  '.html',
  '.css',
  '.scss',
  '.yml',
  '.yaml',
  '.env.example',
]);

const SPECIAL_FILENAMES = new Set([
  'dockerfile',
  'makefile',
  'readme',
  'license',
  'procfile',
]);

/** Arquivos de configuração sem extensão "clássica" — incluídos na análise de conteúdo */
const CONFIG_FILENAMES = new Set([
  '.gitignore',
  '.gitattributes',
  '.dockerignore',
  '.editorconfig',
  '.npmrc',
  '.nvmrc',
  '.prettierrc',
  '.eslintrc',
]);

const IMAGE_EXTENSIONS = new Set([
  '.png',
  '.jpg',
  '.jpeg',
  '.gif',
  '.webp',
  '.svg',
  '.ico',
  '.bmp',
]);

const VIDEO_EXTENSIONS = new Set([
  '.mp4',
  '.webm',
  '.mov',
  '.avi',
  '.mkv',
]);

const LOCK_FILES = new Set([
  'package-lock.json',
  'yarn.lock',
  'pnpm-lock.yaml',
  'composer.lock',
  'poetry.lock',
  'Cargo.lock',
]);

function getExtension(filePath) {
  const ext = path.extname(filePath).toLowerCase();
  if (ext) return ext;
  const base = path.basename(filePath).toLowerCase();
  if (base === 'dockerfile') return '.dockerfile';
  return '';
}

function shouldIgnoreDir(dirName) {
  return IGNORED_DIRS.has(dirName.toLowerCase());
}

function isAllowedFile(filePath, maxFileSizeBytes) {
  const baseName = path.basename(filePath);
  const lowerBase = baseName.toLowerCase();
  const ext = getExtension(filePath);

  if (IMAGE_EXTENSIONS.has(ext) || VIDEO_EXTENSIONS.has(ext)) {
    return false;
  }

  if (lowerBase.endsWith('.pdf')) {
    return false;
  }

  if (LOCK_FILES.has(lowerBase)) {
    return false;
  }

  if (lowerBase === '.env.example' || lowerBase.endsWith('.env.example')) {
    return true;
  }

  if (CONFIG_FILENAMES.has(lowerBase)) {
    return true;
  }

  const nameWithoutExt = lowerBase.replace(/\.[^.]+$/, '');
  if (SPECIAL_FILENAMES.has(nameWithoutExt) || lowerBase === 'dockerfile') {
    return true;
  }

  if (!ALLOWED_EXTENSIONS.has(ext) && ext !== '.dockerfile') {
    return false;
  }

  return { ext, baseName };
}

function truncateContent(content, maxChars = 4000) {
  if (!content || content.length <= maxChars) return content;
  return `${content.slice(0, maxChars)}\n\n... [truncado — arquivo muito grande]`;
}

module.exports = {
  IGNORED_DIRS,
  ALLOWED_EXTENSIONS,
  CONFIG_FILENAMES,
  shouldIgnoreDir,
  isAllowedFile,
  truncateContent,
  getExtension,
};
