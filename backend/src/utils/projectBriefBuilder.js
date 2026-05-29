const path = require('path');

const ENTRY_POINT_PATTERNS = [
  /^src\/index\.(js|ts|tsx|jsx)$/i,
  /^src\/main\.(js|ts|tsx|jsx)$/i,
  /^src\/server\.(js|ts)$/i,
  /^src\/app\.(js|ts|tsx|jsx)$/i,
  /^index\.(js|ts|tsx|jsx)$/i,
  /^main\.(js|ts|py|go)$/i,
  /^server\.(js|ts)$/i,
  /^app\.(py|tsx|jsx)$/i,
  /^manage\.py$/i,
  /^Program\.cs$/i,
  /^cmd\/[^/]+\/main\.go$/i,
  /^electron\/main\.(js|ts)$/i,
  /src\/core\/agent\.(js|ts)$/i,
];

const LAYER_PATTERNS = [
  { label: 'API/Rotas', pattern: /\/(routes?|api|endpoints?)\//i },
  { label: 'Controllers', pattern: /\/controllers?\//i },
  { label: 'Services', pattern: /\/services?\//i },
  { label: 'Models/Domain', pattern: /\/(models?|domain|entities)\//i },
  { label: 'Components/UI', pattern: /\/(components?|ui|views?|pages?)\//i },
  { label: 'Core', pattern: /\/(core|lib|internal)\//i },
  { label: 'Tools/Plugins', pattern: /\/(tools?|plugins?|extensions?)\//i },
  { label: 'Config', pattern: /\/(config|settings)\//i },
  { label: 'Tests', pattern: /\/(tests?|__tests__|spec)\//i },
];

const MANIFEST_FILES = [
  { file: 'package.json', type: 'node' },
  { file: 'pyproject.toml', type: 'python' },
  { file: 'requirements.txt', type: 'python' },
  { file: 'go.mod', type: 'go' },
  { file: 'Cargo.toml', type: 'rust' },
  { file: 'composer.json', type: 'php' },
  { file: 'pom.xml', type: 'java' },
  { file: 'build.gradle', type: 'java' },
];

/**
 * Lê o README linha a linha e extrai seções markdown.
 */
function parseReadmeSections(readme) {
  if (!readme) return [];

  const lines = readme.split('\n');
  const sections = [];
  let current = null;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const heading = line.match(/^(#{1,4})\s+(.+)/);

    if (heading) {
      if (current) sections.push(current);
      current = {
        level: heading[1].length,
        heading: heading[2].replace(/\*+/g, '').trim(),
        lines: [],
        lineStart: i + 1,
      };
      continue;
    }

    if (current) {
      current.lines.push(line);
    } else if (line.trim()) {
      if (!sections.find((s) => s.heading === '__intro__')) {
        sections.unshift({ level: 0, heading: '__intro__', lines: [], lineStart: 0 });
      }
      const intro = sections.find((s) => s.heading === '__intro__');
      intro.lines.push(line);
    }
  }

  if (current) sections.push(current);

  return sections.map((s) => ({
    ...s,
    content: s.lines.join('\n').trim(),
    lineCount: s.lines.filter((l) => l.trim()).length,
  }));
}

function extractIdentity(readmeSections, githubRepoName, packageMeta) {
  let title = githubRepoName || packageMeta?.name || 'Projeto';
  let tagline = '';

  const h1 = readmeSections.find((s) => s.level === 1);
  if (h1) title = h1.heading;

  const intro = readmeSections.find((s) => s.heading === '__intro__');
  if (intro?.content) {
    const para = intro.content
      .split('\n')
      .map((l) => l.trim())
      .find(
        (l) =>
          l.length >= 40 &&
          !l.startsWith('![') &&
          !l.startsWith('```') &&
          !l.startsWith('-') &&
          l !== '---'
      );
    if (para) tagline = para.replace(/\*\*/g, '').trim();
  }

  if (!tagline) {
    for (const s of readmeSections) {
      const para = s.content
        .split('\n')
        .map((l) => l.trim())
        .find((l) => l.length >= 40 && !l.startsWith('-') && !l.startsWith('```'));
      if (para) {
        tagline = para.replace(/\*\*/g, '').trim();
        break;
      }
    }
  }

  if (!tagline && packageMeta?.description) tagline = packageMeta.description.trim();

  return { title, tagline, packageName: packageMeta?.name, githubRepoName };
}

function extractFeatureBullets(readmeSections) {
  const keywords = /features?|funcionalidades|key features|características|capabilities/i;
  const section = readmeSections.find((s) => keywords.test(s.heading));
  if (!section) return [];

  const bullets = [];
  for (const line of section.content.split('\n')) {
    const m = line.match(/^\s*[-*•]\s+\*?\*?(.+)/);
    if (m) bullets.push(m[1].replace(/\*\*/g, '').trim().slice(0, 200));
    if (bullets.length >= 12) break;
  }
  return bullets;
}

function detectStackFromPackage(packageMeta) {
  if (!packageMeta) return { runtime: [], frameworks: [], databases: [], ai: [] };

  const deps = {
    ...packageMeta.dependencies,
    ...packageMeta.devDependencies,
  };
  const names = Object.keys(deps).map((d) => d.toLowerCase());
  const runtime = ['Node.js'];
  const frameworks = [];
  const databases = [];
  const ai = [];

  const map = [
    ['react', 'React'],
    ['vue', 'Vue'],
    ['angular', 'Angular'],
    ['next', 'Next.js'],
    ['express', 'Express'],
    ['fastify', 'Fastify'],
    ['nestjs', 'NestJS'],
    ['electron', 'Electron'],
    ['vite', 'Vite'],
    ['tailwindcss', 'Tailwind CSS'],
    ['prisma', 'Prisma'],
    ['typeorm', 'TypeORM'],
    ['mongoose', 'MongoDB/Mongoose'],
    ['pg', 'PostgreSQL'],
    ['mysql', 'MySQL'],
    ['sqlite', 'SQLite'],
    ['redis', 'Redis'],
    ['ollama', 'Ollama'],
    ['openai', 'OpenAI SDK'],
    ['langchain', 'LangChain'],
    ['django', 'Django'],
    ['flask', 'Flask'],
  ];

  for (const [pkg, label] of map) {
    if (names.includes(pkg)) {
      if (/sql|mongo|redis|prisma|typeorm/i.test(label)) databases.push(label);
      else if (/ollama|openai|langchain/i.test(label)) ai.push(label);
      else frameworks.push(label);
    }
  }

  return { runtime, frameworks, databases, ai };
}

function analyzeArchitecture(allPaths) {
  const entryPoints = allPaths.filter((p) =>
    ENTRY_POINT_PATTERNS.some((rx) => rx.test(p))
  );

  const layers = LAYER_PATTERNS.filter((l) => allPaths.some((p) => l.pattern.test(p))).map(
    (l) => l.label
  );

  const topDirs = new Set();
  for (const p of allPaths) {
    const first = p.split('/')[0];
    if (first && !first.includes('.')) topDirs.add(first);
  }

  const hasMonorepo =
    topDirs.has('packages') ||
    topDirs.has('apps') ||
    allPaths.some((p) => /^packages\/[^/]+\/package\.json$/i.test(p));

  const hasModularTools = allPaths.some((p) => /\/(tools?|plugins?)\//i.test(p));

  let organization = 'estrutura simples';
  if (layers.length >= 3) organization = `camadas: ${layers.join(', ')}`;
  else if (allPaths.some((p) => /^src\//i.test(p))) organization = 'código principal em src/';
  else if (topDirs.size > 6) organization = `múltiplas pastas raiz: ${[...topDirs].slice(0, 8).join(', ')}`;

  return {
    entryPoints: entryPoints.slice(0, 15),
    layers,
    topLevelDirs: [...topDirs].sort().slice(0, 20),
    hasMonorepo,
    hasModularTools,
    organization,
  };
}

function inferCapabilities(readmeSections, stack, architecture, allPaths) {
  const caps = new Set();
  const text = readmeSections.map((s) => `${s.heading}\n${s.content}`).join('\n').toLowerCase();

  stack.frameworks.forEach((f) => caps.add(f));
  stack.databases.forEach((d) => caps.add(d));
  stack.ai.forEach((a) => caps.add(a));

  const signals = [
    [/offline|local|on-?device/i, 'execução local'],
    [/rag|embedding|vector|semantic/i, 'memória semântica / RAG'],
    [/cli|command.?line|terminal/i, 'interface CLI'],
    [/desktop|electron|tauri/i, 'aplicação desktop'],
    [/api|rest|graphql|sse|websocket/i, 'API / comunicação em rede'],
    [/auth|oauth|jwt|login/i, 'autenticação'],
    [/test|jest|vitest|pytest/i, 'testes automatizados'],
    [/docker|kubernetes|deploy/i, 'container / deploy'],
    [/scraper|crawl|cheerio|puppeteer/i, 'web scraping'],
    [/game|multiplayer|lobby/i, 'jogo / tempo real'],
  ];

  for (const [rx, label] of signals) {
    if (rx.test(text) || allPaths.some((p) => rx.test(p))) caps.add(label);
  }

  if (architecture.hasModularTools) caps.add('ferramentas/modulos plugáveis');
  if (architecture.hasMonorepo) caps.add('monorepo');

  return [...caps];
}

function buildPurpose(identity, readmeSections, featureBullets, capabilities) {
  const parts = [];
  if (identity.tagline) parts.push(identity.tagline);
  if (featureBullets.length) {
    parts.push(`Principais capacidades documentadas: ${featureBullets.slice(0, 4).join('; ')}.`);
  }
  if (capabilities.length) {
    parts.push(`Stack/capacidades detectadas: ${capabilities.slice(0, 10).join(', ')}.`);
  }
  return parts.join(' ').slice(0, 2000);
}

function buildAllowedNames(identity, packageMeta) {
  const names = new Set();
  if (identity.githubRepoName) {
    names.add(identity.githubRepoName);
    const short = identity.githubRepoName.split('/').pop();
    if (short) names.add(short);
  }
  if (identity.title) names.add(identity.title);
  if (identity.packageName) names.add(identity.packageName);
  if (packageMeta?.name) names.add(packageMeta.name);
  return [...names].filter(Boolean);
}

/**
 * Monta dossiê dinâmico do projeto — válido para qualquer repositório.
 */
function buildProjectBrief({
  readme,
  githubRepoName,
  packageJson,
  allPaths,
  treeSummary,
  verifiedFacts,
}) {
  const readmeSections = parseReadmeSections(readme);
  const identity = extractIdentity(readmeSections, githubRepoName, packageJson);
  const featureBullets = extractFeatureBullets(readmeSections);
  const stack = detectStackFromPackage(packageJson);
  const architecture = analyzeArchitecture(allPaths);
  const capabilities = inferCapabilities(readmeSections, stack, architecture, allPaths);
  const purpose = buildPurpose(identity, readmeSections, featureBullets, capabilities);

  const readmeDigest = readmeSections
    .filter((s) => s.heading !== '__intro__' && s.content.length > 0)
    .slice(0, 12)
    .map((s) => `### ${s.heading}\n${s.content.slice(0, 1200)}`)
    .join('\n\n');

  return {
    identity,
    purpose,
    featureBullets,
    capabilities,
    stack,
    architecture,
    readmeSections: readmeSections.map((s) => ({
      heading: s.heading,
      lineCount: s.lineCount,
      preview: s.content.slice(0, 400),
    })),
    readmeDigest,
    allowedNames: buildAllowedNames(identity, packageJson),
    verifiedFacts,
    treeSummary,
    hasReadme: Boolean(readme && readme.length > 50),
  };
}

function formatBriefForPrompt(brief) {
  const id = brief.identity;
  const arch = brief.architecture;
  const st = brief.stack;

  return [
    '## DOSSIÊ DO PROJETO (gerado automaticamente — fonte primária da análise)',
    'Use este dossiê para entender O QUE o projeto faz. Não reduza o produto a um único arquivo auxiliar.',
    '',
    '### Identidade',
    `- Repositório: ${id.githubRepoName}`,
    `- Título (README): ${id.title}`,
    `- Pacote: ${id.packageName || 'não identificado'}`,
    `- Nomes válidos: ${brief.allowedNames.join(', ')}`,
    '',
    '### Propósito (síntese do README + estrutura)',
    brief.purpose || 'Não identificado nos arquivos analisados.',
    '',
    '### Capacidades detectadas',
    brief.capabilities.length ? brief.capabilities.join(', ') : 'não identificado',
    '',
    '### Stack',
    `Runtime: ${st.runtime.join(', ') || 'não identificado'}`,
    `Frameworks: ${st.frameworks.join(', ') || 'não identificado'}`,
    `Dados/IA: ${[...st.databases, ...st.ai].join(', ') || 'não identificado'}`,
    '',
    '### Arquitetura',
    `- Organização: ${arch.organization}`,
    `- Pontos de entrada: ${arch.entryPoints.length ? arch.entryPoints.join(', ') : 'não identificado'}`,
    `- Pastas raiz: ${arch.topLevelDirs.join(', ') || 'não identificado'}`,
    arch.hasModularTools
      ? '- Possui pasta tools/plugins: módulos auxiliares, NÃO confundir com o produto principal.'
      : '',
    '',
    '### Seções do README analisadas',
    brief.readmeDigest || '(README ausente ou muito curto)',
    '',
    '### Regras',
    '- summary deve refletir o Propósito acima.',
    '- Não invente nome de pacote que não está em "Nomes válidos".',
    '- featureIdeas: sugira evoluções alinhadas ao propósito real do projeto.',
  ]
    .filter(Boolean)
    .join('\n');
}

function tokenizeForMatch(text) {
  return [
    ...new Set(
      (text || '')
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-z0-9\s]/g, ' ')
        .split(/\s+/)
        .filter((w) => w.length >= 4)
    ),
  ];
}

function summaryAlignsWithBrief(summary, brief) {
  if (!summary?.trim() || !brief?.purpose) return false;

  const summaryTokens = tokenizeForMatch(summary);
  const briefTokens = tokenizeForMatch(brief.purpose + ' ' + brief.allowedNames.join(' '));
  if (!summaryTokens.length || !briefTokens.length) return false;

  const overlap = summaryTokens.filter((t) => briefTokens.includes(t)).length;
  const ratio = overlap / Math.min(summaryTokens.length, briefTokens.length);

  const usesAllowedName = brief.allowedNames.some((n) =>
    summary.toLowerCase().includes(n.toLowerCase().split('/').pop())
  );

  return ratio >= 0.12 || usesAllowedName;
}

function correctSummary(summary, brief) {
  const official = brief.purpose || brief.identity.tagline;
  if (!summary?.trim() || !summaryAlignsWithBrief(summary, brief)) {
    return official || 'Análise baseada na documentação e estrutura do repositório.';
  }
  return summary;
}

function getFilePriority(relativePath, brief) {
  const base = path.basename(relativePath);
  let score = 0;

  if (/^readme\.md$/i.test(base)) score += 200;
  if (/^package\.json$/i.test(base)) score += 150;
  if (/^pyproject\.toml$|^go\.mod$|^cargo\.toml$|^composer\.json$/i.test(base)) score += 140;
  if (/^\.env\.example$/i.test(base) || /^\.gitignore$/i.test(base)) score += 90;
  if (/dockerfile/i.test(base)) score += 85;
  if (/vite\.config|webpack|tsconfig|eslint/i.test(relativePath)) score += 70;

  const entryPoints = brief?.architecture?.entryPoints || [];
  if (entryPoints.includes(relativePath)) score += 120;

  if (/^src\/(core|lib|app)\//i.test(relativePath)) score += 60;
  if (/\/(routes?|controllers?|services?|api)\//i.test(relativePath)) score += 50;
  if (/\/(components?|ui|pages?)\//i.test(relativePath)) score += 45;

  if (brief?.architecture?.hasModularTools && /\/(tools?|plugins?)\//i.test(relativePath)) {
    score -= 35;
  }

  if (/\/tests?\//i.test(relativePath) || /\.test\./i.test(relativePath)) score += 25;

  return score;
}

module.exports = {
  buildProjectBrief,
  formatBriefForPrompt,
  correctSummary,
  summaryAlignsWithBrief,
  getFilePriority,
  parseReadmeSections,
  analyzeArchitecture,
};
