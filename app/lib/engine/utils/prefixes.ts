// Shared metric prefix definitions for use across conversion subtypes

export type PrefixDef = { 
  symbol: string; 
  factor: number;
  exponent: number; // log10 of factor for convenience
};

export const PREFIXES: PrefixDef[] = [
  { symbol: 'Q', factor: 1e30, exponent: 30 },
  { symbol: 'R', factor: 1e27, exponent: 27 },
  { symbol: 'Y', factor: 1e24, exponent: 24 },
  { symbol: 'Z', factor: 1e21, exponent: 21 },
  { symbol: 'E', factor: 1e18, exponent: 18 },
  { symbol: 'P', factor: 1e15, exponent: 15 },
  { symbol: 'T', factor: 1e12, exponent: 12 },
  { symbol: 'G', factor: 1e9, exponent: 9 },
  { symbol: 'M', factor: 1e6, exponent: 6 },
  { symbol: 'k', factor: 1e3, exponent: 3 },
  { symbol: 'h', factor: 1e2, exponent: 2 },
  { symbol: 'da', factor: 1e1, exponent: 1 },
  { symbol: '', factor: 1e0, exponent: 0 },
  { symbol: 'd', factor: 1e-1, exponent: -1 },
  { symbol: 'c', factor: 1e-2, exponent: -2 },
  { symbol: 'm', factor: 1e-3, exponent: -3 },
  { symbol: 'µ', factor: 1e-6, exponent: -6 },
  { symbol: 'u', factor: 1e-6, exponent: -6 },
  { symbol: 'n', factor: 1e-9, exponent: -9 },
  { symbol: 'p', factor: 1e-12, exponent: -12 },
  { symbol: 'f', factor: 1e-15, exponent: -15 },
  { symbol: 'a', factor: 1e-18, exponent: -18 },
  { symbol: 'z', factor: 1e-21, exponent: -21 },
  { symbol: 'y', factor: 1e-24, exponent: -24 },
  { symbol: 'r', factor: 1e-27, exponent: -27 },
  { symbol: 'q', factor: 1e-30, exponent: -30 },
];

// Map from symbol to prefix definition for quick lookup
export const PREFIX_BY_SYMBOL: Record<string, PrefixDef> = Object.fromEntries(
  PREFIXES.map(p => [p.symbol.toLowerCase(), p])
);

// Map from symbol to exponent (for backwards compatibility)
export const PREFIX_EXPONENTS: Record<string, number> = Object.fromEntries(
  PREFIXES.map(p => [p.symbol, p.exponent])
);

// Base units that prefixes can be applied to
export const BASE_UNITS = ['m', 'g', 'L'] as const;
export type BaseUnit = typeof BASE_UNITS[number];
