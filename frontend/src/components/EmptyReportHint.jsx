export default function EmptyReportHint() {
  return (
    <div className="rounded-2xl border border-dashed border-surface-600 bg-surface-800/40 p-10 text-center">
      <p className="text-slate-300 font-medium">Nenhum relatório exibido</p>
      <p className="text-sm text-slate-500 mt-2 max-w-md mx-auto">
        Cole a URL de um repositório público e clique em Analisar. O painel mostrará problemas,
        melhorias, estrutura e o relatório da IA.
      </p>
      <p className="text-xs text-slate-600 mt-4 font-mono">
        Ex.: https://github.com/fhecout/Nautilus
      </p>
    </div>
  );
}
