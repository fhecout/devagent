function cleanSummary(text) {
  if (!text) return 'Análise concluída';
  if (/^(import |const |function |```)/m.test(text)) return 'Análise concluída';
  return text.length > 100 ? `${text.slice(0, 100)}…` : text;
}

export default function AnalysisHistory({ items, selectedId, onSelect, loading }) {
  return (
    <aside className="rounded-2xl border border-surface-600 bg-surface-800/70 p-4">
      <h2 className="text-sm font-semibold text-white mb-3">Histórico</h2>

      {loading && <p className="text-xs text-slate-500 animate-pulse">Carregando...</p>}

      {!loading && items.length === 0 && (
        <p className="text-xs text-slate-500">Nenhuma análise ainda.</p>
      )}

      <ul className="space-y-2 max-h-[320px] overflow-y-auto">
        {items.map((item) => (
          <li key={item.id}>
            <button
              type="button"
              onClick={() => onSelect(item.id)}
              className={`w-full text-left rounded-xl px-3 py-2.5 text-xs transition-colors border ${
                selectedId === item.id
                  ? 'border-accent/50 bg-accent/10 text-white'
                  : 'border-transparent hover:border-surface-600 hover:bg-surface-700/50 text-slate-300'
              }`}
            >
              <span className="font-mono text-accent block truncate">{item.repoName}</span>
              <span className="text-slate-500 mt-1 block line-clamp-2">
                {cleanSummary(item.summary)}
              </span>
              <span className="text-slate-600 mt-1 block">
                {item.technicalScore != null && `★ ${item.technicalScore}/10 · `}
                {new Date(item.createdAt).toLocaleDateString('pt-BR')}
              </span>
            </button>
          </li>
        ))}
      </ul>
    </aside>
  );
}
