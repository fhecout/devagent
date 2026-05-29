export default function LoadingState({ message }) {
  return (
    <div className="rounded-2xl border border-accent/30 bg-surface-800/90 p-8 text-center shadow-glow">
      <div className="mx-auto w-12 h-12 border-2 border-accent/30 border-t-accent rounded-full animate-spin mb-4" />
      <p className="text-slate-200 font-medium">{message}</p>
      <p className="text-sm text-slate-500 mt-2">
        Isso pode levar alguns minutos dependendo do tamanho do repositório e do modelo.
      </p>
    </div>
  );
}
