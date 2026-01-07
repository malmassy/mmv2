import { stripTrailingUnit } from './answerFormat';

export function countDecimalPlaces(input: string): number | null {
  let s = stripTrailingUnit(input).trim();
  if (!s) return null;

  s = s
    .replace(/,/g, '')
    .replace(/×/g, 'x')
    .replace(/\s+/g, '')
    .replace(/^[+-]/, '');

  // scientific notation: count decimals in mantissa
  const sciE = s.match(/^(\d*\.?\d+)(e[+-]?\d+)$/i);
  const sciX = s.match(/^(\d*\.?\d+)x10\^?([+-]?\d+)$/i);
  const mantissa = sciE?.[1] ?? sciX?.[1] ?? null;

  const target = mantissa ?? s;

  const dot = target.indexOf('.');
  if (dot === -1) return 0;
  return target.length - dot - 1;
}

export function roundToDecimalPlaces(x: number, dp: number): number {
  return Number(x.toFixed(dp));
}

/**
 * Round a number to the specified number of decimal places using "round to even" (banker's rounding).
 * When the next digit is exactly 5, rounds to the nearest even digit.
 * 
 * Examples:
 * - roundToDecimalPlacesEven(372.15, 1) -> 372.2 (last digit 1 is odd, round up)
 * - roundToDecimalPlacesEven(372.25, 1) -> 372.2 (last digit 2 is even, round down)
 * - roundToDecimalPlacesEven(372.35, 1) -> 372.4 (last digit 3 is odd, round up)
 * - roundToDecimalPlacesEven(372.45, 1) -> 372.4 (last digit 4 is even, round down)
 */
export function roundToDecimalPlacesEven(x: number, dp: number): number {
  if (dp < 0) return x;
  if (!Number.isFinite(x)) return x;
  
  const sign = x < 0 ? -1 : 1;
  const absX = Math.abs(x);
  
  // Scale the number so the decimal point is at the end
  const factor = Math.pow(10, dp);
  const scaled = absX * factor;
  
  // Extract integer and fractional parts
  const integerPart = Math.floor(scaled);
  const fractionalPart = scaled - integerPart;
  
  // Check if we're exactly at .5 (within floating point precision)
  const isExactlyHalf = Math.abs(fractionalPart - 0.5) < 1e-10;
  
  let rounded: number;
  if (isExactlyHalf) {
    // Round to even: check the last digit of integerPart
    const lastDigit = integerPart % 10;
    if (lastDigit % 2 === 0) {
      // Even: round down (keep as is)
      rounded = integerPart;
    } else {
      // Odd: round up
      rounded = integerPart + 1;
    }
  } else {
    // Standard rounding
    rounded = Math.round(scaled);
  }
  
  // Scale back and apply sign
  return sign * rounded / factor;
}

/**
 * Round a number to the specified number of significant figures using "round to even" (banker's rounding).
 * When the next digit is exactly 5, rounds to the nearest even digit.
 * 
 * Examples:
 * - roundToSigFigsEven(1.25, 2) -> 1.2 (rounds to even: 2 is even)
 * - roundToSigFigsEven(1.35, 2) -> 1.4 (rounds to even: 4 is even)
 * - roundToSigFigsEven(1.15, 2) -> 1.2 (rounds to even: 2 is even)
 * - roundToSigFigsEven(1.05, 2) -> 1.0 (rounds to even: 0 is even)
 */
export function roundToSigFigsEven(x: number, sig: number): number {
  if (x === 0) return 0;
  if (sig < 1) return x;
  if (!Number.isFinite(x)) return x;
  
  const sign = x < 0 ? -1 : 1;
  const absX = Math.abs(x);
  
  // Find the order of magnitude
  // Handle edge case where absX is very small
  if (absX < 1e-10) {
    // For very small numbers, use a different approach
    const magnitude = Math.floor(Math.log10(absX));
    const shift = magnitude - (sig - 1);
    const factor = Math.pow(10, shift);
    const shifted = absX * Math.pow(10, -shift);
    const rounded = Math.round(shifted);
    return sign * rounded * factor;
  }
  
  const magnitude = Math.floor(Math.log10(absX));
  
  // Calculate the factor to shift the number so the first sig fig is in the ones place
  const shift = magnitude - (sig - 1);
  const factor = Math.pow(10, shift);
  
  // Shift the number
  const shifted = absX * Math.pow(10, -shift);
  
  // Extract the integer part (what we want to keep)
  const keepPart = Math.floor(shifted);
  
  // Check if we're exactly at .5 (within floating point precision)
  // We need to check if the fractional part is very close to 0.5
  const fractionalPart = shifted - keepPart;
  const isExactlyHalf = Math.abs(fractionalPart - 0.5) < 1e-10;
  
  let rounded: number;
  if (isExactlyHalf) {
    // Round to even: check the last digit of keepPart
    const lastDigit = keepPart % 10;
    if (lastDigit % 2 === 0) {
      // Even: round down (keep as is)
      rounded = keepPart;
    } else {
      // Odd: round up
      rounded = keepPart + 1;
    }
  } else {
    // Standard rounding
    rounded = Math.round(shifted);
  }
  
  // Shift back and apply sign
  const result = sign * rounded * factor;
  return result;
}
