const githubService = require('./githubService');
const repoScannerService = require('./repoScannerService');
const ollamaService = require('./ollamaService');
const codeReviewService = require('./codeReviewService');
const analysisModel = require('../models/analysisModel');
const { parseGitHubUrl } = require('../utils/repoParser');
const { sanitizeSummary, mergeSections, extractScore } = require('../utils/reportParser');
const { computeTechnicalScore } = require('../utils/scoreCalculator');
const { buildScannerReport } = require('../utils/reportBuilder');
const { correctSummary } = require('../utils/projectBriefBuilder');
const { withAnalysisSlot } = require('../utils/analysisSemaphore');

async function analyzeRepository(repoUrl) {
  const parsed = parseGitHubUrl(repoUrl);
  if (!parsed.valid) {
    const err = new Error(parsed.error);
    err.statusCode = 400;
    throw err;
  }

  return withAnalysisSlot(async () => {
    let cloneResult = null;

    try {
    cloneResult = await githubService.cloneRepository(repoUrl);
    const scanResult = await repoScannerService.scanRepository(cloneResult.localPath, {
      repoName: parsed.repoName,
      repo: parsed.repo,
      owner: parsed.owner,
      webUrl: parsed.webUrl,
    });

    const findings = codeReviewService.runCodeReview(scanResult.scanMeta);

    const findingsText = [
      '## Achados automáticos (scanner — fatos verificados)',
      `Erros: ${findings.errors.length}`,
      ...findings.errors.map((e) => `- [ERRO] ${e.title}: ${e.detail}`),
      `Alertas: ${findings.warnings.length}`,
      ...findings.warnings.map((w) => `- [ALERTA] ${w.title}: ${w.detail}`),
      `Melhorias: ${findings.improvements.length}`,
      ...findings.improvements.map((m) => `- [MELHORIA] ${m.title}: ${m.detail}`),
      `Ideias de funcionalidades: ${findings.featureIdeas.length}`,
      ...findings.featureIdeas.map((f) => `- [FEATURE] ${f.title}: ${f.detail}`),
    ].join('\n');

    const contextWithMeta = [
      `Repositório: ${parsed.repoName}`,
      `URL: ${parsed.webUrl}`,
      '',
      findingsText,
      '',
      scanResult.promptContext,
    ].join('\n');

    let aiResult;
    try {
      aiResult = await ollamaService.generateReport(contextWithMeta);
    } catch (aiErr) {
      aiResult = {
        model: process.env.OLLAMA_MODEL || 'llama3.1',
        raw: '',
        sections: {},
        technicalScore: null,
        parseMode: 'ai-error',
        aiValid: false,
        aiError: aiErr.message,
      };
    }

    const scannerSections = buildScannerReport(findings, scanResult.scanMeta);
    let sections = mergeSections(aiResult.sections, scannerSections);

    if (!aiResult.aiValid) {
      sections = mergeSections(scannerSections, aiResult.sections);
    }

    if (!sections.featureIdeas?.trim() && findings.featureIdeas?.length) {
      sections.featureIdeas = findings.featureIdeas
        .map((f) => `• ${f.title}: ${f.detail}`)
        .join('\n');
    }

    const brief = scanResult.scanMeta.projectBrief;
    sections.summary = correctSummary(sections.summary, brief);

    const aiScore = aiResult.aiValid ? aiResult.technicalScore : extractScore(sections.technicalScore);
    const { score: finalScore, source: scoreSource } = computeTechnicalScore(
      findings,
      scanResult.scanMeta,
      aiScore
    );

    const fullReport = JSON.stringify({
      raw: aiResult.raw,
      sections,
      parseMode: aiResult.parseMode,
      aiValid: aiResult.aiValid,
      scoreSource,
      findings,
      stats: findings.stats,
      projectBrief: scanResult.scanMeta.projectBrief,
      projectProfile: scanResult.scanMeta.projectProfile,
      projectTypes: scanResult.scanMeta.projectTypes,
    });

    const summaryText =
      sections.summary ||
      sections.conclusion ||
      scannerSections.summary ||
      'Análise técnica concluída.';

    const saved = await analysisModel.createAnalysis({
      repoUrl: parsed.webUrl,
      repoName: parsed.repoName,
      modelUsed: aiResult.model,
      technicalScore: finalScore,
      summary: sanitizeSummary(summaryText),
      fullReport,
    });

    const formatted = analysisModel.formatAnalysis(saved);
    formatted.sections = sections;
    formatted.findings = findings;
    formatted.stats = findings.stats;
    formatted.scoreSource = scoreSource;
    formatted.aiValid = aiResult.aiValid;
    formatted.projectBrief = scanResult.scanMeta.projectBrief;
    formatted.projectProfile = scanResult.scanMeta.projectProfile;
    formatted.projectTypes = scanResult.scanMeta.projectTypes;
    return formatted;
    } finally {
      if (cloneResult?.cleanup) {
        await cloneResult.cleanup();
      }
    }
  });
}

async function getHistory(limit = 20) {
  const rows = await analysisModel.listAnalyses(limit);
  return rows.map((row) => ({
    id: row.id,
    repoUrl: row.repo_url,
    repoName: row.repo_name,
    modelUsed: row.model_used,
    technicalScore: row.technical_score,
    summary: sanitizeSummary(row.summary),
    createdAt: row.created_at,
  }));
}

async function getById(id) {
  const row = await analysisModel.getAnalysisById(id);
  if (!row) {
    const err = new Error('Análise não encontrada.');
    err.statusCode = 404;
    throw err;
  }
  const formatted = analysisModel.formatAnalysis(row);
  formatted.summary = sanitizeSummary(formatted.summary);
  return formatted;
}

module.exports = { analyzeRepository, getHistory, getById };
