import ReportCard from './ReportCard';

function ScoreBadge({ score }) {
  if (score == null) return null;
  const color =
    score >= 8 ? 'text-emerald-400' : score >= 6 ? 'text-amber-400' : 'text-rose-400';

  return (
    <div className="rounded-2xl border border-surface-600 bg-surface-800 p-6 flex flex-col sm:flex-row items-center gap-4 justify-between">
      <div>
        <p className="text-xs uppercase tracking-wider text-slate-500">Nota técnica</p>
        <p className="text-sm text-slate-400 mt-1">Avaliação geral do projeto (0–10)</p>
      </div>
      <div className={`text-5xl font-bold font-mono ${color}`}>
        {score}
        <span className="text-2xl text-slate-500">/10</span>
      </div>
    </div>
  );
}

export default function AnalysisReport({ analysis }) {
  const sections = analysis?.report?.sections || {};
  const meta = analysis;

  const cards = [
    { key: 'summary', title: 'Resumo', icon: '📋', highlight: true },
    { key: 'stack', title: 'Stack identificada', icon: '⚙️' },
    { key: 'architecture', title: 'Arquitetura', icon: '🏗️' },
    { key: 'strengths', title: 'Pontos fortes', icon: '✅' },
    { key: 'improvements', title: 'Melhorias', icon: '🔧' },
    { key: 'risks', title: 'Riscos técnicos', icon: '⚠️' },
    { key: 'nextCommits', title: 'Próximos commits', icon: '📝' },
    { key: 'readmeSuggestions', title: 'README', icon: '📖' },
    { key: 'linkedInPost', title: 'Post para LinkedIn', icon: '💼', highlight: true },
    { key: 'conclusion', title: 'Conclusão', icon: '🎯' },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center gap-2 text-sm text-slate-400">
        <span className="font-mono text-accent">{meta.repoName}</span>
        <span>·</span>
        <span>Modelo: {meta.modelUsed}</span>
        {meta.createdAt && (
          <>
            <span>·</span>
            <span>{new Date(meta.createdAt).toLocaleString('pt-BR')}</span>
          </>
        )}
      </div>

      <ScoreBadge score={meta.technicalScore} />

      <div className="grid gap-4 md:grid-cols-2">
        {cards.map(({ key, title, icon, highlight }) => (
          <ReportCard
            key={key}
            title={title}
            content={sections[key]}
            icon={icon}
            highlight={highlight}
          />
        ))}
      </div>

      {sections.technicalScore && (
        <ReportCard title="Nota técnica (detalhes)" content={sections.technicalScore} icon="⭐" />
      )}
    </div>
  );
}
