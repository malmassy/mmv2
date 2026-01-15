export type ParsedQuantity = {
  value: number;          // numeric value in "as-entered" units
  unitRaw: string | null; // raw parsed unit, e.g. "kg"
  valueInBase: number;    // converted to base unit: m, g, L, N
  baseUnit: 'm' | 'g' | 'L' | 'N' | null;
};

// metric prefix factors
const PREFIX: Record<string, number> = {
  Y: 1e24, Z: 1e21, E: 1e18, P: 1e15, T: 1e12, 
  G: 1e9, M: 1e6, k: 1e3, h: 1e2, da: 1e1,
  '': 1,
  d: 1e-1, c: 1e-2, m: 1e-3, µ: 1e-6, n: 1e-9, 
  p: 1e-12, f: 1e-15, a: 1e-18, z: 1e-21, y: 1e-24,
};

const BASE_UNITS = new Set(['m', 'g', 'L', 'N']);

/**
 * Parses unit strings like: "km", "m", "cm", "kg", "mg", "kL", "mL", "kN", "mN".
 * Returns conversion to base units: m, g, L, N.
 */
export function parseMetricUnit(unit: string): { baseUnit: 'm' | 'g' | 'L' | 'N'; factorToBase: number } | null {
  const u = unit.trim();

  // handle "da" prefix (two chars) first
  if (u.length >= 3 && u.startsWith('da')) {
    const base = u.slice(2);
    if (BASE_UNITS.has(base)) {
      return { baseUnit: base as any, factorToBase: PREFIX['da'] };
    }
  }

  // 1-char prefix + base unit
  const base = u.slice(-1);
  if (!BASE_UNITS.has(base)) return null;

  const prefix = u.slice(0, -1); // could be '' or 1-char
  if (!(prefix in PREFIX)) return null;

  return { baseUnit: base as any, factorToBase: PREFIX[prefix] };
}

/**
 * Parse inputs like:
 *   "3.2 kg"
 *   "3.2kg"
 *   "1.2e3 m"
 *   "2.2 x 10^-10 mg"
 *   "5.2 kg/m^3"
 *   "5.2 kg/m³"
 * Returns base conversion if unit is recognized.
 */
export function parseQuantityLoose(raw: string, numericValue: number): ParsedQuantity {
  const s = raw.trim();

  // First, try to match "x 10^" scientific notation format and strip it
  // This handles cases like "2.2 x 10^-10 mg" where we need to remove "x 10^-10" before extracting unit
  const sciNotationMatch = s.match(/^([+-]?(?:\d+\.?\d*|\.\d+))\s*x\s*10\^?\s*([+-]?\d+)\s*(.*)$/i);
  if (sciNotationMatch) {
    // We have "x 10^" format - the unit is everything after the scientific notation
    const unitPart = (sciNotationMatch[3] || '').trim();
    
    if (!unitPart) {
      return { value: numericValue, unitRaw: null, valueInBase: numericValue, baseUnit: null };
    }

    // Clean up the unit part
    const unitRaw = unitPart.replace(/\s+/g, ' ').trim();

    // Try to parse as simple metric unit first
    const unitInfo = parseMetricUnit(unitRaw);
    if (unitInfo) {
      return {
        value: numericValue,
        unitRaw,
        valueInBase: numericValue * unitInfo.factorToBase,
        baseUnit: unitInfo.baseUnit,
      };
    }

    // If not a simple unit, return the raw unit string for compound unit parsing
    return { value: numericValue, unitRaw, valueInBase: numericValue, baseUnit: null };
  }

  // Extract the numeric part (supports standard e/E scientific notation)
  const numMatch = s.match(/^([+-]?(?:\d+\.?\d*|\.\d+)(?:[eE][+-]?\d+)?)\s*(.*)$/);
  if (!numMatch) {
    // No number found, try to extract unit anyway
    const unitMatch = s.match(/^([a-zA-Zµ\/\^²³⁰¹⁴⁵⁶⁷⁸⁹⁻0-9\s]+)$/);
    const unitRaw = unitMatch ? unitMatch[1].trim() : null;
    return { value: numericValue, unitRaw, valueInBase: numericValue, baseUnit: null };
  }

  const unitPart = (numMatch[2] || '').trim();
  
  if (!unitPart) {
    return { value: numericValue, unitRaw: null, valueInBase: numericValue, baseUnit: null };
  }

  // Clean up the unit part - remove extra spaces but preserve structure
  const unitRaw = unitPart.replace(/\s+/g, ' ').trim();

  // Try to parse as simple metric unit first (e.g., "kg", "m", "cm²")
  const unitInfo = parseMetricUnit(unitRaw);
  if (unitInfo) {
    return {
      value: numericValue,
      unitRaw,
      valueInBase: numericValue * unitInfo.factorToBase,
      baseUnit: unitInfo.baseUnit,
    };
  }

  // If not a simple unit, return the raw unit string for compound unit parsing
  // (e.g., "kg/m^3", "kg/m³", "m/s", etc.)
  // This allows other functions to handle compound units
  return { value: numericValue, unitRaw, valueInBase: numericValue, baseUnit: null };
}
