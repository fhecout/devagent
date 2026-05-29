/**
 * Camada de compatibilidade — perfil dinâmico via projectBriefBuilder.
 */
const {
  buildProjectBrief,
  formatBriefForPrompt,
  correctSummary,
  summaryAlignsWithBrief,
  getFilePriority,
} = require('./projectBriefBuilder');

function extractReadmeIdentity(readme, githubRepoName, packageJson) {
  const brief = buildProjectBrief({
    readme,
    githubRepoName,
    packageJson,
    allPaths: [],
  });
  return {
    title: brief.identity.title,
    description: brief.identity.tagline,
    source: brief.hasReadme ? 'readme' : 'metadata',
  };
}

function classifyProject(readme, packageJson, allPaths) {
  const brief = buildProjectBrief({
    readme,
    githubRepoName: '',
    packageJson,
    allPaths,
  });
  return brief.capabilities;
}

function buildOfficialSummary(profile, _types, _githubRepoName) {
  return profile?.description || profile?.tagline || '';
}

function formatIdentityBlock(profile, types, githubRepoName, packageJson) {
  const brief = buildProjectBrief({
    readme: null,
    githubRepoName,
    packageJson,
    allPaths: [],
  });
  brief.identity.title = profile?.title || brief.identity.title;
  brief.identity.tagline = profile?.description || brief.identity.tagline;
  brief.capabilities = types?.length ? types : brief.capabilities;
  return formatBriefForPrompt(brief);
}

function summaryContradictsProfile(summary, briefOrTypes) {
  if (briefOrTypes?.purpose) {
    return !summaryAlignsWithBrief(summary, briefOrTypes);
  }
  return !summary?.trim();
}

module.exports = {
  extractReadmeIdentity,
  classifyProject,
  buildOfficialSummary,
  formatIdentityBlock,
  formatBriefForPrompt,
  buildProjectBrief,
  correctSummary,
  summaryContradictsProfile,
  getFilePriority,
};
