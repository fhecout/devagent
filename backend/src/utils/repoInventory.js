const fs = require('fs/promises');
const path = require('path');
const { shouldIgnoreDir } = require('./fileFilters');

/**
 * Inventário completo do repositório (sem filtro de extensão).
 * Usado apenas para metadados: .gitignore, README, testes, etc.
 */
async function inventoryRepository(rootPath, relative = '', paths = []) {
  if (paths.length > 5000) return paths;

  let entries;
  try {
    entries = await fs.readdir(path.join(rootPath, relative), { withFileTypes: true });
  } catch {
    return paths;
  }

  for (const entry of entries) {
    const rel = relative ? `${relative}/${entry.name}` : entry.name;

    if (entry.isDirectory()) {
      if (shouldIgnoreDir(entry.name)) continue;
      await inventoryRepository(rootPath, rel, paths);
    } else if (entry.isFile()) {
      paths.push(rel.replace(/\\/g, '/'));
    }
  }

  return paths;
}

function basenameMatch(paths, name) {
  const target = name.toLowerCase();
  return paths.some((p) => path.basename(p).toLowerCase() === target);
}

function pathMatch(paths, pattern) {
  return paths.some((p) => pattern.test(p));
}

async function readRootFile(rootPath, filename, maxChars = 2000) {
  const full = path.join(rootPath, filename);
  try {
    const content = await fs.readFile(full, 'utf8');
    return content.length > maxChars ? `${content.slice(0, maxChars)}\n...[truncado]` : content;
  } catch {
    return null;
  }
}

async function buildVerifiedFacts(rootPath, allPaths) {
  const hasGitignore = basenameMatch(allPaths, '.gitignore');
  const hasGitattributes = basenameMatch(allPaths, '.gitattributes');
  const hasReadme =
    basenameMatch(allPaths, 'README.md') || basenameMatch(allPaths, 'readme.md');
  const hasEnvCommitted = basenameMatch(allPaths, '.env');
  const hasEnvExample =
    basenameMatch(allPaths, '.env.example') || pathMatch(allPaths, /\.env\.example$/i);
  const hasPackageJson = basenameMatch(allPaths, 'package.json');
  const hasLicense =
    basenameMatch(allPaths, 'LICENSE') ||
    basenameMatch(allPaths, 'LICENSE.md') ||
    basenameMatch(allPaths, 'license');

  const gitignorePreview = hasGitignore
    ? await readRootFile(rootPath, '.gitignore', 1500)
    : null;

  return {
    hasGitignore,
    hasGitattributes,
    hasReadme,
    hasEnvCommitted,
    hasEnvExample,
    hasPackageJson,
    hasLicense,
    gitignorePreview,
    totalFilesInRepo: allPaths.length,
  };
}

function formatVerifiedFactsForPrompt(facts) {
  return [
    '## FATOS VERIFICADOS NO REPOSITÓRIO (não contradiga estes dados)',
    `- .gitignore: ${facts.hasGitignore ? 'PRESENTE' : 'ausente'}`,
    `- README: ${facts.hasReadme ? 'PRESENTE' : 'ausente'}`,
    `- package.json: ${facts.hasPackageJson ? 'presente' : 'ausente'}`,
    `- .env commitado: ${facts.hasEnvCommitted ? 'SIM (risco)' : 'não detectado'}`,
    `- Total de arquivos no repo: ${facts.totalFilesInRepo}`,
    facts.gitignorePreview
      ? `\n### Trecho do .gitignore\n\`\`\`\n${facts.gitignorePreview}\n\`\`\``
      : '',
  ].join('\n');
}

module.exports = {
  inventoryRepository,
  buildVerifiedFacts,
  formatVerifiedFactsForPrompt,
  basenameMatch,
  pathMatch,
};
