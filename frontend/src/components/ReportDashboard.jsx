import { useState } from 'react';
import FindingsPanel from './FindingsPanel';
import ReportSection from './ReportSection';
import { looksLikeCode } from '../utils/formatText';

const TABS = [
  { id: 'overview', label: 'Visão geral' },
  { id: 'issues', label: 'Problemas' },
  { id: 'improve', label: 'Melhorias' },
  { id: 'features', label: 'Funcionalidades' },
  { id: 'structure', label: 'Estrutura' },
  { id: 'ai', label: 'Relatório IA' },
];

function ScoreHero({
  score,
  repoName,
  projectTitle,
  modelUsed,
  createdAt,
  parseMode,
  scoreSource,
  aiValid,
}) {
  const color =
    score == null
      ? 'text-slate-400'
      : score >= 8
        ? 'text-emerald-400'
        : score >= 6
          ? 'text-amber-400'
          : 'text-rose-400';

  return (
    <div className="rounded-2xl border border-surface-600 bg-gradient-to-br from-surface-800 to-surface-900 p-6 shadow-card">
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
        <div className="min-w-0">
          <p className="text-xs uppercase tracking-wider text-slate-500 mb-1">Repositório analisado</p>
          <h2 className="text-xl font-semibold text-white font-mono truncate">{repoName}</h2>
          {projectTitle && (
            <p className="text-sm text-accent/90 mt-1">{projectTitle}</p>
          )}
          <p className="text-xs text-slate-500 mt-2">
            {modelUsed}
            {createdAt && ` · ${new Date(createdAt).toLocaleString('pt-BR')}`}
            {scoreSource && ` · nota: ${scoreSource === 'ai' ? 'IA' : 'calculada'}`}
            {aiValid === false && (
              <span className="text-amber-400"> · IA sem formato válido (usando scanner)</span>
            )}
          </p>
        </div>
        <div className="flex items-center gap-4 shrink-0">
          <div className="text-right">
            <p className="text-xs text-slate-500 uppercase">Nota técnica</p>
            <p className={`text-5xl font-bold font-mono ${color}`}>
              {score != null ? score : '—'}
              <span className="text-lg text-slate-600">/10</span>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function ReportDashboard({ analysis }) {
  const [tab, setTab] = useState('overview');

  const sections = analysis?.sections || analysis?.report?.sections || {};
  const findings = analysis?.findings || analysis?.report?.findings;
  const stats = analysis?.stats || analysis?.report?.stats;
  const raw = analysis?.report?.raw;
  const parseMode = analysis?.report?.parseMode;
  const scoreSource = analysis?.scoreSource || analysis?.report?.scoreSource;
  const aiValid = analysis?.aiValid ?? analysis?.report?.aiValid;
  const projectTitle =
    analysis?.projectBrief?.identity?.title ||
    analysis?.report?.projectBrief?.identity?.title ||
    analysis?.projectProfile?.title;

  const hasAiContent = Object.values(sections).some((v) => v?.trim?.());
  const issueCount = (findings?.errors?.length || 0) + (findings?.warnings?.length || 0);
  const featureCount =
    (findings?.featureIdeas?.length || 0) + (sections.featureIdeas ? 1 : 0);

  const summaryText =
    sections.summary && !looksLikeCode(sections.summary) && !/código omitido/i.test(sections.summary)
      ? sections.summary
      : analysis?.summary && !looksLikeCode(analysis.summary)
        ? analysis.summary
        : 'Análise baseada no scanner do repositório. Confira Melhorias, Funcionalidades e a nota técnica.';

  return (
    <div className="space-y-6">
      <ScoreHero
        score={analysis?.technicalScore}
        repoName={analysis?.repoName}
        projectTitle={projectTitle}
        modelUsed={analysis?.modelUsed}
        createdAt={analysis?.createdAt}
        parseMode={parseMode}
        scoreSource={scoreSource}
        aiValid={aiValid}
      />

      {stats && (
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
          {[
            ['Arquivos', stats.totalFilesInRepo || stats.totalFilesScanned || '—'],
            ['README', stats.hasReadme ? 'Sim' : 'Não'],
            ['.gitignore', stats.hasGitignore ? 'Sim' : 'Não'],
            ['Testes', stats.hasTests ? 'Sim' : 'Não'],
            ['Alertas', issueCount],
          ].map(([label, value]) => (
            <div
              key={label}
              className="rounded-xl border border-surface-600 bg-surface-800/50 px-3 py-2 text-center"
            >
              <p className="text-[10px] uppercase text-slate-500">{label}</p>
              <p className="text-sm font-medium text-white mt-0.5">{value}</p>
            </div>
          ))}
        </div>
      )}

      <div className="flex flex-wrap gap-2 border-b border-surface-600 pb-2">
        {TABS.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setTab(t.id)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              tab === t.id
                ? 'bg-accent text-white'
                : 'text-slate-400 hover:text-white hover:bg-surface-700'
            }`}
          >
            {t.label}
            {t.id === 'issues' && issueCount > 0 && (
              <span className="ml-1.5 text-xs bg-rose-500/80 text-white px-1.5 py-0.5 rounded-full">
                {issueCount}
              </span>
            )}
            {t.id === 'features' && featureCount > 0 && (
              <span className="ml-1.5 text-xs bg-accent/80 text-white px-1.5 py-0.5 rounded-full">
                {findings?.featureIdeas?.length || '!'}
              </span>
            )}
          </button>
        ))}
      </div>

      <div className="min-h-[200px]">
        {tab === 'overview' && (
          <div className="space-y-4">
            <ReportSection title="Resumo do projeto" content={summaryText} />
            <ReportSection title="Stack identificada" content={sections.stack} />
            <ReportSection title="Conclusão" content={sections.conclusion} />
          </div>
        )}

        {tab === 'issues' && (
          <div className="space-y-4">
            <FindingsPanel findings={findings} />
            <ReportSection title="Riscos técnicos (IA)" content={sections.risks} variant="risk" />
          </div>
        )}

        {tab === 'improve' && (
          <div className="space-y-4">
            <FindingsPanel
              findings={
                findings
                  ? {
                      errors: [],
                      warnings: [],
                      improvements: findings.improvements,
                      structure: [],
                    }
                  : null
              }
            />
            <ReportSection title="Melhorias técnicas (IA + scanner)" content={sections.improvements} />
            <ReportSection title="Próximos commits sugeridos" content={sections.nextCommits} />
            <ReportSection title="README" content={sections.readmeSuggestions} />
          </div>
        )}

        {tab === 'features' && (
          <div className="space-y-4">
            <p className="text-sm text-slate-400">
              Ideias para evoluir o produto — novas capacidades além de refatoração.
            </p>
            <FindingsPanel
              findings={
                findings?.featureIdeas?.length
                  ? {
                      errors: [],
                      warnings: [],
                      improvements: findings.featureIdeas,
                      structure: [],
                    }
                  : null
              }
            />
            <ReportSection
              title="Funcionalidades sugeridas pela IA"
              content={sections.featureIdeas}
            />
          </div>
        )}

        {tab === 'structure' && (
          <div className="space-y-4">
            <FindingsPanel
              findings={
                findings
                  ? { errors: [], warnings: [], improvements: [], structure: findings.structure }
                  : null
              }
            />
            <ReportSection title="Arquitetura provável" content={sections.architecture} />
            <ReportSection title="Pontos fortes" content={sections.strengths} variant="success" />
          </div>
        )}

        {tab === 'ai' && (
          <div className="space-y-4">
            {!hasAiContent && (
              <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-100">
                A IA não retornou seções estruturadas. Tente analisar novamente ou use um modelo
                maior (ex.: llama3.1). Os achados automáticos nas outras abas continuam válidos.
              </div>
            )}
            <ReportSection title="Resumo geral" content={sections.summary} />
            <ReportSection title="Stack" content={sections.stack} />
            <ReportSection title="Arquitetura" content={sections.architecture} />
            <ReportSection title="Pontos fortes" content={sections.strengths} variant="success" />
            <ReportSection title="Melhorias" content={sections.improvements} />
            <ReportSection title="Riscos" content={sections.risks} variant="risk" />
            <ReportSection title="Próximos commits" content={sections.nextCommits} />
            <ReportSection title="Nota técnica" content={sections.technicalScore} />
            <ReportSection title="Post para LinkedIn" content={sections.linkedInPost} />
            <ReportSection title="Conclusão" content={sections.conclusion} />
            {raw && (
              <details className="rounded-xl border border-surface-600 bg-surface-900/50 p-4">
                <summary className="text-xs text-slate-500 cursor-pointer">
                  Resposta bruta da IA (debug)
                </summary>
                <pre className="mt-3 text-xs text-slate-400 overflow-x-auto whitespace-pre-wrap max-h-64">
                  {raw.slice(0, 8000)}
                </pre>
              </details>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
