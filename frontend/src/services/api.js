const API_URL = import.meta.env.VITE_API_URL || '';

async function request(path, options = {}) {
  const url = `${API_URL}${path}`;
  const res = await fetch(url, {
    headers: { 'Content-Type': 'application/json', ...options.headers },
    ...options,
  });

  const data = await res.json().catch(() => ({}));

  if (!res.ok) {
    const error = new Error(data.error || 'Erro na requisição.');
    error.status = res.status;
    error.code = data.code;
    throw error;
  }

  return data;
}

export function analyzeRepository(repoUrl) {
  return request('/api/analyze', {
    method: 'POST',
    body: JSON.stringify({ repoUrl }),
  });
}

export function fetchAnalyses(limit = 20) {
  return request(`/api/analyses?limit=${limit}`);
}

export function fetchAnalysisById(id) {
  return request(`/api/analyses/${id}`);
}

export function checkHealth() {
  return request('/api/health');
}
