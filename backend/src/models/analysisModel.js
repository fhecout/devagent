const { run, get, all } = require('../config/database');

async function createAnalysis({
  repoUrl,
  repoName,
  modelUsed,
  technicalScore,
  summary,
  fullReport,
}) {
  const result = await run(
    `INSERT INTO analyses (repo_url, repo_name, model_used, technical_score, summary, full_report)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [repoUrl, repoName, modelUsed, technicalScore, summary, fullReport]
  );

  return getAnalysisById(result.lastID);
}

async function getAnalysisById(id) {
  return get('SELECT * FROM analyses WHERE id = ?', [id]);
}

async function listAnalyses(limit = 20) {
  return all(
    `SELECT id, repo_url, repo_name, model_used, technical_score, summary, created_at
     FROM analyses
     ORDER BY created_at DESC
     LIMIT ?`,
    [limit]
  );
}

function formatAnalysis(row) {
  if (!row) return null;

  let report = null;
  try {
    report = JSON.parse(row.full_report);
  } catch {
    report = { raw: row.full_report };
  }

  return {
    id: row.id,
    repoUrl: row.repo_url,
    repoName: row.repo_name,
    modelUsed: row.model_used,
    technicalScore: row.technical_score,
    summary: row.summary,
    report,
    findings: report?.findings || null,
    stats: report?.stats || null,
    sections: report?.sections || {},
    scoreSource: report?.scoreSource || null,
    aiValid: report?.aiValid ?? null,
    projectBrief: report?.projectBrief || null,
    projectProfile: report?.projectProfile || null,
    projectTypes: report?.projectTypes || [],
    createdAt: row.created_at,
  };
}

module.exports = {
  createAnalysis,
  getAnalysisById,
  listAnalyses,
  formatAnalysis,
};
