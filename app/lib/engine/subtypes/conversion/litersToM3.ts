// app/lib/engine/subtypes/conversion/litersToM3.ts
import type { QuestionSubtype, Question, GradeOptions } from '../../types';
import { parseNumberLoose } from '../../utils/number';
import { withinTolerance } from '../../utils/tolerance';
import { parseQuantityLoose } from '../../utils/units';
import { looksLikeScientificNotation, countSigFigs } from '../../utils/answerFormat';
import { makeId } from '../../utils/id';
import { PREFIXES } from '../../utils/prefixes';

function randInt(min: number, max: number) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}
function pick<T>(arr: T[]): T {
  return arr[randInt(0, arr.length - 1)];
}

// Quantize to at most 3 decimals, and use the display string as the source of truth
function quantizeMax3Decimals(x: number) {
  // up to 3 decimals, but avoid trailing junk like "1.230"
  const fixed = x.toFixed(3);
  const trimmed = fixed.replace(/(\.\d*?[1-9])0+$/,'$1').replace(/\.0+$/,'');
  const value = Number(trimmed);
  return { value, display: trimmed };
}

function roundStable(x: number) {
  return Number(x.toPrecision(12));
}
function formatNice(x: number) {
  return Number(x.toPrecision(12)).toString();
}

// Format unit with prefix (e.g., "mL", "kL")
function formatLiterUnit(prefix: string): string {
  return `${prefix}L`;
}

// Format cubic meter unit with prefix (e.g., "cm³", "km³", "m³")
function formatCubicMeterUnit(prefix: string): string {
  return `${prefix}m³`;
}

function normalizeUnitForComparison(raw: string): string {
  return raw.trim().toLowerCase().replace(/\s+/g, '').replace(/³/g, '^3');
}

// Detect liter unit with any prefix (e.g., "mL", "kL", "L")
function detectLiterUnit(raw: string): string | null {
  const s = normalizeUnitForComparison(raw);
  
  // Match pattern: [prefix]L (e.g., "mL", "kL", "L")
  const literPattern = /^([a-zA-Zµ]*?)l$/i;
  const match = s.match(literPattern);
  
  if (match) {
    const prefix = match[1].toLowerCase();
    // Check if it's a valid prefix (empty string means base unit)
    if (prefix === '' || PREFIXES.some(p => p.symbol.toLowerCase() === prefix)) {
      return formatLiterUnit(prefix);
    }
  }
  
  return null;
}

// Detect cubic meter unit with any prefix (e.g., "cm³", "km³", "m³")
function detectCubicMeterUnit(raw: string): string | null {
  const s = normalizeUnitForComparison(raw);
  
  // Match pattern: [prefix]m³ or [prefix]m^3 or [prefix]m3 (e.g., "cm³", "km³", "m³")
  const cubicMeterPattern = /^([a-zA-Zµ]*?)m\^?3$/i;
  const match = s.match(cubicMeterPattern);
  
  if (match) {
    const prefix = match[1].toLowerCase();
    // Check if it's a valid prefix (empty string means base unit)
    // Sort prefixes by length (longer first) to match correctly
    const sortedPrefixes = [...PREFIXES].sort((a, b) => (b.symbol?.length ?? 0) - (a.symbol?.length ?? 0));
    
    if (prefix === '') {
      return formatCubicMeterUnit('');
    }
    
    for (const p of sortedPrefixes) {
      if (p.symbol && prefix === p.symbol.toLowerCase()) {
        return formatCubicMeterUnit(p.symbol);
      }
    }
  }
  
  return null;
}

export const litersToM3: QuestionSubtype = {
  id: 'conversion.litersToM3',
  parentType: 'conversion',
  label: 'Liters ↔ cubic meters',
  conversionType: 'ratio',

  generate: () => {
    const direction = Math.random() < 0.5 ? 'L_TO_M3' : 'M3_TO_L';

    if (direction === 'L_TO_M3') {
      // Randomly pick prefixes for liters and cubic meters
      const literPrefix = pick(PREFIXES);
      const m3Prefix = pick(PREFIXES);
      
      // Ensure they're different
      let toM3Prefix = pick(PREFIXES);
      while (toM3Prefix.symbol === m3Prefix.symbol) {
        toM3Prefix = pick(PREFIXES);
      }
      
      const fromUnit = formatLiterUnit(literPrefix.symbol);
      const toUnit = formatCubicMeterUnit(toM3Prefix.symbol);
      
      // Generate a clean displayed value with <= 3 decimals
      // Adjust range based on prefixes to keep values reasonable
      let raw: number;
      const literExp = literPrefix.exponent;
      const m3Exp = toM3Prefix.exponent;
      // Effective exponent = literExp - (m3Exp * 3) since volume is cubed
      const effectiveExp = literExp - (m3Exp * 3);
      
      if (effectiveExp >= 3) {
        raw = randInt(1, 100) / randInt(1, 10);
      } else if (effectiveExp >= 0) {
        raw = randInt(10, 900) / randInt(1, 7);
      } else {
        raw = randInt(100, 9000) / randInt(1, 10);
      }
      
      const qv = quantizeMax3Decimals(raw);
      const value = qv.value;
      const valueDisplay = qv.display;

      const requiredSigFigs = countSigFigs(valueDisplay) ?? 3;

      // Convert: value in prefix-liter to prefix-cubic meters
      // 1 L = 0.001 m³ (base)
      // So: value_in_L * 1e-3 = value_in_base_m3
      // Then convert to target prefix: value_in_base_m3 / (m3Prefix.factor^3)
      const liters = value * literPrefix.factor;
      const baseM3 = liters * 1e-3;
      const m3PrefixFactorCubed = Math.pow(toM3Prefix.factor, 3);
      const correct_m3 = roundStable(baseM3 / m3PrefixFactorCubed);

      const q: Question = {
        id: `conversion.litersToM3.${makeId('q')}`,
        parentType: 'conversion',
        subtype: 'conversion.litersToM3',
        prompt: `Convert ${valueDisplay} ${fromUnit} to ${toUnit}.`,
        meta: { direction, value, valueDisplay, from: fromUnit, to: toUnit, correct: correct_m3, requiredSigFigs },
        createdAtMs: Date.now(),
      };
      return q;
    } else {
      // m³ → L: Randomly pick prefixes for cubic meters and liters
      const m3Prefix = pick(PREFIXES);
      const literPrefix = pick(PREFIXES);
      
      // Ensure they're different
      let toLiterPrefix = pick(PREFIXES);
      while (toLiterPrefix.symbol === literPrefix.symbol) {
        toLiterPrefix = pick(PREFIXES);
      }
      
      const fromUnit = formatCubicMeterUnit(m3Prefix.symbol);
      const toUnit = formatLiterUnit(toLiterPrefix.symbol);
      
      // Generate a clean displayed value with <= 3 decimals
      let raw: number;
      const m3Exp = m3Prefix.exponent;
      const literExp = toLiterPrefix.exponent;
      const effectiveExp = (m3Exp * 3) - literExp;
      
      if (effectiveExp >= 3) {
        raw = randInt(1, 100) / randInt(1, 10);
      } else if (effectiveExp >= 0) {
        raw = randInt(10, 900) / randInt(1, 7);
      } else {
        raw = randInt(100, 9000) / randInt(1, 10);
      }
      
      const qv = quantizeMax3Decimals(raw);
      const value_m3 = qv.value;
      const valueDisplay = qv.display;

      const requiredSigFigs = countSigFigs(valueDisplay) ?? 3;

      // Convert: prefix-cubic meters to prefix-liters
      // 1 m³ (base) = 1000 L (base)
      // So: value_in_prefix_m3 * (m3Prefix.factor^3) = value_in_base_m3
      // Then: value_in_base_m3 * 1000 = value_in_base_L
      // Then convert to target prefix: value_in_base_L / literPrefix.factor
      const m3PrefixFactorCubed = Math.pow(m3Prefix.factor, 3);
      const baseM3 = value_m3 * m3PrefixFactorCubed;
      const baseLiters = baseM3 * 1000;
      const correct_L = roundStable(baseLiters / toLiterPrefix.factor);

      const q: Question = {
        id: `conversion.litersToM3.${makeId('q')}`,
        parentType: 'conversion',
        subtype: 'conversion.litersToM3',
        prompt: `Convert ${valueDisplay} ${fromUnit} to ${toUnit}.`,
        meta: { direction, value_m3, valueDisplay, from: fromUnit, to: toUnit, correct: correct_L, requiredSigFigs },
        createdAtMs: Date.now(),
      };
      return q;
    }
  },

  grade: (q, submittedAnswer, opts: GradeOptions = {}) => {
    if (opts.requireScientificNotation && !looksLikeScientificNotation(submittedAnswer)) {
      return {
        isCorrect: false,
        score: 0,
        feedback: 'Please answer in scientific notation (e.g., 1.2e-3 or 1.2 × 10^-3).',
      };
    }

    if (opts.enforceSigFigs) {
      const required = q.meta.requiredSigFigs as number | undefined;
      if (required) {
        const got = countSigFigs(submittedAnswer);
        if (got === null) {
          return {
            isCorrect: false,
            score: 0,
            feedback:
              'Sig figs are being enforced, but I could not determine the sig figs in your answer. Try 2.17e-1 or 2.17 × 10^-1.',
          };
        }
        if (got !== required) {
          return {
            isCorrect: false,
            score: 0,
            feedback: `Sig figs: expected ${required}, but your answer has ${got}.`,
          };
        }
      }
    }

    const n = parseNumberLoose(submittedAnswer);
    const correct = q.meta.correct as number;

    if (n === null) {
      return {
        isCorrect: false,
        score: 0,
        feedback: 'I could not parse your answer as a number.',
        correctAnswerDisplay: formatNice(correct),
      };
    }

    // Unit support:
    // - If they include m3/m^3/m³ with any prefix, accept for cubic meter answers
    // - If they include L with any prefix (mL, kL, etc.), accept for liter answers
    const direction = q.meta.direction as string;
    const targetUnit = (q.meta.to as string) || (direction === 'L_TO_M3' ? 'm³' : 'L');

    if (opts.enforceUnits) {
      // Strict unit enforcement
      const unitMatch = submittedAnswer.match(/[a-zA-Z/³²^0-9]+$/);
      
      if (direction === 'L_TO_M3') {
        // Expected cubic meters with specific prefix
        const detected = unitMatch ? detectCubicMeterUnit(unitMatch[0]) : null;
        
        if (!detected) {
          // Check if they provided a liter unit instead
          const detectedLiter = unitMatch ? detectLiterUnit(unitMatch[0]) : null;
          if (detectedLiter) {
            return {
              isCorrect: false,
              score: 0,
              feedback: `Units look off. This question asks for ${targetUnit}.`,
              correctAnswerDisplay: `${formatNice(correct)} ${targetUnit}`,
            };
          }
          return {
            isCorrect: false,
            score: 0,
            feedback: `Units are required. This question asks for ${targetUnit}.`,
            correctAnswerDisplay: `${formatNice(correct)} ${targetUnit}`,
          };
        }
        
        // Normalize for comparison
        const normalizedDetected = normalizeUnitForComparison(detected);
        const normalizedTarget = normalizeUnitForComparison(targetUnit);
        
        if (normalizedDetected !== normalizedTarget) {
          return {
            isCorrect: false,
            score: 0,
            feedback: `Units look off. This question asks for ${targetUnit}.`,
            correctAnswerDisplay: `${formatNice(correct)} ${targetUnit}`,
          };
        }
      } else {
        // Expected liters with specific prefix
        const detected = unitMatch ? detectLiterUnit(unitMatch[0]) : null;
        
        if (!detected) {
          // Check if they provided a cubic meter unit instead
          const detectedM3 = unitMatch ? detectCubicMeterUnit(unitMatch[0]) : null;
          if (detectedM3) {
            return {
              isCorrect: false,
              score: 0,
              feedback: `Units look off. This question asks for ${targetUnit}.`,
              correctAnswerDisplay: `${formatNice(correct)} ${targetUnit}`,
            };
          }
          return {
            isCorrect: false,
            score: 0,
            feedback: `Units are required. This question asks for ${targetUnit}.`,
            correctAnswerDisplay: `${formatNice(correct)} ${targetUnit}`,
          };
        }
        
        // Normalize for comparison
        const normalizedDetected = normalizeUnitForComparison(detected);
        const normalizedTarget = normalizeUnitForComparison(targetUnit);
        
        if (normalizedDetected !== normalizedTarget) {
          return {
            isCorrect: false,
            score: 0,
            feedback: `Units look off. This question asks for ${targetUnit}.`,
            correctAnswerDisplay: `${formatNice(correct)} ${targetUnit}`,
          };
        }
      }
    } else {
      // Soft unit check (only if units are provided)
      const unitMatch = submittedAnswer.match(/[a-zA-Z/³²^0-9]+$/);
      if (unitMatch) {
        if (direction === 'L_TO_M3') {
          // Expected cubic meters
          const detected = detectCubicMeterUnit(unitMatch[0]);
          if (!detected) {
            const detectedLiter = detectLiterUnit(unitMatch[0]);
            if (detectedLiter) {
              return {
                isCorrect: false,
                score: 0,
                feedback: `Units look off. This question asks for ${targetUnit}.`,
                correctAnswerDisplay: `${formatNice(correct)} ${targetUnit}`,
              };
            }
          } else {
            // Normalize for comparison
            const normalizedDetected = normalizeUnitForComparison(detected);
            const normalizedTarget = normalizeUnitForComparison(targetUnit);
            
            if (normalizedDetected !== normalizedTarget) {
              return {
                isCorrect: false,
                score: 0,
                feedback: `Units look off. This question asks for ${targetUnit}.`,
                correctAnswerDisplay: `${formatNice(correct)} ${targetUnit}`,
              };
            }
          }
        } else {
          // Expected liters
          const detected = detectLiterUnit(unitMatch[0]);
          if (!detected) {
            const detectedM3 = detectCubicMeterUnit(unitMatch[0]);
            if (detectedM3) {
              return {
                isCorrect: false,
                score: 0,
                feedback: `Units look off. This question asks for ${targetUnit}.`,
                correctAnswerDisplay: `${formatNice(correct)} ${targetUnit}`,
              };
            }
          } else {
            // Normalize for comparison
            const normalizedDetected = normalizeUnitForComparison(detected);
            const normalizedTarget = normalizeUnitForComparison(targetUnit);
            
            if (normalizedDetected !== normalizedTarget) {
              return {
                isCorrect: false,
                score: 0,
                feedback: `Units look off. This question asks for ${targetUnit}.`,
                correctAnswerDisplay: `${formatNice(correct)} ${targetUnit}`,
              };
            }
          }
        }
      }
    }

    const ok = withinTolerance(n, correct, { rel: 1e-9, abs: 1e-10 });
    return {
      isCorrect: ok,
      score: ok ? 1 : 0,
      feedback: ok ? 'Correct!' : `Not quite. Correct value is ${formatNice(correct)} ${targetUnit}.`,
      correctAnswerDisplay: `${formatNice(correct)} ${targetUnit}`,
    };
  },
};
