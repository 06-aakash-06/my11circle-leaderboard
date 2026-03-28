export function MultiplierBadge({ value }: { value: number }) {
  if (value <= 1) {
    return null;
  }

  return (
    <span className="inline-flex items-center rounded-full border border-orange-300/30 bg-orange-500/15 px-2 py-0.5 text-xs font-semibold text-orange-300">
      {value}x
    </span>
  );
}
