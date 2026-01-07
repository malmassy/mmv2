export function looksLikeScientificNotation(input: string): boolean {
  const s = input.replace(/×/g, 'x').toLowerCase();
  return /\be[+-]?\d+\b/.test(s) || /x\s*10\^?\s*[+-]?\d+/.test(s);
}

/**
 * Extract a leading numeric literal from the start of the string.
 * Examples:
 *  - "2.50 g/cm^3" -> "2.50"
 *  - "-0.0032 am^3" -> "-0.0032"
 *  - "6.02e23 mol^-1" -> "6.02e23"
 *  - ".25kg" -> ".25"
 * Returns null if the string doesn't start with a number.
 */
export function extractLeadingNumber(input: string): string | null {
  const s = input.trim();
  const m = s.match(/^[+-]?(?:(?:\d+\.?\d*)|(?:\.\d+))(?:[eE][+-]?\d+)?/);
  return m ? m[0] : null;
}

export function extractTrailingUnit(input: string): string | null {
  const s = input.trim();
  const num = extractLeadingNumber(s);
  if (!num) return null;

  const rest = s.slice(num.length).trim();
  return rest.length ? rest : null;
}

// Normalize unit strings so formatting differences don’t fail answers.
// This is NOT full dimensional analysis; it's string normalization.
export function normalizeUnit(unit: string): string {
  let u = unit.trim();

  // unify multiplication symbols
  u = u.replace(/×/g, '*').replace(/·/g, '*');

  // remove spaces
  u = u.replace(/\s+/g, '');

  // normalize micro
  u = u.replace(/μ/g, 'µ'); // either is fine; pick one

  // normalize unicode superscripts to ^ notation (m³ -> m^3)
  u = u
    .replace(/⁰/g, '^0')
    .replace(/¹/g, '^1')
    .replace(/²/g, '^2')
    .replace(/³/g, '^3')
    .replace(/⁴/g, '^4')
    .replace(/⁵/g, '^5')
    .replace(/⁶/g, '^6')
    .replace(/⁷/g, '^7')
    .replace(/⁸/g, '^8')
    .replace(/⁹/g, '^9')
    .replace(/⁻/g, '^-'); // superscript minus

  // collapse accidental ^^
  u = u.replace(/\^\^+/g, '^');

  // optional: treat "per" as "/" (if kids type it)
  u = u.replace(/\bper\b/gi, '/');

  return u;
}

export function unitsMatch(studentUnit: string | null, expectedUnit: string | null): boolean {
  const su = studentUnit ? normalizeUnit(studentUnit) : '';
  const eu = expectedUnit ? normalizeUnit(expectedUnit) : '';

  // If question expects no unit, accept empty.
  if (!eu) return su === '';

  return su === eu;
}

export function stripTrailingUnit(input: string): string {
  // Backwards compatible wrapper:
  // Previously removed trailing letters only, but fails for units like g/cm^3 or am^3.
  // Now: return just the leading number (if present); otherwise return trimmed input.
  return extractLeadingNumber(input) ?? input.trim();
}

/**
 * Rough-but-useful sig fig counter for typical student numeric answers.
 * Handles:
 *  - decimals, leading zeros, trailing zeros
 *  - scientific notation (e.g., 1.20e3 -> 3 sig figs)
 * Note: Exact sig-fig rules can get subtle; this is a good MVP.
 */
export function countSigFigs(input: string): number | null {
  // Extract leading number and normalize
  let s = extractLeadingNumber(input);
  if (!s) return null;

  s = s
    .replace(/,/g, '')
    .replace(/×/g, 'x')
    .replace(/\s+/g, '')
    .replace(/^[+-]/, '');

  // Scientific notation: use mantissa only (everything in mantissa is significant except leading zeros)
  // Supports: 1.20e3, 1.20x10^3, 1.20x10-3
  const sciE = s.match(/^(\d*\.?\d+)(e[+-]?\d+)$/i);
  const sciX = s.match(/^(\d*\.?\d+)x10\^?([+-]?\d+)$/i);

  const mantissa = sciE?.[1] ?? sciX?.[1] ?? null;
  if (mantissa) {
    const m = mantissa.replace(/^0+/, ''); // drop leading zeros
    const digits = m.replace('.', '');
    return digits.length || 1;
  }

  // Plain number (non-sci)
  // Allow forms like "1010000", "1010000.", "0.01010"
  const plain = s.match(/^\d+(\.\d*)?$|^\.\d+$/);
  if (!plain) return null;

  // If it contains a decimal point:
  if (s.includes('.')) {
    // Decimal: all digits after the first nonzero are significant, including trailing zeros
    // Example: 0.01010 -> "1010" => 4 sig figs
    // Example: 1010000. -> "1010000" => 7 sig figs
    const noDot = s.replace('.', '');

    // remove leading zeros (in the whole number without dot)
    const trimmedLead = noDot.replace(/^0+/, '');
    return trimmedLead.length || 1;
  }

  // Integer with NO decimal point:
  // Trailing zeros are NOT significant.
  // Example: 1010000 -> remove trailing zeros => 101 -> 3 sig figs
  const withoutLeading = s.replace(/^0+/, '');
  const withoutTrailingZeros = withoutLeading.replace(/0+$/, '');
  return withoutTrailingZeros.length || 1;
}
