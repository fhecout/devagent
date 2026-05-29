import { toBulletList } from '../utils/formatText';

export default function ReportSection({ title, content, variant = 'default' }) {
  if (!content?.trim()) return null;

  const items = toBulletList(content);
  const border =
    variant === 'risk'
      ? 'border-rose-500/30'
      : variant === 'success'
        ? 'border-emerald-500/30'
        : 'border-surface-600';

  return (
    <section className={`rounded-2xl border ${border} bg-surface-800/60 p-5`}>
      <h3 className="text-sm font-semibold text-white mb-3">{title}</h3>
      {items.length > 1 ? (
        <ul className="space-y-2 text-sm text-slate-300 leading-relaxed">
          {items.map((item, i) => (
            <li key={i} className="flex gap-2">
              <span className="text-accent shrink-0">•</span>
              <span>{item}</span>
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-sm text-slate-300 leading-relaxed whitespace-pre-wrap">{content}</p>
      )}
    </section>
  );
}
