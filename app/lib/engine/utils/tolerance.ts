export function withinTolerance(
  submitted: number,
  correct: number,
  opts: { abs?: number; rel?: number } = {}
): boolean {
  const abs = opts.abs ?? 0;
  const rel = opts.rel ?? 0;

  const absOk = Math.abs(submitted - correct) <= abs;
  const relOk = Math.abs(submitted - correct) <= Math.abs(correct) * rel;

  return absOk || relOk;
}
