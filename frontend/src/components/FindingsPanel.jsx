const SEVERITY_STYLES = {
  error: 'border-rose-500/40 bg-rose-500/10 text-rose-100',
  warning: 'border-amber-500/40 bg-amber-500/10 text-amber-100',
  info: 'border-sky-500/40 bg-sky-500/10 text-sky-100',
};

const BADGE = {
  error: 'ERRO',
  warning: 'ALERTA',
  info: 'INFO',
};

function FindingItem({ item }) {
  const style = SEVERITY_STYLES[item.severity] || SEVERITY_STYLES.info;
  return (
    <li className={`rounded-xl border px-4 py-3 ${style}`}>
      <div className="flex items-start gap-2">
        <span className="text-[10px] font-bold uppercase tracking-wider opacity-80 shrink-0 mt-0.5">
          {BADGE[item.severity] || 'INFO'}
        </span>
        <div className="min-w-0">
          <p className="font-medium text-sm text-white">{item.title}</p>
          <p className="text-xs mt-1 opacity-90 leading-relaxed">{item.detail}</p>
        </div>
      </div>
    </li>
  );
}

export default function FindingsPanel({ findings }) {
  if (!findings) return null;

  const { errors = [], warnings = [], improvements = [], structure = [] } = findings;
  const total = errors.length + warnings.length + improvements.length + structure.length;

  if (total === 0) {
    return (
      <p className="text-sm text-slate-500 py-4">
        Nenhum achado automático — a análise da IA preenche o relatório abaixo.
      </p>
    );
  }

  return (
    <div className="space-y-6">
      {errors.length > 0 && (
        <section>
          <h3 className="text-xs font-semibold uppercase tracking-wider text-rose-400 mb-3">
            Problemas críticos ({errors.length})
          </h3>
          <ul className="space-y-2">
            {errors.map((e) => (
              <FindingItem key={e.id} item={e} />
            ))}
          </ul>
        </section>
      )}

      {warnings.length > 0 && (
        <section>
          <h3 className="text-xs font-semibold uppercase tracking-wider text-amber-400 mb-3">
            Alertas ({warnings.length})
          </h3>
          <ul className="space-y-2">
            {warnings.map((w) => (
              <FindingItem key={w.id} item={w} />
            ))}
          </ul>
        </section>
      )}

      {improvements.length > 0 && (
        <section>
          <h3 className="text-xs font-semibold uppercase tracking-wider text-sky-400 mb-3">
            Melhorias rápidas ({improvements.length})
          </h3>
          <ul className="space-y-2">
            {improvements.map((m) => (
              <FindingItem key={m.id} item={m} />
            ))}
          </ul>
        </section>
      )}

      {structure.length > 0 && (
        <section>
          <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-3">
            Estrutura do projeto
          </h3>
          <ul className="space-y-2">
            {structure.map((s) => (
              <FindingItem key={s.id} item={s} />
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
