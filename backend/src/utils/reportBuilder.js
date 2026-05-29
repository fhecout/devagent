function buildScannerReport(findings, scanMeta) {
  const lines = (items) =>
    items.length
      ? items.map((i) => `• ${i.title}: ${i.detail}`).join('\n')
      : '• Nenhum item nesta categoria.';

  const brief = scanMeta?.projectBrief;
  const summary =
    brief?.purpose ||
    scanMeta?.projectProfile?.description ||
    [
      scanMeta?.projectHints?.length
        ? `Projeto: ${scanMeta.projectHints.join(', ')}.`
        : 'Projeto de software.',
      `Arquivos: ${scanMeta?.totalFiles || '—'}.`,
      scanMeta?.hasReadme ? 'README presente.' : 'README ausente.',
    ].join(' ');

  const improvements = [
    lines(findings?.improvements || []),
    lines(findings?.featureIdeas || []),
  ]
    .filter(Boolean)
    .join('\n\n');

  const risks = lines(findings?.warnings || []);
  const strengths = [
    scanMeta?.hasGitignore && '• .gitignore configurado corretamente.',
    scanMeta?.hasReadme && '• Documentação inicial com README.',
    scanMeta?.hasTests && '• Estrutura com testes.',
    scanMeta?.frameworks?.length &&
      `• Stack com: ${scanMeta.frameworks.join(', ')}.`,
  ]
    .filter(Boolean)
    .join('\n');

  return {
    summary,
    stack: [
      ...(brief?.stack?.frameworks || []),
      ...(brief?.stack?.databases || []),
      ...(brief?.stack?.ai || []),
      ...(scanMeta?.frameworks || []),
    ]
      .filter((v, i, a) => a.indexOf(v) === i)
      .join(', ') || 'Verifique manifestos e dependências do repositório.',
    architecture: brief?.architecture
      ? [
          brief.architecture.organization,
          brief.architecture.entryPoints?.length
            ? `Entradas: ${brief.architecture.entryPoints.join(', ')}`
            : '',
          brief.architecture.layers?.length
            ? `Camadas: ${brief.architecture.layers.join(', ')}`
            : '',
        ]
          .filter(Boolean)
          .join('\n')
      : findings?.structure?.[0]?.detail ||
        'Revise a aba Estrutura para detalhes da organização de pastas.',
    strengths: strengths || '• Estrutura analisada pelo scanner local.',
    improvements: improvements || '• Veja sugestões de funcionalidades na aba Melhorias.',
    risks: risks || '• Sem alertas automáticos.',
    nextCommits: buildCommitSuggestions(findings, scanMeta),
    readmeSuggestions: scanMeta?.hasReadme
      ? '• Adicionar badges, instalação passo a passo, exemplos de uso e roadmap.'
      : '• Criar README.md com descrição, instalação e exemplos.',
    technicalScore: '(calculada automaticamente — IA não retornou nota válida)',
    linkedInPost: `Compartilhando a evolução do projeto ${scanMeta?.packageJson?.name || 'open source'}: revisão técnica com foco em qualidade, estrutura e próximos passos. #desenvolvimento #opensource`,
    conclusion:
      'Relatório gerado pelo scanner local porque a IA não produziu análise estruturada válida. Reanalise com modelo maior (llama3.1) para insights mais profundos.',
    featureIdeas: (findings?.featureIdeas || [])
      .map((f) => `• ${f.title}: ${f.detail}`)
      .join('\n'),
  };
}

function buildCommitSuggestions(findings, scanMeta) {
  const commits = [];
  if (!scanMeta?.hasReadme) commits.push('• docs: adicionar README com instalação e exemplos');
  findings?.improvements?.forEach((i) => {
    if (i.id === 'no-lint') commits.push('• chore: configurar ESLint e Prettier');
    if (i.id === 'no-test-script') commits.push('• test: adicionar script npm test');
  });
  findings?.featureIdeas?.slice(0, 3).forEach((f) => {
    commits.push(`• feat: ${f.title.toLowerCase()}`);
  });
  if (scanMeta?.todoCount > 0) commits.push('• refactor: resolver TODOs pendentes no código');
  return commits.length
    ? commits.join('\n')
    : '• chore: revisar estrutura de pastas\n• docs: atualizar documentação';
}

module.exports = { buildScannerReport };
