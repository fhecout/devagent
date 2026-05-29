import { useCallback, useEffect, useState } from 'react';
import Header from './components/Header';
import RepoInput from './components/RepoInput';
import LoadingState from './components/LoadingState';
import ReportDashboard from './components/ReportDashboard';
import EmptyReportHint from './components/EmptyReportHint';
import AnalysisHistory from './components/AnalysisHistory';
import {
  analyzeRepository,
  fetchAnalyses,
  fetchAnalysisById,
  checkHealth,
} from './services/api';

export default function App() {
  const [repoUrl, setRepoUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [analysis, setAnalysis] = useState(null);
  const [history, setHistory] = useState([]);
  const [historyLoading, setHistoryLoading] = useState(true);
  const [selectedId, setSelectedId] = useState(null);
  const [ollamaOk, setOllamaOk] = useState(null);

  const loadHistory = useCallback(async () => {
    try {
      setHistoryLoading(true);
      const res = await fetchAnalyses();
      setHistory(res.data || []);
    } catch {
      setHistory([]);
    } finally {
      setHistoryLoading(false);
    }
  }, []);

  useEffect(() => {
    loadHistory();
    checkHealth()
      .then((res) => setOllamaOk(res.data?.ollama))
      .catch(() => setOllamaOk(false));
  }, [loadHistory]);

  const handleAnalyze = async () => {
    setError(null);
    setLoading(true);
    setAnalysis(null);

    try {
      const res = await analyzeRepository(repoUrl.trim());
      setAnalysis(res.data);
      setSelectedId(res.data?.id);
      await loadHistory();
    } catch (err) {
      setError(err.message || 'Erro ao analisar repositório.');
    } finally {
      setLoading(false);
    }
  };

  const handleSelectHistory = async (id) => {
    setError(null);
    setSelectedId(id);
    try {
      const res = await fetchAnalysisById(id);
      setAnalysis(res.data);
    } catch (err) {
      setError(err.message || 'Erro ao carregar análise.');
    }
  };

  return (
    <div className="min-h-screen flex flex-col">
      <Header />

      <main className="flex-1 max-w-5xl mx-auto w-full px-4 sm:px-6 py-8">
        {ollamaOk === false && (
          <div
            role="alert"
            className="mb-6 rounded-xl border border-amber-500/40 bg-amber-500/10 px-4 py-3 text-sm text-amber-200"
          >
            Ollama não detectado. Inicie com <code className="font-mono">ollama serve</code> e
            instale o modelo: <code className="font-mono">ollama pull llama3.1</code>
          </div>
        )}

        <div className="space-y-8">
          <RepoInput
            value={repoUrl}
            onChange={setRepoUrl}
            onSubmit={handleAnalyze}
            loading={loading}
          />

          {error && (
            <div
              role="alert"
              className="rounded-xl border border-rose-500/40 bg-rose-500/10 px-4 py-3 text-sm text-rose-200"
            >
              {error}
            </div>
          )}

          {loading && (
            <LoadingState message="Clonando e analisando o repositório..." />
          )}

          {!loading && analysis && <ReportDashboard analysis={analysis} />}

          {!loading && !analysis && <EmptyReportHint />}

          <div className="border-t border-surface-600/50 pt-6">
            <AnalysisHistory
              items={history}
              selectedId={selectedId}
              onSelect={handleSelectHistory}
              loading={historyLoading}
            />
          </div>
        </div>
      </main>

      <footer className="border-t border-surface-600/50 py-4 text-center text-xs text-slate-600">
        DevAgent Lite — Revisão automática + IA local (Ollama)
      </footer>
    </div>
  );
}
