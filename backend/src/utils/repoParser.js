const GITHUB_REPO_REGEX =
  /^https?:\/\/(?:www\.)?github\.com\/([a-zA-Z0-9_.-]+)\/([a-zA-Z0-9_.-]+?)(?:\.git)?\/?$/i;

function parseGitHubUrl(repoUrl) {
  if (!repoUrl || typeof repoUrl !== 'string') {
    return { valid: false, error: 'Informe a URL do repositório GitHub.' };
  }

  const trimmed = repoUrl.trim();
  const match = trimmed.match(GITHUB_REPO_REGEX);

  if (!match) {
    return {
      valid: false,
      error:
        'URL inválida. Use o formato: https://github.com/usuario/repositorio',
    };
  }

  const owner = match[1];
  const repo = match[2].replace(/\.git$/i, '');

  return {
    valid: true,
    owner,
    repo,
    repoName: `${owner}/${repo}`,
    cloneUrl: `https://github.com/${owner}/${repo}.git`,
    zipUrl: `https://github.com/${owner}/${repo}/archive/refs/heads/main.zip`,
    webUrl: `https://github.com/${owner}/${repo}`,
  };
}

module.exports = { parseGitHubUrl, GITHUB_REPO_REGEX };
