const SECTION_KEYS = [
  'summary',
  'stack',
  'architecture',
  'strengths',
  'improvements',
  'risks',
  'nextCommits',
  'readmeSuggestions',
  'technicalScore',
  'featureIdeas',
  'linkedInPost',
  'conclusion',
];

const SECTION_MAP = [
  { key: 'summary', patterns: [/resumo\s+geral/i, /^resumo$/i] },
  { key: 'stack', patterns: [/stack\s+identificada/i, /^stack$/i] },
  { key: 'architecture', patterns: [/arquitetura\s+prov[aá]vel/i, /^arquitetura/i] },
  { key: 'strengths', patterns: [/pontos\s+fortes/i] },
  { key: 'improvements', patterns: [/pontos\s+de\s+melhoria/i, /^melhorias/i] },
  { key: 'risks', patterns: [/poss[ií]veis\s+riscos/i, /riscos\s+t[eé]cnicos/i] },
  {
    key: 'nextCommits',
    patterns: [/pr[oó]ximos\s+commits/i, /sugest[oõ]es\s+de\s+commits/i],
  },
  { key: 'readmeSuggestions', patterns: [/melhorar\s+o\s+readme/i, /^readme/i] },
  { key: 'technicalScore', patterns: [/nota\s+t[eé]cnica/i] },
  {
    key: 'featureIdeas',
    patterns: [/ideias\s+de\s+funcionalidades/i, /novas\s+funcionalidades/i, /feature/i],
  },
  { key: 'linkedInPost', patterns: [/post\s+para\s+linkedin/i, /^linkedin/i] },
  { key: 'conclusion', patterns: [/conclus[aã]o/i] },
];

const JSON_KEY_MAP = {
  resumo: 'summary',
  resumogeral: 'summary',
  summary: 'summary',
  stack: 'stack',
  stackidentificada: 'stack',
  arquitetura: 'architecture',
  arquiteturaprovavel: 'architecture',
  architecture: 'architecture',
  pontosfortes: 'strengths',
  strengths: 'strengths',
  pontosdemelhoria: 'improvements',
  melhorias: 'improvements',
  improvements: 'improvements',
  riscos: 'risks',
  riscostecnicos: 'risks',
  risks: 'risks',
  proximoscommits: 'nextCommits',
  nextcommits: 'nextCommits',
  readme: 'readmeSuggestions',
  readmesuggestions: 'readmeSuggestions',
  notatecnica: 'technicalScore',
  technicalscore: 'technicalScore',
  nota: 'technicalScore',
  featureideas: 'featureIdeas',
  ideiasdefuncionalidades: 'featureIdeas',
  funcionalidades: 'featureIdeas',
  linkedin: 'linkedInPost',
  linkedinpost: 'linkedInPost',
  conclusao: 'conclusion',
  conclusion: 'conclusion',
};

const BAD_SUMMARY_PATTERNS = [
  /código omitido/i,
  /aqui está o código/i,
  /espero que isso ajude/i,
  /filemanager\.js/i,
  /\[código/i,
];

function emptySections() {
  return Object.fromEntries(SECTION_KEYS.map((k) => [k, '']));
}

function normalizeKey(rawKey) {
  return rawKey
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9]/g, '')
    .toLowerCase();
}

function normalizeHeading(line) {
  return line
    .replace(/^#+\s*/, '')
    .replace(/^\d+\.\s*/, '')
    .replace(/\*+/g, '')
    .replace(/:$/, '')
    .trim()
    .toLowerCase();
}

function matchSection(heading) {
  for (const section of SECTION_MAP) {
    if (section.patterns.some((p) => p.test(heading))) {
      return section.key;
    }
  }
  return null;
}

function tryParseJson(text) {
  const trimmed = text.trim();

  try {
    return JSON.parse(trimmed);
  } catch {
    /* continue */
  }

  const fence = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fence) {
    try {
      return JSON.parse(fence[1].trim());
    } catch {
      /* continue */
    }
  }

  const start = trimmed.indexOf('{');
  const end = trimmed.lastIndexOf('}');
  if (start >= 0 && end > start) {
    try {
      return JSON.parse(trimmed.slice(start, end + 1));
    } catch {
      /* continue */
    }
  }

  return null;
}

function mapJsonToSections(obj) {
  const sections = emptySections();

  for (const [rawKey, value] of Object.entries(obj)) {
    const norm = normalizeKey(rawKey);
    const key = JSON_KEY_MAP[norm];
    if (key && value != null) {
      sections[key] =
        typeof value === 'string' ? value.trim() : JSON.stringify(value, null, 2);
    }
  }

  return sections;
}

function parseMarkdownSections(markdown) {
  const sections = emptySections();
  const lines = markdown.split('\n');
  let currentKey = null;
  const buffers = {};

  for (const line of lines) {
    const isHeading =
      /^#{1,4}\s+/.test(line) ||
      /^\*\*([^*]+)\*\*:?\s*$/.test(line.trim()) ||
      /^([A-Za-zÀ-ú\s]{3,45}):\s*$/.test(line.trim());

    if (isHeading) {
      const heading = normalizeHeading(line);
      const key = matchSection(heading);
      if (key) {
        currentKey = key;
        if (!buffers[currentKey]) buffers[currentKey] = [];
        continue;
      }
    }

    if (currentKey) {
      if (!buffers[currentKey]) buffers[currentKey] = [];
      buffers[currentKey].push(line);
    }
  }

  for (const [key, buf] of Object.entries(buffers)) {
    sections[key] = buf.join('\n').trim();
  }

  return sections;
}

function hasContent(sections) {
  return SECTION_KEYS.some((k) => sections[k]?.trim().length > 0);
}

function isBadSummary(text) {
  if (!text?.trim()) return true;
  return BAD_SUMMARY_PATTERNS.some((p) => p.test(text));
}

function parseReport(markdown) {
  if (!markdown || typeof markdown !== 'string') {
    return { sections: emptySections(), score: null, raw: '', parseMode: 'empty' };
  }

  const raw = markdown.trim();
  let sections = emptySections();
  let parseMode = 'markdown';

  const json = tryParseJson(raw);
  if (json && typeof json === 'object' && !Array.isArray(json)) {
    sections = mapJsonToSections(json);
    parseMode = 'json';
  }

  if (!hasContent(sections)) {
    sections = parseMarkdownSections(raw);
    parseMode = 'markdown';
  }

  if (isBadSummary(sections.summary)) {
    sections.summary = '';
  }

  if (!hasContent(sections)) {
    parseMode = 'invalid';
  }

  const score = extractScore(sections.technicalScore || raw);
  return { sections, score, raw, parseMode };
}

function extractScore(text) {
  if (!text) return null;
  const patterns = [
    /(\d+(?:[.,]\d+)?)\s*\/\s*10/,
    /nota[:\s]*(\d+(?:[.,]\d+)?)/i,
    /(\d+(?:[.,]\d+)?)\s*de\s*10/i,
    /score[:\s]*(\d+(?:[.,]\d+)?)/i,
    /^(\d+(?:[.,]\d+)?)\s*[—–-]/,
  ];

  for (const pattern of patterns) {
    const match = String(text).match(pattern);
    if (match) {
      const value = parseFloat(match[1].replace(',', '.'));
      if (!Number.isNaN(value) && value >= 0 && value <= 10) {
        return Math.round(value * 10) / 10;
      }
    }
  }
  return null;
}

function sanitizeSummary(text) {
  if (!text || typeof text !== 'string' || isBadSummary(text)) {
    return 'Análise concluída — veja o painel de melhorias e a nota técnica.';
  }

  const trimmed = text.trim();
  const looksLikeCode =
    /^(import |export |const |let |var |function |class |async )/m.test(trimmed) ||
    trimmed.length > 400;

  if (looksLikeCode) {
    return 'Análise concluída — veja o painel de melhorias e a nota técnica.';
  }

  return trimmed.replace(/\s+/g, ' ').slice(0, 220);
}

function mergeSections(primary, fallback) {
  const merged = emptySections();
  for (const key of SECTION_KEYS) {
    const a = primary?.[key]?.trim?.();
    const b = fallback?.[key]?.trim?.();
    merged[key] = a && !isBadSummary(a) ? a : b || '';
  }
  return merged;
}

module.exports = {
  parseReport,
  extractScore,
  sanitizeSummary,
  mergeSections,
  isBadSummary,
  SECTION_KEYS,
};
