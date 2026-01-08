export function parseNumberLoose(input: string): number | null {
  const s = input.trim().toLowerCase();
  if (!s) return null;

  const normalized = s
    .replace(/×/g, 'x')
    .replace(/,/g, '')
    .replace(/\s+/g, ' ')
    .replace(/^\+/, '');

  // Handle "a x 10^b" (with optional trailing text)
  // Match up to whitespace, end of string, or a non-digit character after the exponent
  // Don't use \b word boundary because it can be unreliable with negative numbers
  const sciMatch = normalized.match(
    /^([+-]?\d*\.?\d+)\s*x\s*10\^?\s*([+-]?\d+)(?=\s|[^\d]|$)/
  );
  if (sciMatch) {
    const a = Number(sciMatch[1]);
    const b = Number(sciMatch[2]);
    if (!Number.isFinite(a) || !Number.isFinite(b)) return null;
    return a * Math.pow(10, b);
  }

  // Handle "1.23e4" (Number() supports it even with trailing text removed by match)
  const leadingNumber = normalized.match(/^([+-]?\d*\.?\d+(?:e[+-]?\d+)?)/);
  if (!leadingNumber) return null;

  const n = Number(leadingNumber[1]);
  return Number.isFinite(n) ? n : null;
}
