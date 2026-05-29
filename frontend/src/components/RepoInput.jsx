export default function RepoInput({ value, onChange, onSubmit, loading, disabled }) {
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        onSubmit();
      }}
      className="rounded-2xl border border-surface-600 bg-surface-800/80 p-5 sm:p-6 shadow-card"
    >
      <label htmlFor="repo-url" className="block text-sm font-medium text-slate-300 mb-2">
        URL do repositório GitHub
      </label>
      <input
        id="repo-url"
        type="url"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="https://github.com/usuario/repositorio"
        disabled={loading || disabled}
        className="w-full rounded-xl border border-surface-600 bg-surface-900 px-4 py-3 text-sm text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-accent/60 focus:border-accent disabled:opacity-50 font-mono"
        autoComplete="off"
        spellCheck={false}
      />
      <button
        type="submit"
        disabled={loading || disabled || !value.trim()}
        className="mt-4 w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-xl bg-accent hover:bg-accent-glow text-white font-medium px-6 py-3 text-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {loading ? (
          <>
            <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            Analisando...
          </>
        ) : (
          'Analisar repositório'
        )}
      </button>
    </form>
  );
}
