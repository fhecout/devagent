export default function ReportCard({ title, content, highlight, icon }) {
  if (!content?.trim()) return null;

  return (
    <article
      className={`rounded-2xl border p-5 shadow-card ${
        highlight
          ? 'border-accent/40 bg-gradient-to-br from-surface-800 to-surface-700/80'
          : 'border-surface-600 bg-surface-800/70'
      }`}
    >
      <div className="flex items-start gap-2 mb-3">
        {icon && <span className="text-lg" aria-hidden>{icon}</span>}
        <h3 className="text-sm font-semibold text-white uppercase tracking-wide">
          {title}
        </h3>
      </div>
      <div className="prose-report">{content}</div>
    </article>
  );
}
