export function PlaceholderPanel({ title, description }: { title: string; description: string }) {
  return (
    <section className="relative overflow-hidden rounded-3xl border border-white/10 bg-zinc-900/75 p-6 shadow-[0_16px_40px_rgba(2,6,23,0.45)]">
      <div className="pointer-events-none absolute -right-16 -top-16 h-40 w-40 rounded-full bg-cyan-400/10 blur-3xl" />
      <h2 className="text-xl font-semibold text-white" style={{ fontFamily: "var(--font-display)" }}>{title}</h2>
      <p className="mt-2 max-w-2xl text-sm text-zinc-300">{description}</p>
      <p className="mt-4 text-xs uppercase tracking-[0.18em] text-zinc-500">Data module waiting for input</p>
    </section>
  );
}
