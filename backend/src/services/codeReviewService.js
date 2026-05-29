const path = require('path');

const TEST_PATTERNS = [
  /^tests?\//i,
  /__tests__/i,
  /\.test\./i,
  /\.spec\./i,
  /cypress/i,
  /playwright/i,
  /jest\.config/i,
  /vitest\.config/i,
];

const STRUCTURE_LAYERS = [
  { label: 'Rotas/API', pattern: /routes?\/|api\//i },
  { label: 'Controllers', pattern: /controllers?\//i },
  { label: 'Services', pattern: /services?\//i },
  { label: 'Models', pattern: /models?\//i },
  { label: 'Components', pattern: /components?\//i },
  { label: 'Pages/Views', pattern: /pages?\//i },
  { label: 'Config', pattern: /config\//i },
  { label: 'Utils', pattern: /utils?\//i },
];

function analyzeStructure(filePaths) {
  const layers = STRUCTURE_LAYERS.filter((l) =>
    filePaths.some((f) => l.pattern.test(f))
  ).map((l) => l.label);

  const hasSrc = filePaths.some((f) => /^src\//i.test(f));
  const rootFiles = filePaths.filter((f) => !f.includes('/')).length;

  const notes = [];
  if (layers.length >= 3) {
    notes.push(`Estrutura em camadas detectada: ${layers.join(', ')}.`);
  } else if (hasSrc) {
    notes.push('Código concentrado em src/, sem muitas camadas nomeadas.');
  } else if (rootFiles > 8) {
    notes.push('Muitos arquivos na raiz — considere organizar em pastas (src, lib, app).');
  } else {
    notes.push('Estrutura simples ou não identificada nos arquivos analisados.');
  }

  return { layers, notes };
}

function suggestFeatureIdeas(scanData) {
  const ideas = [];
  const brief = scanData.projectBrief;
  const pkg = scanData.packageJson;
  const paths = (scanData.allFilePaths || []).join(' ').toLowerCase();
  const caps = (brief?.capabilities || []).join(' ').toLowerCase();
  const title = brief?.identity?.title || scanData.githubRepoName || 'o projeto';

  if (brief?.featureBullets?.length) {
    brief.featureBullets.slice(0, 4).forEach((bullet, i) => {
      ideas.push({
        id: `feat-readme-${i}`,
        severity: 'info',
        title: `Evoluir: ${bullet.slice(0, 70)}${bullet.length > 70 ? '…' : ''}`,
        detail: `Funcionalidade já citada no README — aprofundar com testes, UX e documentação de uso.`,
      });
    });
  }

  const dynamicSuggestions = [
    {
      when: /ollama|ia|rag|embedding|agent/i.test(caps + (brief?.purpose || '')),
      title: 'Painel de configuração de modelos locais',
      detail: 'UI para trocar modelo Ollama, temperatura e validar se o modelo está instalado.',
    },
    {
      when: /electron|desktop/i.test(caps),
      title: 'Atualização automática e instalador',
      detail: 'Distribuição com electron-builder e canal de releases.',
    },
    {
      when: /react|frontend|ui/i.test(caps),
      title: 'Onboarding e tour na interface',
      detail: 'Fluxo guiado para novos usuários entenderem as funções principais.',
    },
    {
      when: /api|rest|sse|websocket/i.test(caps),
      title: 'Documentação OpenAPI da API',
      detail: 'Swagger/OpenAPI gerado a partir das rotas para integração externa.',
    },
    {
      when: /game|multiplayer|lobby|websocket/i.test(caps + paths),
      title: 'Modo espectador e replay de partidas',
      detail: 'Histórico de rodadas e reconexão de jogadores.',
    },
    {
      when: /auth|oauth/i.test(caps),
      title: 'Gestão de sessão e perfis',
      detail: 'Refresh token, logout global e papéis de usuário.',
    },
    {
      when: /scraper|crawl/i.test(caps),
      title: 'Fila de scraping e cache de páginas',
      detail: 'Evitar requisições duplicadas e permitir retomada.',
    },
    {
      when: /cli|terminal/i.test(caps),
      title: 'Comandos interativos e autocomplete',
      detail: 'Melhorar DX do CLI com help contextual e histórico.',
    },
    {
      when: brief?.architecture?.hasModularTools,
      title: 'Marketplace de plugins/tools',
      detail: 'Registrar tools dinamicamente com manifest (nome, permissões, schema).',
    },
    {
      when: /sqlite|postgres|mongo|prisma/i.test(caps),
      title: 'Migrations versionadas',
      detail: 'Scripts de migração de schema com rollback documentado.',
    },
  ];

  dynamicSuggestions.forEach((s, i) => {
    if (s.when && ideas.length < 10) {
      ideas.push({
        id: `feat-dyn-${i}`,
        severity: 'info',
        title: s.title,
        detail: `${s.detail} (alinhado ao propósito de ${title}).`,
      });
    }
  });

  if (!scanData.hasTests && scanData.totalFiles > 3) {
    ideas.push({
      id: 'feat-tests',
      severity: 'info',
      title: 'Ampliar cobertura de testes',
      detail: 'Testes nos pontos de entrada e regras de negócio críticas detectadas na estrutura.',
    });
  }

  if (!paths.includes('github/workflows')) {
    ideas.push({
      id: 'feat-actions',
      severity: 'info',
      title: 'CI no GitHub Actions',
      detail: 'Pipeline com lint, test e build conforme scripts do manifesto do projeto.',
    });
  }

  if (!scanData.hasReadme) {
    ideas.push({
      id: 'feat-readme',
      severity: 'info',
      title: 'Documentar propósito do projeto',
      detail: 'README com problema resolvido, instalação, arquitetura e exemplos.',
    });
  }

  const generic = [
    {
      title: 'Observabilidade',
      detail: 'Métricas e logs estruturados para operações críticas do domínio do projeto.',
    },
    {
      title: 'Modo desenvolvedor / debug',
      detail: 'Flag de debug com traces úteis sem expor dados sensíveis.',
    },
  ];

  generic.forEach((g, i) => {
    if (ideas.length < 10) {
      ideas.push({
        id: `feat-gen-${i}`,
        severity: 'info',
        title: g.title,
        detail: g.detail,
      });
    }
  });

  return ideas.slice(0, 10);
}

function runCodeReview(scanData) {
  const {
    filePaths = [],
    allFilePaths = [],
    hasReadme,
    hasGitignore,
    hasEnvCommitted,
    hasTests,
    packageJson,
    frameworks = [],
    todoCount,
    fixmeCount,
    largeFiles = [],
    totalFiles,
  } = scanData;

  const errors = [];
  const warnings = [];
  const improvements = [];
  const structure = [];

  if (!hasReadme) {
    errors.push({
      id: 'no-readme',
      severity: 'error',
      title: 'README ausente',
      detail: 'Não foi encontrado README.md. Documentação inicial é essencial para onboarding.',
    });
  }

  if (hasEnvCommitted) {
    errors.push({
      id: 'env-committed',
      severity: 'error',
      title: 'Arquivo .env no repositório',
      detail: 'Possível vazamento de segredos. Use .env.example e adicione .env ao .gitignore.',
    });
  }

  if (!hasGitignore) {
    warnings.push({
      id: 'no-gitignore',
      severity: 'warning',
      title: 'Sem .gitignore',
      detail: 'Risco de commitar node_modules, builds ou arquivos locais.',
    });
  }

  if (!hasTests && totalFiles > 5) {
    warnings.push({
      id: 'no-tests',
      severity: 'warning',
      title: 'Testes não identificados',
      detail: 'Nenhuma pasta ou arquivo de teste detectado (tests, __tests__, *.test.*).',
    });
  }

  if (packageJson) {
    const scripts = packageJson.scripts || {};
    if (!scripts.test && !scripts['test:unit'] && !hasTests) {
      improvements.push({
        id: 'no-test-script',
        severity: 'info',
        title: 'Script de testes ausente',
        detail: 'Adicione "test" em package.json scripts para padronizar qualidade.',
      });
    }
    if (!scripts.lint && !scripts.eslint) {
      improvements.push({
        id: 'no-lint',
        severity: 'info',
        title: 'Lint não configurado',
        detail: 'Considere ESLint/Prettier com script npm run lint.',
      });
    }
    if (!packageJson.description) {
      improvements.push({
        id: 'no-description',
        severity: 'info',
        title: 'package.json sem description',
        detail: 'Preencha name, version e description para clareza do projeto.',
      });
    }
  }

  if (todoCount > 0) {
    warnings.push({
      id: 'todos',
      severity: 'warning',
      title: `${todoCount} TODO(s) no código`,
      detail: 'Pendências explícitas no código — revise antes de releases.',
    });
  }

  if (fixmeCount > 0) {
    warnings.push({
      id: 'fixmes',
      severity: 'warning',
      title: `${fixmeCount} FIXME(s) no código`,
      detail: 'Trechos marcados como correção urgente.',
    });
  }

  largeFiles.forEach((f) => {
    warnings.push({
      id: `large-${f.path}`,
      severity: 'warning',
      title: `Arquivo grande: ${f.path}`,
      detail: `${Math.round(f.size / 1024)} KB — considere dividir ou mover para assets.`,
    });
  });

  const { layers, notes } = analyzeStructure(allFilePaths.length ? allFilePaths : filePaths);
  structure.push({
    id: 'layers',
    severity: 'info',
    title: 'Organização do projeto',
    detail: notes[0] || 'Estrutura não mapeada.',
    layers,
  });

  if (hasGitignore) {
    structure.push({
      id: 'gitignore-ok',
      severity: 'info',
      title: '.gitignore presente',
      detail: 'Confirmado por inventário completo do repositório (não apenas arquivos de código).',
    });
  }

  if (frameworks.length) {
    structure.push({
      id: 'stack-hint',
      severity: 'info',
      title: 'Stack detectada (heurística)',
      detail: frameworks.join(', '),
    });
  }

  const extCount = {};
  for (const f of filePaths) {
    const ext = path.extname(f).toLowerCase() || '(sem ext)';
    extCount[ext] = (extCount[ext] || 0) + 1;
  }
  const topExt = Object.entries(extCount)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([e, c]) => `${e}: ${c}`)
    .join(', ');

  if (topExt) {
    structure.push({
      id: 'file-types',
      severity: 'info',
      title: 'Tipos de arquivo analisados',
      detail: topExt,
    });
  }

  const featureIdeas = suggestFeatureIdeas(scanData);

  return {
    errors,
    warnings,
    improvements,
    structure,
    featureIdeas,
    stats: {
      totalFilesScanned: filePaths.length,
      totalFilesInRepo: totalFiles,
      hasReadme,
      hasGitignore,
      hasTests,
      frameworks,
      layers,
    },
  };
}

module.exports = { runCodeReview, analyzeStructure, suggestFeatureIdeas };
