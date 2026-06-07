const fs = require('fs/promises');
const path = require('path');
const {
  shouldIgnoreDir,
  isAllowedFile,
  truncateContent,
} = require('../utils/fileFilters');
const {
  resolvePathWithinRoot,
  assertPathWithinRoot,
  shouldSkipEntry,
} = require('../utils/pathSafety');
const {
  inventoryRepository,
  buildVerifiedFacts,
  formatVerifiedFactsForPrompt,
} = require('../utils/repoInventory');
const {
  buildProjectBrief,
  formatBriefForPrompt,
  getFilePriority,
} = require('../utils/projectBriefBuilder');

const MAX_FILE_SIZE_KB = parseInt(process.env.MAX_FILE_SIZE_KB || '200', 10);
const MAX_FILES = parseInt(process.env.MAX_FILES_TO_ANALYZE || '80', 10);
const MAX_FILE_BYTES = MAX_FILE_SIZE_KB * 1024;
const MAX_TOTAL_CHARS = 45000;

const PRIORITY_PATTERNS = [
  /^readme\.md$/i,
  /^package\.json$/i,
  /^composer\.json$/i,
  /^pyproject\.toml$/i,
  /^requirements\.txt$/i,
  /^go\.mod$/i,
  /^cargo\.toml$/i,
  /^dockerfile$/i,
  /^\.env\.example$/i,
  /^\.gitignore$/i,
  /vite\.config/i,
  /webpack\.config/i,
  /tsconfig/i,
  /eslint/i,
  /prettier/i,
];

const TEST_PATTERNS = [
  /^tests?\//i,
  /__tests__/i,
  /\.test\./i,
  /\.spec\./i,
  /cypress/i,
  /jest\.config/i,
  /vitest\.config/i,
];

const ARCH_PATTERNS = [
  /routes?\//i,
  /controllers?\//i,
  /services?\//i,
  /models?\//i,
  /middleware/i,
  /components?\//i,
  /pages?\//i,
  /api\//i,
  /src\//i,
];

async function walkDirectory(rootPath, relative = '', collected = [], brief = null) {
  if (collected.length >= MAX_FILES * 3) return collected;

  let entries;
  try {
    entries = await fs.readdir(path.join(rootPath, relative), { withFileTypes: true });
  } catch {
    return collected;
  }

  for (const entry of entries) {
    if (collected.length >= MAX_FILES * 3) break;
    if (shouldSkipEntry(entry)) continue;

    const rel = relative ? `${relative}/${entry.name}` : entry.name;
    const fullPath = resolvePathWithinRoot(rootPath, rel);
    if (!fullPath) continue;

    if (entry.isDirectory()) {
      if (shouldIgnoreDir(entry.name)) continue;
      await walkDirectory(rootPath, rel, collected, brief);
    } else if (entry.isFile()) {
      let stat;
      try {
        stat = await fs.stat(fullPath);
      } catch {
        continue;
      }

      if (stat.size > MAX_FILE_BYTES) continue;
      if (!isAllowedFile(rel, MAX_FILE_BYTES)) continue;

      const relPath = rel.replace(/\\/g, '/');
      collected.push({
        relativePath: relPath,
        fullPath,
        size: stat.size,
        priority: brief ? getFilePriority(relPath, brief) : 0,
      });
    }
  }

  return collected;
}

async function readFileSafe(rootPath, filePath, maxChars = 3500) {
  const safePath = assertPathWithinRoot(rootPath, filePath);
  if (!safePath) return null;

  try {
    const content = await fs.readFile(safePath, 'utf8');
    return truncateContent(content, maxChars);
  } catch {
    return null;
  }
}

async function buildTreeSummary(rootPath, maxDepth = 3) {
  const lines = [];

  async function walk(dir, prefix = '', depth = 0) {
    if (depth > maxDepth || lines.length > 80) return;

    const safeDir = assertPathWithinRoot(rootPath, dir);
    if (!safeDir) return;

    let entries;
    try {
      entries = await fs.readdir(safeDir, { withFileTypes: true });
    } catch {
      return;
    }

    entries.sort((a, b) => a.name.localeCompare(b.name));

    for (const entry of entries.slice(0, 40)) {
      if (lines.length > 80) break;
      if (shouldSkipEntry(entry)) continue;

      const childPath = assertPathWithinRoot(rootPath, path.join(safeDir, entry.name));
      if (!childPath) continue;

      if (entry.isDirectory() && shouldIgnoreDir(entry.name)) continue;

      const branch = `${prefix}${entry.name}${entry.isDirectory() ? '/' : ''}`;
      lines.push(branch);

      if (entry.isDirectory() && depth < maxDepth) {
        await walk(childPath, `${prefix}  `, depth + 1);
      }
    }
  }

  await walk(rootPath);
  return lines.join('\n');
}

function detectFrameworks(fileList, packageJson) {
  const frameworks = new Set();
  const deps = {
    ...(packageJson?.dependencies || {}),
    ...(packageJson?.devDependencies || {}),
  };

  const map = {
    react: 'React',
    vue: 'Vue',
    angular: 'Angular',
    next: 'Next.js',
    express: 'Express',
    fastify: 'Fastify',
    nestjs: 'NestJS',
    laravel: 'Laravel',
    django: 'Django',
    flask: 'Flask',
    spring: 'Spring',
    'react-native': 'React Native',
    tailwindcss: 'Tailwind CSS',
    prisma: 'Prisma',
    typeorm: 'TypeORM',
    vite: 'Vite',
  };

  for (const [pkg, label] of Object.entries(map)) {
    if (deps[pkg]) frameworks.add(label);
  }

  const paths = fileList.map((f) => f.relativePath.toLowerCase());
  if (paths.some((p) => p.includes('dockerfile'))) frameworks.add('Docker');
  if (paths.some((p) => p.endsWith('.py'))) frameworks.add('Python');
  if (paths.some((p) => p.endsWith('.go'))) frameworks.add('Go');
  if (paths.some((p) => p.endsWith('.java'))) frameworks.add('Java');
  if (paths.some((p) => p.endsWith('.cs'))) frameworks.add('.NET/C#');
  if (paths.some((p) => p.endsWith('.php'))) frameworks.add('PHP');
  if (paths.some((p) => p.endsWith('.rb'))) frameworks.add('Ruby');

  return [...frameworks];
}

async function scanRepository(localPath, githubMeta = {}) {
  const inventoryPaths = await inventoryRepository(localPath);
  const verified = await buildVerifiedFacts(localPath, inventoryPaths);

  let readmeEarly = null;
  for (const p of inventoryPaths) {
    if (/^readme\.md$/i.test(path.basename(p))) {
      readmeEarly = await readFileSafe(localPath, path.join(localPath, p), 12000);
      break;
    }
  }

  const packagePath = inventoryPaths.find((p) => /^package\.json$/i.test(path.basename(p)));
  let packageJsonEarly = null;
  if (packagePath) {
    const safePackagePath = resolvePathWithinRoot(localPath, packagePath);
    if (safePackagePath) {
      try {
        packageJsonEarly = JSON.parse(await fs.readFile(safePackagePath, 'utf8'));
      } catch {
        packageJsonEarly = null;
      }
    }
  }

  const tree = await buildTreeSummary(localPath);

  const projectBrief = buildProjectBrief({
    readme: readmeEarly,
    githubRepoName: githubMeta.repoName || githubMeta.repo,
    packageJson: packageJsonEarly,
    allPaths: inventoryPaths,
    treeSummary: tree,
    verifiedFacts: verified,
  });

  const allFiles = await walkDirectory(localPath, '', [], projectBrief);
  allFiles.sort((a, b) => b.priority - a.priority);
  const selected = allFiles.slice(0, MAX_FILES);
  const fileContents = [];
  let totalChars = 0;

  let packageJson = null;
  let readme = null;
  let todoCount = 0;
  let fixmeCount = 0;
  const largeFiles = [];

  const allPaths = inventoryPaths;
  const hasReadme = verified.hasReadme;
  const hasGitignore = verified.hasGitignore;
  const hasEnvCommitted = verified.hasEnvCommitted;
  const hasTests = inventoryPaths.some((p) => TEST_PATTERNS.some((rx) => rx.test(p)));

  for (const file of selected) {
    if (totalChars >= MAX_TOTAL_CHARS) break;

    const content = await readFileSafe(localPath, file.fullPath);
    if (!content) continue;

    const base = path.basename(file.relativePath).toLowerCase();
    if (base === 'package.json') {
      try {
        packageJson = JSON.parse(content);
      } catch {
        packageJson = null;
      }
    }
    if (/^readme\.md$/i.test(base)) {
      readme = content;
    }

    const todos = (content.match(/\bTODO\b/gi) || []).length;
    const fixmes = (content.match(/\bFIXME\b/gi) || []).length;
    todoCount += todos;
    fixmeCount += fixmes;

    if (file.size > 100 * 1024) {
      largeFiles.push({ path: file.relativePath, size: file.size });
    }

    const entry = `### Arquivo: ${file.relativePath}\n\`\`\`\n${content}\n\`\`\``;
    if (totalChars + entry.length > MAX_TOTAL_CHARS) {
      const remaining = MAX_TOTAL_CHARS - totalChars;
      if (remaining > 200) {
        fileContents.push(truncateContent(entry, remaining));
        totalChars += remaining;
      }
      break;
    }

    fileContents.push(entry);
    totalChars += entry.length;
  }

  const frameworks = detectFrameworks(selected, packageJson);
  const scripts = packageJson?.scripts || {};
  const mainDeps = packageJson
    ? Object.keys(packageJson.dependencies || {}).slice(0, 25)
    : [];

  const context = {
    tree,
    readme: readme || 'README não encontrado nos arquivos analisados.',
    packageJsonSummary: packageJson
      ? {
          name: packageJson.name,
          version: packageJson.version,
          description: packageJson.description,
          scripts,
          mainDependencies: mainDeps,
        }
      : null,
    frameworksHint: frameworks,
    filesAnalyzed: selected.map((f) => f.relativePath),
    fileCount: selected.length,
    fileSnippets: fileContents.join('\n\n'),
  };

  const scanMeta = {
    filePaths: selected.map((f) => f.relativePath),
    allFilePaths: allPaths,
    hasReadme,
    hasGitignore,
    hasEnvCommitted,
    hasTests,
    packageJson,
    frameworks,
    todoCount,
    fixmeCount,
    largeFiles: largeFiles.slice(0, 5),
    totalFiles: allPaths.length,
    verified,
    projectBrief,
    projectProfile: {
      title: projectBrief.identity.title,
      description: projectBrief.purpose,
      tagline: projectBrief.identity.tagline,
    },
    projectTypes: projectBrief.capabilities,
    projectHints: [
      projectBrief.identity.title,
      ...projectBrief.capabilities.slice(0, 6),
    ],
    githubRepoName: githubMeta.repoName || githubMeta.repo,
  };

  const verifiedBlock = formatVerifiedFactsForPrompt(verified);
  const briefBlock = formatBriefForPrompt(projectBrief);

  return {
    promptContext: [briefBlock, '', verifiedBlock, '', formatContextForPrompt(context)].join(
      '\n'
    ),
    scanMeta,
  };
}

function formatContextForPrompt(ctx) {
  const parts = [
    '## README completo (referência linha a linha)',
    ctx.readme,
    '',
    '## Árvore resumida de pastas',
    '```',
    ctx.tree || '(vazio)',
    '```',
    '',
  ];

  if (ctx.packageJsonSummary) {
    parts.push(
      '## package.json (resumo)',
      '```json',
      JSON.stringify(ctx.packageJsonSummary, null, 2),
      '```',
      ''
    );
  }

  if (ctx.frameworksHint?.length) {
    parts.push('## Frameworks detectados (heurística)', ctx.frameworksHint.join(', '), '');
  }

  parts.push(
    `## Arquivos analisados (${ctx.fileCount})`,
    ctx.filesAnalyzed.join('\n'),
    '',
    '## Trechos de código (complemento — priorize o dossiê e o README para entender o produto)',
    ctx.fileSnippets
  );

  return parts.join('\n');
}

module.exports = { scanRepository, buildTreeSummary };
