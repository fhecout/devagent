function computeTechnicalScore(findings, scanMeta, aiScore) {
  if (aiScore != null && aiScore >= 0 && aiScore <= 10) {
    return { score: aiScore, source: 'ai' };
  }

  let score = 6.5;

  if (scanMeta?.hasReadme) score += 0.6;
  if (scanMeta?.hasGitignore) score += 0.6;
  if (scanMeta?.hasTests) score += 0.8;
  if (scanMeta?.packageJson?.description) score += 0.3;

  const errors = findings?.errors?.length || 0;
  const warnings = findings?.warnings?.length || 0;

  score -= errors * 1.2;
  score -= warnings * 0.35;
  score -= Math.min((scanMeta?.todoCount || 0) * 0.1, 1);
  score -= Math.min((scanMeta?.fixmeCount || 0) * 0.15, 1);

  score = Math.max(0, Math.min(10, score));
  return { score: Math.round(score * 10) / 10, source: 'heuristic' };
}

module.exports = { computeTechnicalScore };
