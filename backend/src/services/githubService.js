const fs = require('fs/promises');
const path = require('path');
const simpleGit = require('simple-git');
const { parseGitHubUrl } = require('../utils/repoParser');

const TEMP_BASE = process.env.TEMP_DIR || path.join(__dirname, '../../temp_repos');

async function ensureTempDir() {
  await fs.mkdir(TEMP_BASE, { recursive: true });
}

async function removeDir(dirPath) {
  try {
    await fs.rm(dirPath, { recursive: true, force: true });
  } catch (err) {
    console.warn('[GitHub] Falha ao remover temp:', dirPath, err.message);
  }
}

async function cloneRepository(repoUrl) {
  const parsed = parseGitHubUrl(repoUrl);
  if (!parsed.valid) {
    const error = new Error(parsed.error);
    error.statusCode = 400;
    throw error;
  }

  await ensureTempDir();

  const folderName = `${parsed.owner}-${parsed.repo}-${Date.now()}`;
  const targetPath = path.join(TEMP_BASE, folderName);

  const git = simpleGit();

  try {
    await git.clone(parsed.cloneUrl, targetPath, ['--depth', '1', '--single-branch']);
  } catch (err) {
    await removeDir(targetPath);

    const message = String(err.message || err);
    if (
      message.includes('not found') ||
      message.includes('Repository not found') ||
      message.includes('could not read Username') ||
      message.includes('fatal: repository')
    ) {
      const notFound = new Error(
        'Repositório não encontrado ou não é público. Verifique a URL.'
      );
      notFound.statusCode = 404;
      throw notFound;
    }

    const cloneError = new Error(
      'Não foi possível clonar o repositório. Verifique se ele existe e é público.'
    );
    cloneError.statusCode = 502;
    throw cloneError;
  }

  return {
    localPath: targetPath,
    parsed,
    cleanup: () => removeDir(targetPath),
  };
}

module.exports = { cloneRepository, removeDir, TEMP_BASE };
