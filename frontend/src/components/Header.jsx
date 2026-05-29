export default function Header() {
  return (
    <header className="border-b border-surface-600/80 bg-surface-800/60 backdrop-blur-md sticky top-0 z-20">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-accent to-indigo-600 flex items-center justify-center shadow-glow font-bold text-sm">
            DA
          </div>
          <div>
            <h1 className="text-lg sm:text-xl font-semibold tracking-tight text-white">
              DevAgent Lite
            </h1>
            <p className="text-xs text-slate-400 hidden sm:block">
              Análise técnica de repositórios com IA local (Ollama)
            </p>
          </div>
        </div>
        <span className="text-xs font-mono text-slate-500 border border-surface-600 rounded-lg px-2 py-1">
          MVP
        </span>
      </div>
    </header>
  );
}
